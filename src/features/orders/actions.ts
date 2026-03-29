'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeCustomData } from '@/lib/utils/json-tunnel';
import { revalidatePath } from 'next/cache';
import { deserializeCustomData } from '@/lib/utils/json-tunnel';
import { sanitizeData } from '@/lib/utils/serialization';
import { differenceInDays, startOfDay, endOfDay, format } from 'date-fns';
import { requireAdminSession } from '@/lib/auth/session';
import { endOfMonth, isAfter, parseISO } from 'date-fns';
import { randomUUID } from 'crypto';

// -----------------------------------------------------------------------------
// 1. Types & Schemas
// -----------------------------------------------------------------------------
const phoneRegex = /^1[3-9]\d{9}$/;

/**
 * Localized Create Order Schema
 */
const createOrderSchema = z.object({
  caregiverId: z.string({ message: "请选择家政员" }).min(1, "请选择家政员"),
  caregiverPhone: z.string().regex(phoneRegex, '请输入有效的11位家政员手机号'),
  clientName: z.string().min(1, '请输入客户姓名'),
  clientPhone: z.string().regex(phoneRegex, '请输入有效的11位客户手机号'),
  
  // Salary fields
  dailySalary: z.coerce.number().min(0).optional().nullable(),
  monthlySalary: z.coerce.number().min(0).optional().nullable(),
  durationDays: z.coerce.number().min(0).optional().nullable(),

  // Date validation refinement to prevent "Invalid input: expected date, received undefined"
  startDate: z.coerce.date({ 
    message: "请选择开始日期"
  }).refine(val => !!val, { message: "请选择开始日期" }),
  
  endDate: z.coerce.date({ 
    message: "请选择结束日期"
  }).refine(val => !!val, { message: "请选择结束日期" }),

  serviceDate: z.coerce.date().optional().nullable(),

  status: z.string({ message: "请选择订单状态" }).min(1, "请选择订单状态").default("PENDING"),
  totalAmount: z.coerce.number({ 
    message: "请输入订单金额"
  }).min(0, "订单金额不能为负数"),
  
  clientLocation: z.string().min(1, '请输入客户区域'),
  serviceType: z.string().min(1, '请选择服务类型').default('一般家政'),
  address: z.string().min(1, '请输入服务地址'),
  dispatcherName: z.string().min(1, '请输入派单员姓名'),
  dispatcherPhone: z.string().regex(phoneRegex, '请输入有效的11位派单员手机号'),
  managementFee: z.coerce.number().min(0, '管理费不能为负'),
  contactName: z.string().min(1, '请输入联系人姓名'),
  contactPhone: z.string().regex(phoneRegex, '请输入有效的11位联系人手机号'),
  remarks: z.string().optional(),
});

/**
 * Adjustment Schema for "Flexible Salary" engine
 */
const adjustmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式 must be YYYY-MM-DD (例如: 2024-01-01)'),
  type: z.enum(['OVERTIME', 'LEAVE', 'SUBSTITUTE'], { 
    message: '调整类型必须是: 加班、请假 或 替班' 
  }),
  value: z.number().describe('变动天数，如 +0.5, -1'),
  substituteId: z.string().optional().describe('接替人员的工号/ID'),
  remarks: z.string().optional(),
});

type Adjustment = z.infer<typeof adjustmentSchema> & {
  calculatedAmount?: number;
  substituteName?: string;
};

type OrderSettlementHistoryItem = {
  month: string;
  actualDays: number;
  totalAmount: number;
  type: 'FULL' | 'PARTIAL';
  createdAt: string;
};

type OrderCustomData = {
  adjustments?: Adjustment[];
  settlementHistory?: OrderSettlementHistoryItem[];
} & Record<string, unknown>;

type OrderInputValue = FormDataEntryValue | string | number | Date | null | undefined;
type OrderInput = Record<string, OrderInputValue>;

const DIRECT_ORDER_KEYS = [
  'caregiverId', 'startDate', 'endDate', 'clientLocation', 
  'serviceType', 'address', 'contactName', 'contactPhone', 
  'remarks', 'dispatcherName', 'dispatcherPhone', 'managementFee'
];

const ACTIVE_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SERVING'] as const;
const ORDER_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 20_000,
} as const;

const settleOrderSchema = z.object({
  orderId: z.string().min(1, '订单 ID 不能为空'),
  actualDays: z.number().min(0, '实际工作天数不能为负数'),
  totalAmount: z.number().min(0, '结算金额不能为负数'),
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function upsertSettlementHistory(
  history: OrderSettlementHistoryItem[],
  nextItem: OrderSettlementHistoryItem,
): OrderSettlementHistoryItem[] {
  const filteredHistory: OrderSettlementHistoryItem[] = history.filter(
    (item: OrderSettlementHistoryItem) => item.month !== nextItem.month,
  );

  return [...filteredHistory, nextItem];
}

// -----------------------------------------------------------------------------
// 2. Core Engine: Salary & Adjustment
// -----------------------------------------------------------------------------

/**
 * Recalculates the total amount for an order based on base days and adjustments.
 * Supports Priority: Daily Salary > (Monthly Salary / 26)
 */
async function calculateOrderTotal(
  monthlySalary: number | null,
  dailySalary: number | null,
  startDate: Date,
  endDate: Date,
  managementFee: number,
  adjustments: Adjustment[] = []
) {
  const baseDays = differenceInDays(endDate, startDate) + 1;
  const adjustmentSum = adjustments.reduce((sum, adj) => sum + adj.value, 0);
  const effectiveDays = baseDays + adjustmentSum;
  
  // Logic: Priority Daily Salary. If not provided, use Monthly / 26.
  const dailyRate = dailySalary || (monthlySalary ? monthlySalary / 26 : 0);
  const totalAmount = (dailyRate * effectiveDays) + managementFee;
  
  return {
    totalAmount,
    dailyRate,
    baseDays,
    adjustmentSum
  };
}

async function recomputeCaregiverStatus(
  tx: Prisma.TransactionClient,
  caregiverId: string
): Promise<void> {
  const activeOrderCount: number = await tx.order.count({
    where: {
      caregiverId,
      status: {
        in: [...ACTIVE_ORDER_STATUSES],
      },
    },
  });

  await tx.caregiver.update({
    where: { idString: caregiverId },
    data: {
      status: activeOrderCount > 0 ? 'BUSY' : 'IDLE',
    },
  });
}

async function acquireCaregiverScheduleLocks(
  tx: Prisma.TransactionClient,
  caregiverIds: string[],
): Promise<void> {
  const normalizedIds: string[] = [...new Set(caregiverIds)].sort();

  // 中文说明：同一护理员的排班写入必须串行化，避免两个并发请求在“先检查后写入”的时间窗内同时通过。
  for (const caregiverId of normalizedIds) {
    // 中文说明：事务级 advisory lock 只需要执行成功，不需要读取返回值；
    // 这里必须使用 executeRaw，避免 Prisma 反序列化 PostgreSQL `void` 返回类型时抛错。
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${caregiverId}))`;
  }
}

async function resolveCaregiverByInput(
  caregiverIdOrKeyword: string,
  caregiverPhone?: string
) {
  const trimmedCaregiverInput: string = caregiverIdOrKeyword.trim();
  if (!trimmedCaregiverInput) {
    return null;
  }

  if (trimmedCaregiverInput.startsWith('cl') || trimmedCaregiverInput.length > 20) {
    return prisma.caregiver.findUnique({
      where: { idString: trimmedCaregiverInput },
    });
  }

  return prisma.caregiver.findFirst({
    where: {
      OR: [
        { name: trimmedCaregiverInput },
        { workerId: trimmedCaregiverInput },
        { phone: trimmedCaregiverInput },
        caregiverPhone ? { phone: caregiverPhone } : undefined,
      ].filter(Boolean) as Prisma.CaregiverWhereInput[],
    },
  });
}

// -----------------------------------------------------------------------------
// 3. Actions
// -----------------------------------------------------------------------------

/**
 * Adds an adjustment to an existing order and triggers recalculation.
 */
export async function addOrderAdjustment(orderId: string, data: unknown) {
  try {
    await requireAdminSession();
    const validatedAdj = adjustmentSchema.parse(data);
    
    // 1. Fetch Order and primary Caregiver
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { caregiver: true }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');
    const monthlySalary = order.monthlySalary ? Number(order.monthlySalary) : (order.caregiver.monthlySalary ? Number(order.caregiver.monthlySalary) : 0);
    const dailySalary = order.dailySalary ? Number(order.dailySalary) : null;
    const managementFee = Number(order.managementFee);

    // 2. Calculate daily rate for adjustment
    const { dailyRate } = await calculateOrderTotal(monthlySalary, dailySalary, order.startDate, order.endDate, managementFee, []);
    const calculatedAmount = dailyRate * validatedAdj.value;
    let substituteName = '';

    if (validatedAdj.substituteId) {
       const subWorker = await prisma.caregiver.findFirst({
         where: { OR: [{ workerId: validatedAdj.substituteId }, { idString: validatedAdj.substituteId }] }
       });
       if (subWorker) {
         substituteName = subWorker.name;
       }
    }

    // 3. Update Order customData
    const currentCustomData = deserializeCustomData<OrderCustomData>(order.customData);
    const adjustments: Adjustment[] = currentCustomData.adjustments ?? [];
    
    const newAdj: Adjustment = {
      ...validatedAdj,
      calculatedAmount,
      substituteName
    };
    
    adjustments.push(newAdj);

    // 4. Recalculate Order Total
    const { totalAmount } = await calculateOrderTotal(
      monthlySalary,
      dailySalary,
      order.startDate,
      order.endDate,
      managementFee,
      adjustments
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: new Prisma.Decimal(totalAmount),
        customData: JSON.stringify({
          ...currentCustomData,
          adjustments
        })
      }
    });

    revalidatePath('/orders');
    return { success: true, data: sanitizeData(updatedOrder) };

  } catch (error: unknown) {
    console.error('Add Adjustment Error:', error);
    return { success: false, message: error instanceof Error ? error.message : '调整失败' };
  }
}

async function checkCaregiverAvailability(
  tx: Prisma.TransactionClient,
  caregiverId: string,
  startDate: Date,
  endDate: Date,
  excludeOrderId?: string,
) {
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = endOfDay(endDate);
  
  const conflict = await tx.order.findFirst({
    where: {
      caregiverId,
      status: { not: 'CANCELLED' }, // Even COMPLETED orders imply that time was occupied
      id: excludeOrderId ? { not: excludeOrderId } : undefined,
      AND: [
        { startDate: { lte: normalizedEnd } },
        { endDate: { gte: normalizedStart } }
      ]
    },
    include: { caregiver: { select: { name: true } } }
  });

  if (conflict) {
    const startStr = format(conflict.startDate, 'yyyy-MM-dd');
    const endStr = format(conflict.endDate, 'yyyy-MM-dd');
    throw new Error(`派单失败：该家政员在 ${startStr} 至 ${endStr} 期间已有安排 (订单号: ...${conflict.orderNo.slice(-4)})`);
  }
}

export async function createOrder(formData: FormData | OrderInput) {
  try {
    await requireAdminSession();
    const rawData: OrderInput = formData instanceof FormData
      ? Object.fromEntries(formData.entries()) 
      : formData;

    // Fill missing fields with defaults or placeholders if not provided by the UI yet
    const dataToValidate = {
      ...rawData,
      serviceType: rawData.serviceType || '一般家政',
      address: rawData.address || rawData.clientLocation || '待补充',
      contactName: rawData.contactName || rawData.clientName || '待补充',
      contactPhone: rawData.contactPhone || rawData.clientPhone || '待补充',
    };

    const validatedFields = createOrderSchema.parse(dataToValidate);

    // 1. Availability Check
    const caregiver = rawData.caregiverId
      ? await resolveCaregiverByInput(String(rawData.caregiverId), validatedFields.caregiverPhone)
      : null;

    if (!caregiver) {
      return { success: false, error: 'CAREGIVER_NOT_FOUND', message: '请选择或输入家政员' };
    }

    const { customDataString } = serializeCustomData(rawData, DIRECT_ORDER_KEYS);

    const newOrder = await prisma.$transaction(async (tx) => {
      await acquireCaregiverScheduleLocks(tx, [caregiver.idString]);
      await checkCaregiverAvailability(tx, caregiver.idString, validatedFields.startDate, validatedFields.endDate);

      // 中文说明：冲突校验与薪资解析必须放进同一事务，确保锁住后的读写视图一致。
      const caregiverSnapshot = await tx.caregiver.findUnique({
        where: { idString: caregiver.idString },
        select: { idString: true, name: true, monthlySalary: true },
      });

      if (!caregiverSnapshot) {
        throw new Error('CAREGIVER_NOT_FOUND');
      }

      const mSalary = validatedFields.monthlySalary || (caregiverSnapshot.monthlySalary ? Number(caregiverSnapshot.monthlySalary) : null);
      const dSalary = validatedFields.dailySalary || null;

      if (!mSalary && !dSalary) {
        throw new Error(`请为家政员 ${caregiverSnapshot.name} 设置月薪或日薪标准。`);
      }

      const { totalAmount, dailyRate, baseDays } = await calculateOrderTotal(
        mSalary,
        dSalary,
        validatedFields.startDate,
        validatedFields.endDate,
        validatedFields.managementFee,
        []
      );

      const orderNo = `ORD-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
      
      const createdOrder = await tx.order.create({
        data: {
          orderNo,
          caregiverId: caregiverSnapshot.idString,
          startDate: startOfDay(validatedFields.startDate),
          endDate: endOfDay(validatedFields.endDate),
          status: validatedFields.status || 'PENDING',
          
          // Persistence of logic fields
          salaryMode: 'DAILY',
          dailySalary: new Prisma.Decimal(dailyRate),
          monthlySalary: mSalary ? new Prisma.Decimal(mSalary) : null,
          durationDays: validatedFields.durationDays || baseDays,

          // 中文说明：订单金额必须以服务端计算结果为准，禁止信任前端回传总额。
          totalAmount: new Prisma.Decimal(totalAmount),
          amount: new Prisma.Decimal(totalAmount - validatedFields.managementFee),
          managementFee: new Prisma.Decimal(validatedFields.managementFee),
          clientName: validatedFields.clientName,
          dispatcherName: validatedFields.dispatcherName,
          dispatcherPhone: validatedFields.dispatcherPhone,
          clientLocation: validatedFields.clientLocation,
          serviceType: validatedFields.serviceType,
          address: validatedFields.address,
          contactName: validatedFields.contactName,
          contactPhone: validatedFields.contactPhone,
          remarks: validatedFields.remarks,
          customData: customDataString,
        },
      });

      await recomputeCaregiverStatus(tx, caregiverSnapshot.idString);
      return createdOrder;
    }, ORDER_TRANSACTION_OPTIONS);

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    return { success: true, data: sanitizeData(newOrder) };

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
       return { success: false, error: 'VALIDATION_ERROR', errors: error.flatten().fieldErrors };
    }
    return {
      success: false,
      error: 'SERVER_ERROR',
      message: `创建订单失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

export async function updateOrder(id: string, data: OrderInput) {
  try {
    await requireAdminSession();

    // Pre-process data to ensure contact fields are present if derived from client fields
    const dataToValidate = {
      ...data,
      contactName: data.contactName || data.clientName,
      contactPhone: data.contactPhone || data.clientPhone,
      address: data.address || data.clientLocation || '待补充',
    };

    const validatedFields = createOrderSchema.parse(dataToValidate);

    const order = await prisma.order.findUnique({ 
      where: { id }, 
      select: { caregiverId: true, customData: true, status: true } 
    });

    if (!order) {
      return { success: false, error: 'ORDER_NOT_FOUND', message: '订单不存在' };
    }

    const targetCaregiver = await resolveCaregiverByInput(String(data.caregiverId || order.caregiverId), validatedFields.caregiverPhone);
    if (!targetCaregiver) {
      return { success: false, error: 'CAREGIVER_NOT_FOUND', message: '指定的家政员不存在' };
    }

    const currentCustomData = deserializeCustomData<OrderCustomData>(order.customData);
    const adjustments: Adjustment[] = Array.isArray(currentCustomData.adjustments)
      ? currentCustomData.adjustments
      : [];

    const { customDataString } = serializeCustomData(data, DIRECT_ORDER_KEYS);

    const updatedOrder = await prisma.$transaction(async (tx) => {
      await acquireCaregiverScheduleLocks(tx, [targetCaregiver.idString, order.caregiverId]);
      await checkCaregiverAvailability(tx, targetCaregiver.idString, validatedFields.startDate, validatedFields.endDate, id);

      const targetCaregiverSnapshot = await tx.caregiver.findUnique({
        where: { idString: targetCaregiver.idString },
        select: { idString: true, monthlySalary: true },
      });

      if (!targetCaregiverSnapshot) {
        throw new Error('CAREGIVER_NOT_FOUND');
      }

      const { totalAmount, dailyRate, baseDays } = await calculateOrderTotal(
        validatedFields.monthlySalary || (targetCaregiverSnapshot.monthlySalary ? Number(targetCaregiverSnapshot.monthlySalary) : null),
        validatedFields.dailySalary || null,
        validatedFields.startDate,
        validatedFields.endDate,
        validatedFields.managementFee,
        adjustments
      );

      const nextCustomData = customDataString
        ? JSON.stringify({
            ...deserializeCustomData<Record<string, unknown>>(customDataString),
            adjustments,
            settlementHistory: currentCustomData.settlementHistory ?? [],
          })
        : JSON.stringify({
            ...currentCustomData,
            adjustments,
          });

      const updated = await tx.order.update({
        where: { id },
        data: {
          caregiverId: targetCaregiverSnapshot.idString,
          startDate: startOfDay(validatedFields.startDate),
          endDate: endOfDay(validatedFields.endDate),
          status: validatedFields.status,
          salaryMode: 'DAILY',
          dailySalary: new Prisma.Decimal(dailyRate),
          monthlySalary: validatedFields.monthlySalary ? new Prisma.Decimal(validatedFields.monthlySalary) : null,
          durationDays: validatedFields.durationDays || baseDays,
          totalAmount: new Prisma.Decimal(totalAmount),
          amount: new Prisma.Decimal(totalAmount - validatedFields.managementFee),
          managementFee: new Prisma.Decimal(validatedFields.managementFee),
          clientName: validatedFields.clientName,
          dispatcherName: validatedFields.dispatcherName,
          dispatcherPhone: validatedFields.dispatcherPhone,
          clientLocation: validatedFields.clientLocation,
          serviceType: validatedFields.serviceType,
          address: validatedFields.address,
          contactName: validatedFields.contactName,
          contactPhone: validatedFields.contactPhone,
          remarks: validatedFields.remarks,
          customData: nextCustomData,
        },
      });

      await recomputeCaregiverStatus(tx, targetCaregiverSnapshot.idString);
      if (targetCaregiverSnapshot.idString !== order.caregiverId) {
        await recomputeCaregiverStatus(tx, order.caregiverId);
      }

      return updated;
    }, ORDER_TRANSACTION_OPTIONS);

    revalidatePath('/orders');
    revalidatePath(`/orders/${id}`);
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    
    return { success: true, data: sanitizeData(updatedOrder) };
  } catch (error: unknown) {
    console.error('Update Order Error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'VALIDATION_ERROR', errors: error.flatten().fieldErrors };
    }
    return {
      success: false,
      error: 'SERVER_ERROR',
      message: `更新订单失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

export async function settleOrder(orderId: string, actualDays: number, totalAmount: number, targetMonth?: string) {
  try {
    await requireAdminSession();
    const parsedInput = settleOrderSchema.parse({ orderId, actualDays, totalAmount, targetMonth });
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: parsedInput.orderId },
        select: { caregiverId: true, endDate: true, customData: true }
      });

      if (!order) throw new Error('ORDER_NOT_FOUND');
      await acquireCaregiverScheduleLocks(tx, [order.caregiverId]);

      const month = parsedInput.targetMonth || format(new Date(), 'yyyy-MM');
      const monthEnd = endOfDay(endOfMonth(parseISO(`${month}-01`)));
      
      // Detection: Is it a partial settlement?
      // It's partial if the order's end date is AFTER the end of the settlement month.
      const isPartial = isAfter(order.endDate, monthEnd);

      // Update Custom Data to track this settlement instance
      const currentCustomData = deserializeCustomData<OrderCustomData>(order.customData);
      const settlements = upsertSettlementHistory(currentCustomData.settlementHistory ?? [], {
        month,
        actualDays: parsedInput.actualDays,
        totalAmount: parsedInput.totalAmount,
        type: isPartial ? 'PARTIAL' : 'FULL',
        createdAt: new Date().toISOString()
      });

      // 1. Update Order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          // Only complete the order if it's NOT a partial settlement
          status: isPartial ? 'CONFIRMED' : 'COMPLETED', 
          paymentStatus: 'PAID', // Mark as paid for this billing action
          actualWorkedDays: {
             increment: parsedInput.actualDays
          },
          // For partial, we might want to store total paid so far or just update the main field
          // Here we follow the rule: only mark as COMPLETED if fully contained/finished.
          customData: JSON.stringify({
            ...currentCustomData,
            settlementHistory: settlements
          })
        }
      });

      // 2. Release Caregiver ONLY if it's a FULL settlement
      if (!isPartial) {
        await recomputeCaregiverStatus(tx, order.caregiverId);
      }

      return updated;
    }, ORDER_TRANSACTION_OPTIONS);

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    return { success: true, data: sanitizeData(updatedOrder) };
  } catch (error: unknown) {
    console.error('Settle Order Error:', error);
    return { success: false, message: `结单失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

// Add necessary imports at the top if missing
/**
 * Completes an order and releases the caregiver.
 */
export async function completeOrder(orderId: string) {
  try {
    await requireAdminSession();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { caregiverId: true }
    });

    if (!order) return { success: false, message: '订单不存在' };

    await prisma.$transaction(async (tx) => {
      await acquireCaregiverScheduleLocks(tx, [order.caregiverId]);

      // 1. Update Order Status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' }
      });

      // 2. Release Caregiver
      await recomputeCaregiverStatus(tx, order.caregiverId);
    }, ORDER_TRANSACTION_OPTIONS);

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    return { success: true, message: '订单已完成，家政员已释放' };
  } catch (error: unknown) {
    console.error('Complete Order Error:', error);
    return { success: false, message: `操作失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function deleteOrder(id: string) {
  try {
    await requireAdminSession();
    const order = await prisma.order.findUnique({
      where: { id },
      select: { caregiverId: true, status: true }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');

    await prisma.$transaction(async (tx) => {
      await acquireCaregiverScheduleLocks(tx, [order.caregiverId]);

      // 1. If the order was active (SERVING/CONFIRMED), release the caregiver
      await tx.order.delete({
        where: { id }
      });

      await recomputeCaregiverStatus(tx, order.caregiverId);
    }, ORDER_TRANSACTION_OPTIONS);

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    return { success: true, message: '订单删除成功' };
  } catch (error: unknown) {
    console.error('Delete Order Error:', error);
    return { success: false, message: `删除失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function getOrders(query: string = '', searchType: string = 'all') {
  try {
    await requireAdminSession();
    let whereClause: Prisma.OrderWhereInput = {};

    if (query) {
      if (searchType === 'caregiver') {
        whereClause = { caregiver: { name: { contains: query } } };
      } else if (searchType === 'client') {
        whereClause = { clientName: { contains: query } };
      } else if (searchType === 'dispatcher') {
        whereClause = { dispatcherName: { contains: query } };
      } else if (searchType === 'date') {
        const dateValue = query.trim();
        if (dateValue) {
          const parsedDate = new Date(dateValue);
          if (!isNaN(parsedDate.getTime())) {
            const targetDate = startOfDay(parsedDate);
            whereClause = {
              AND: [
                { startDate: { lte: endOfDay(targetDate) } },
                { endDate: { gte: startOfDay(targetDate) } }
              ]
            };
          }
        }
      } else {
        whereClause = {
          OR: [
            { orderNo: { contains: query } },
            { clientName: { contains: query } },
            { dispatcherName: { contains: query } },
            { caregiver: { name: { contains: query } } }
          ]
        };
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: { caregiver: { select: { name: true, workerId: true, idString: true } } },
    });
    const processedOrders = orders.map(order => ({
      ...order,
      customData: deserializeCustomData(order.customData),
    }));
    return sanitizeData(processedOrders);
  } catch (error) {
    console.error('Get Orders Error:', error);
    return [];
  }
}
