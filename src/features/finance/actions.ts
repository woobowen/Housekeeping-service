'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { 
  startOfMonth, 
  endOfMonth, 
  differenceInDays, 
  max, 
  min, 
  parseISO, 
  isAfter,
  isValid
} from 'date-fns';
import { sanitizeData } from '@/lib/utils/serialization';
import type { SettlementDetail, SettlementItem } from './schema';

import { deserializeCustomData } from '@/lib/utils/json-tunnel';
import { requireAdminSession } from '@/lib/auth/session';

type OrderSettlementHistoryItem = {
  month: string;
  actualDays: number;
  totalAmount: number;
  type: 'FULL' | 'PARTIAL';
  source?: string;
  createdAt: string;
};

type OrderCustomData = {
  settlementHistory?: OrderSettlementHistoryItem[];
};

function upsertSettlementHistory(
  history: OrderSettlementHistoryItem[],
  nextItem: OrderSettlementHistoryItem,
): OrderSettlementHistoryItem[] {
  const filteredHistory: OrderSettlementHistoryItem[] = history.filter(
    (item: OrderSettlementHistoryItem) => item.month !== nextItem.month,
  );

  return [...filteredHistory, nextItem];
}

type SettlementOrder = Prisma.OrderGetPayload<{
  include: {
    caregiver: true;
  };
}>;

type SettlementCaregiver = SettlementOrder['caregiver'];

/**
 * Core Calculation Engine
 * Calculates the settlement details for a caregiver in a specific month without saving to DB.
 */
async function calculateSettlementForCaregiver(
  caregiver: SettlementCaregiver,
  monthStr: string,
  orders: SettlementOrder[]
): Promise<SettlementDetail> {
  const monthDate = parseISO(`${monthStr}-01`);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const items: SettlementItem[] = [];
  let totalAmount = 0;
  let totalDays = 0;
  let allOrdersSettled = true;

  for (const order of orders) {
    // 1. Calculate Intersection
    const calcStart = max([order.startDate, monthStart]);
    const calcEnd = min([order.endDate, monthEnd]);
    
    // Check if effective range is valid
    if (isAfter(calcStart, calcEnd)) continue;

    const days = differenceInDays(calcEnd, calcStart) + 1;
    if (days <= 0) continue;

    // 2. Determine Rate
    let dailyRate = 0;
    let baseSalary = 0;
    let salaryMode: 'DAILY' | 'MONTHLY' = 'DAILY';

    if (order.dailySalary && Number(order.dailySalary) > 0) {
      dailyRate = Number(order.dailySalary);
      baseSalary = dailyRate;
      salaryMode = 'DAILY';
    } else if (order.monthlySalary && Number(order.monthlySalary) > 0) {
      baseSalary = Number(order.monthlySalary);
      dailyRate = baseSalary / 26;
      salaryMode = 'MONTHLY';
    } else if (caregiver.monthlySalary && Number(caregiver.monthlySalary) > 0) {
      baseSalary = Number(caregiver.monthlySalary);
      dailyRate = baseSalary / 26;
      salaryMode = 'MONTHLY';
    }

    const settlementType = isAfter(order.endDate, monthEnd) ? 'PARTIAL' : 'FULL';

    // 3. Check Order Level Settlement Status
    const orderCustomData = deserializeCustomData<OrderCustomData>(order.customData);
    const history = orderCustomData.settlementHistory ?? [];
    const monthlySettlement = history.find((item) => item.month === monthStr);
    const isOrderSettled = !!monthlySettlement;
    
    // Use actualDays from order settlement if available, otherwise fallback to calculated days
    const effectiveDays = monthlySettlement ? Number(monthlySettlement.actualDays) : days;
    const finalAmount = Number((dailyRate * effectiveDays).toFixed(2));

    if (!isOrderSettled) {
      allOrdersSettled = false;
    }

    items.push({
      orderId: order.id,
      orderNo: order.orderNo,
      clientName: order.clientName || '未记录',
      startDate: order.startDate.toISOString(),
      endDate: order.endDate.toISOString(),
      calcStartDate: calcStart.toISOString(),
      calcEndDate: calcEnd.toISOString(),
      daysInMonth: days,
      actualDays: isOrderSettled ? Number(monthlySettlement.actualDays) : undefined,
      salaryMode,
      baseSalary,
      dailyRate: Number(dailyRate.toFixed(2)),
      amount: finalAmount,
      settlementType,
      isOrderSettled
    });

    totalAmount += finalAmount;
    totalDays += effectiveDays;
  }

  return {
    caregiverId: caregiver.idString,
    caregiverName: caregiver.name,
    workerId: caregiver.workerId,
    month: monthStr,
    totalDays,
    totalAmount: Number(totalAmount.toFixed(2)),
    orderCount: items.length,
    allOrdersSettled,
    items,
    status: 'PENDING'
  };
}

export async function getSettlementCandidates(monthStr: string) {
  try {
    await requireAdminSession();
    const monthDate = parseISO(`${monthStr}-01`);
    if (!isValid(monthDate)) return { success: false, message: '无效的月份格式', data: [] };

    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    // 1. Fetch relevant orders
    // We want orders that OVERLAP with the target month.
    // Logic: OrderStart <= MonthEnd AND OrderEnd >= MonthStart
    const orders = await db.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'COMPLETED', 'SERVING', 'PENDING'] }, // Include Serving/Pending to catch active orders
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      include: {
        caregiver: true
      }
    });

    // 2. Fetch existing settlements
    const existingSettlements = await db.salarySettlement.findMany({
      where: { month: monthStr }
    });
    const settlementMap = new Map(existingSettlements.map(s => [s.caregiverId, s]));

    // 3. Group Orders by Caregiver
    const ordersByCaregiver = new Map<string, SettlementOrder[]>();
    const caregiverInfo = new Map<string, SettlementCaregiver>();

    for (const order of orders) {
      if (!ordersByCaregiver.has(order.caregiverId)) {
        ordersByCaregiver.set(order.caregiverId, []);
        caregiverInfo.set(order.caregiverId, order.caregiver);
      }
      ordersByCaregiver.get(order.caregiverId)?.push(order);
    }

    // 4. Calculate for each caregiver
    const results: SettlementDetail[] = [];

    for (const [cgId, cgOrders] of ordersByCaregiver) {
      const caregiver = caregiverInfo.get(cgId);
      if (!caregiver) {
        continue;
      }
      
      // Check if already settled
      const existing = settlementMap.get(cgId);
      
      // If a settlement already exists for this month, we skip adding it to the CANDIDATES list
      // to prevent "Double Settlement" as per user requirement.
      // These will be visible in the "History" tab instead.
      if (existing) continue;

      const calculated = await calculateSettlementForCaregiver(caregiver, monthStr, cgOrders);
      
      // If no valid days (e.g. strict overlap check failed inside calc), skip
      if (calculated.totalDays <= 0) continue;

      results.push(calculated);
    }

    // Also include caregivers who HAVE a settlement but NO active orders (edge case, maybe orders deleted/moved)
    // For now, we trust the order query covers most.

    return { success: true, data: sanitizeData(results) };

  } catch (error) {
    console.error('Failed to get candidates:', error);
    return { success: false, message: '获取数据失败', data: [] };
  }
}

export async function getSettlementHistory(monthStr: string) {
    // Re-use logic or just simple fetch
    try {
        await requireAdminSession();
        const history = await db.salarySettlement.findMany({
            where: { month: monthStr },
            include: { caregiver: { select: { name: true, workerId: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: sanitizeData(history) };
    } catch {
        return { success: false, data: [] };
    }
}

export async function createOrUpdateSettlement(data: SettlementDetail) {
  try {
    await requireAdminSession();
    const result = await db.$transaction(async (tx) => {
      // 1. Upsert settlement record
      const record = await tx.salarySettlement.upsert({
        where: {
          caregiverId_month: {
            caregiverId: data.caregiverId,
            month: data.month
          }
        },
        update: {
          totalAmount: data.totalAmount,
          details: JSON.stringify(data.items),
        },
        create: {
          caregiverId: data.caregiverId,
          month: data.month,
          totalAmount: data.totalAmount,
          status: 'SETTLED',
          details: JSON.stringify(data.items),
        }
      });

      // 2. Sync back to each individual Order
      const orderIds: string[] = data.items.map((item) => item.orderId);
      const orders = await tx.order.findMany({
        where: {
          id: {
            in: orderIds,
          },
        },
        select: {
          id: true,
          customData: true,
        },
      });
      const orderMap = new Map(orders.map((order) => [order.id, order]));

      await Promise.all(data.items.map(async (item) => {
        const order = orderMap.get(item.orderId);
        if (!order) {
          return;
        }

        const currentCustomData = deserializeCustomData<OrderCustomData>(order.customData);
        const nextHistory = upsertSettlementHistory(currentCustomData.settlementHistory ?? [], {
          month: data.month,
          actualDays: item.actualDays || item.daysInMonth,
          totalAmount: item.amount,
          type: item.settlementType,
          source: 'FINANCE_CENTER',
          createdAt: new Date().toISOString(),
        });

        await tx.order.update({
          where: { id: item.orderId },
          data: {
            paymentStatus: 'PAID',
            customData: JSON.stringify({
              ...currentCustomData,
              settlementHistory: nextHistory,
            }),
          },
        });
      }));

      return record;
    });

    revalidatePath('/salary-settlement');
    revalidatePath('/finance');
    revalidatePath('/orders');
    return { success: true, message: '结算单保存成功，已同步更新订单状态及支付标记', data: sanitizeData(result) };

  } catch (error: unknown) {
    console.error('Save Settlement Error:', error);
    return { success: false, message: `保存失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}
