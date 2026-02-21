import { z } from 'zod';

export type SettlementStatus = 'FULL' | 'PARTIAL'; // For individual order items
export type SettlementState = 'PENDING' | 'SETTLED' | 'PAID'; // For the whole settlement record

export interface SettlementItem {
  orderId: string;
  orderNo: string;
  clientName: string;
  
  // Date Logic
  startDate: string; // Order Start
  endDate: string;   // Order End
  
  // Calculation Logic for THIS month
  calcStartDate: string; // Max(OrderStart, MonthStart)
  calcEndDate: string;   // Min(OrderEnd, MonthEnd)
  daysInMonth: number;
  
  // Financials
  salaryMode: 'MONTHLY' | 'DAILY';
  baseSalary: number; // The raw monthly or daily salary from DB
  dailyRate: number;  // The effective daily rate used
  amount: number;     // daysInMonth * dailyRate
  
  settlementType: SettlementStatus; // FULL if order ends in this month, PARTIAL otherwise
  isOrderSettled: boolean; // TRUE if this order has a record in its customData for this month
  actualDays?: number;     // NEW: The actual days input during order settlement
}

export interface SettlementDetail {
  caregiverId: string;
  caregiverName: string;
  workerId: string;
  month: string;
  
  totalDays: number;
  totalAmount: number;
  orderCount: number;
  allOrdersSettled: boolean; // NEW: True only if all items have isOrderSettled = true
  
  items: SettlementItem[];
  
  // Metadata if already exists
  existingSettlementId?: string;
  status?: SettlementState;
}
