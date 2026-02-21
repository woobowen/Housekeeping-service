'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { serializeCustomData } from '@/lib/utils/json-tunnel';
import { revalidatePath } from 'next/cache';
import { deserializeCustomData } from '@/lib/utils/json-tunnel';
import { sanitizeData } from '@/lib/utils/serialization';
import { differenceInDays, startOfDay, endOfDay, format } from 'date-fns';

// -----------------------------------------------------------------------------
// 1. Types & Schemas
// -----------------------------------------------------------------------------
const phoneRegex = /^1[3-9]\d{9}$/;

/**
 * Localized Create Order Schema
 */
const createOrderSchema = z.object({
  caregiverId: z.string({ required_error: "请选择家政员" }).min(1, "请选择家政员"),
  caregiverPhone: z.string().regex(phoneRegex, '请输入有效的11位家政员手机号'),
  clientName: z.string().min(1, '请输入客户姓名'),
  clientPhone: z.string().regex(phoneRegex, '请输入有效的11位客户手机号'),
  
  // Salary fields
  dailySalary: z.coerce.number().min(0).optional().nullable(),
  monthlySalary: z.coerce.number().min(0).optional().nullable(),
  durationDays: z.coerce.number().min(0).optional().nullable(),

  // Date validation refinement to prevent "Invalid input: expected date, received undefined"
  startDate: z.coerce.date({ 
    required_error: "请选择开始日期", 
    invalid_type_error: "开始日期格式无效" 
  }).refine(val => !!val, { message: "请选择开始日期" }),
  
  endDate: z.coerce.date({ 
    required_error: "请选择结束日期", 
    invalid_type_error: "结束日期格式无效" 
  }).refine(val => !!val, { message: "请选择结束日期" }),

  serviceDate: z.coerce.date({ 
    invalid_type_error: "服务日期格式错误" 
  }).optional().nullable(),

  status: z.string({ required_error: "请选择订单状态" }).min(1, "请选择订单状态").default("PENDING"),
  totalAmount: z.coerce.number({ 
    required_error: "请输入订单金额", 
    invalid_type_error: "订单金额必须是数字" 
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
    errorMap: () => ({ message: '调整类型必须是: 加班、请假 或 替班' }) 
  }),
  value: z.number({ invalid_type_error: '天数必须是数字' }).describe('变动天数，如 +0.5, -1'),
  substituteId: z.string().optional().describe('接替人员的工号/ID'),
  remarks: z.string().optional(),
});

type Adjustment = z.infer<typeof adjustmentSchema> & {
  calculatedAmount?: number;
  substituteName?: string;
};

const DIRECT_ORDER_KEYS = [
  'caregiverId', 'startDate', 'endDate', 'clientLocation', 
  'serviceType', 'address', 'contactName', 'contactPhone', 
  'remarks', 'dispatcherName', 'dispatcherPhone', 'managementFee'
];

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

// -----------------------------------------------------------------------------
// 3. Actions
// -----------------------------------------------------------------------------

/**
 * Adds an adjustment to an existing order and triggers recalculation.
 */
export async function addOrderAdjustment(orderId: string, data: any) {
  try {
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
    let calculatedAmount = dailyRate * validatedAdj.value;
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
    const currentCustomData = deserializeCustomData(order.customData) || {};
    const adjustments: Adjustment[] = currentCustomData.adjustments || [];
    
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

  } catch (error: any) {
    console.error('Add Adjustment Error:', error);
    return { success: false, message: error.message || '调整失败' };
  }
}

async function checkCaregiverAvailability(caregiverId: string, startDate: Date, endDate: Date, excludeOrderId?: string) {
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = endOfDay(endDate);
  
  const conflict = await prisma.order.findFirst({
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

export async function createOrder(formData: any) {
  try {
    const rawData = formData instanceof FormData 
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
    let caregiverId = rawData.caregiverId;
    if (caregiverId && !caregiverId.startsWith('cl') && caregiverId.length <= 20) {
       const cg = await prisma.caregiver.findFirst({
         where: { OR: [{ name: caregiverId }, { workerId: caregiverId }, { phone: caregiverId }] }
       });
       if (cg) caregiverId = cg.idString;
    }
    
    if (caregiverId) {
      await checkCaregiverAvailability(caregiverId, validatedFields.startDate, validatedFields.endDate);
    }

    let caregiver = null;
    const inputCaregiverId = rawData.caregiverId;

    // -----------------------------------------------------------------------------
    // CAREGIVER LOOKUP LOGIC
    // -----------------------------------------------------------------------------
    
    if (inputCaregiverId && (inputCaregiverId.startsWith('cl') || inputCaregiverId.length > 20)) {
      caregiver = await prisma.caregiver.findUnique({
        where: { idString: inputCaregiverId },
      });
      if (!caregiver) {
        return { success: false, error: 'CAREGIVER_NOT_FOUND', message: '指定的家政员不存在' };
      }
    } else if (inputCaregiverId) {
      caregiver = await prisma.caregiver.findFirst({
        where: {
          OR: [
            { name: inputCaregiverId },
            { workerId: inputCaregiverId },
            { phone: inputCaregiverId },
            { phone: validatedFields.caregiverPhone }
          ]
        }
      });
      
      if (!caregiver) {
        return { success: false, error: 'CAREGIVER_NOT_FOUND', message: '指定的家政员不存在' };
      }
    } else {
      return { success: false, error: 'CAREGIVER_NOT_FOUND', message: '请选择或输入家政员' };
    }

    // Salary Configuration Resolution
    const mSalary = validatedFields.monthlySalary || (caregiver.monthlySalary ? Number(caregiver.monthlySalary) : null);
    const dSalary = validatedFields.dailySalary || null;

    if (!mSalary && !dSalary) {
      return { success: false, error: 'MISSING_SALARY_CONFIG', message: `请为家政员 ${caregiver.name} 设置月薪或日薪标准。` };
    }

    // Initial Calculation (No adjustments yet)
    const { totalAmount, dailyRate, baseDays } = await calculateOrderTotal(
      mSalary,
      dSalary,
      validatedFields.startDate,
      validatedFields.endDate,
      validatedFields.managementFee,
      []
    );

    const { customDataString } = serializeCustomData(rawData, DIRECT_ORDER_KEYS);

    const newOrder = await prisma.$transaction(async (tx) => {
      const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Update Caregiver Status to BUSY
      await tx.caregiver.update({
        where: { idString: caregiver!.idString },
        data: { status: 'BUSY' }
      });

      return await tx.order.create({
        data: {
          orderNo,
          caregiverId: caregiver!.idString,
          startDate: startOfDay(validatedFields.startDate),
          endDate: endOfDay(validatedFields.endDate),
          status: validatedFields.status || 'PENDING',
          
          // Persistence of logic fields
          salaryMode: 'DAILY',
          dailySalary: new Prisma.Decimal(dailyRate),
          monthlySalary: mSalary ? new Prisma.Decimal(mSalary) : null,
          durationDays: validatedFields.durationDays || baseDays,

          totalAmount: new Prisma.Decimal(validatedFields.totalAmount || totalAmount),
          amount: new Prisma.Decimal((validatedFields.totalAmount || totalAmount) - validatedFields.managementFee), // amount is just caregiver part
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
    });

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    return { success: true, data: sanitizeData(newOrder) };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
       return { success: false, error: 'VALIDATION_ERROR', errors: error.flatten().fieldErrors };
    }
    return { success: false, error: 'SERVER_ERROR', message: '创建订单失败: ' + (error.message || '未知错误') };
  }
}

export async function updateOrder(id: string, data: any) {
  try {
    console.log("Updating order:", id, data);

    // Pre-process data to ensure contact fields are present if derived from client fields
    const dataToValidate = {
      ...data,
      contactName: data.contactName || data.clientName,
      contactPhone: data.contactPhone || data.clientPhone,
      address: data.address || data.clientLocation || '待补充',
    };

    const validatedFields = createOrderSchema.parse(dataToValidate);

    // 1. Availability Check (excluding current order)
    const order = await prisma.order.findUnique({ 
      where: { id }, 
      select: { caregiverId: true, customData: true } 
    });
    
    if (order) {
      await checkCaregiverAvailability(order.caregiverId, validatedFields.startDate, validatedFields.endDate, id);
    }

    const { totalAmount, dailyRate, baseDays } = await calculateOrderTotal(
      validatedFields.monthlySalary || null,
      validatedFields.dailySalary || null,
      validatedFields.startDate,
      validatedFields.endDate,
      validatedFields.managementFee,
      []
    );

    const { customDataString } = serializeCustomData(data, DIRECT_ORDER_KEYS);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        startDate: startOfDay(validatedFields.startDate),
        endDate: endOfDay(validatedFields.endDate),
        status: validatedFields.status,
        salaryMode: 'DAILY',
        dailySalary: new Prisma.Decimal(dailyRate),
        monthlySalary: validatedFields.monthlySalary ? new Prisma.Decimal(validatedFields.monthlySalary) : null,
        durationDays: validatedFields.durationDays || baseDays,
        totalAmount: new Prisma.Decimal(validatedFields.totalAmount || totalAmount),
        amount: new Prisma.Decimal((validatedFields.totalAmount || totalAmount) - validatedFields.managementFee),
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
        customData: customDataString || (order?.customData),
      },
    });

    console.log("Update Success for ID:", id);
    revalidatePath('/orders');
    revalidatePath(`/orders/${id}`);
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    
    return { success: true, data: sanitizeData(updatedOrder) };
  } catch (error: any) {
    console.error('Update Order Error:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: 'VALIDATION_ERROR', errors: error.flatten().fieldErrors };
    }
    return { success: false, error: 'SERVER_ERROR', message: '更新订单失败: ' + (error.message || '未知错误') };
  }
}

export async function settleOrder(orderId: string, actualDays: number, totalAmount: number, targetMonth?: string) {
  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { caregiverId: true, endDate: true, customData: true }
      });

      if (!order) throw new Error('ORDER_NOT_FOUND');

      const month = targetMonth || format(new Date(), 'yyyy-MM');
      const monthEnd = endOfDay(endOfMonth(parseISO(`${month}-01`)));
      
      // Detection: Is it a partial settlement?
      // It's partial if the order's end date is AFTER the end of the settlement month.
      const isPartial = isAfter(order.endDate, monthEnd);

      // Update Custom Data to track this settlement instance
      const currentCustomData = deserializeCustomData(order.customData) || {};
      const settlements = currentCustomData.settlementHistory || [];
      
      settlements.push({
        month,
        actualDays,
        totalAmount,
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
             increment: actualDays
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
        await tx.caregiver.update({
          where: { idString: order.caregiverId },
          data: { status: 'IDLE' }
        });
      }

      return updated;
    });

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    return { success: true, data: sanitizeData(updatedOrder) };
  } catch (error: any) {
    console.error('Settle Order Error:', error);
    return { success: false, message: '结单失败: ' + (error.message || '未知错误') };
  }
}

// Add necessary imports at the top if missing
import { endOfMonth, isAfter, parseISO } from 'date-fns';

/**
 * Completes an order and releases the caregiver.
 */
export async function completeOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { caregiverId: true }
    });

    if (!order) return { success: false, message: '订单不存在' };

    await prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' }
      });

      // 2. Release Caregiver
      await tx.caregiver.update({
        where: { idString: order.caregiverId },
        data: { status: 'IDLE' }
      });
    });

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    return { success: true, message: '订单已完成，家政员已释放' };
  } catch (error: any) {
    console.error('Complete Order Error:', error);
    return { success: false, message: '操作失败: ' + error.message };
  }
}

export async function deleteOrder(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { caregiverId: true, status: true }
    });

    if (!order) throw new Error('ORDER_NOT_FOUND');

    await prisma.$transaction(async (tx) => {
      // 1. If the order was active (SERVING/CONFIRMED), release the caregiver
      if (['CONFIRMED', 'PENDING'].includes(order.status)) {
        await tx.caregiver.update({
          where: { idString: order.caregiverId },
          data: { status: 'IDLE' }
        });
      }

      // 2. Delete the order
      await tx.order.delete({
        where: { id }
      });
    });

    revalidatePath('/orders');
    revalidatePath('/caregivers');
    revalidatePath('/salary-settlement');
    return { success: true, message: '订单删除成功' };
  } catch (error: any) {
    console.error('Delete Order Error:', error);
    return { success: false, message: '删除失败: ' + (error.message || '未知错误') };
  }
}

export async function getOrders(query: string = '', searchType: string = 'all') {
  try {
    let whereClause: any = {};

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
