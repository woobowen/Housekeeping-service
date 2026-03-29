import fs from "node:fs/promises";
import path from "node:path";
import { addDays, endOfMonth, format, startOfMonth, subDays } from "date-fns";

export const GOLDEN_PREFIX = "[GOLDEN-TEST]";
export const GOLDEN_PHONE_PREFIX = "13988";
export const CURRENT_MONTH = format(new Date(), "yyyy-MM");
export const CAREGIVER_DETAIL_URL_PATTERN = /\/caregivers\/(?!new$|[^/]+\/edit$)[^/]+$/;

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..", "..");
const RUNTIME_DIR: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts", "runtime");

export const GOLDEN_RUNTIME_STATE_PATH: string = path.join(RUNTIME_DIR, "golden-runtime.json");
export const GOLDEN_STORAGE_STATE_PATH: string = path.join(RUNTIME_DIR, "golden-auth.json");

export type GoldenScenario = {
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  caregiverWorkerId: string;
  caregiverName: string;
  caregiverUpdatedName: string;
  caregiverPhone: string;
  caregiverIdCard: string;
  fullOrderClientName: string;
  crossOrderClientName: string;
  dispatcherName: string;
  dispatcherPhone: string;
  fullOrderManagementFee: string;
  fullOrderUpdatedFee: string;
  crossOrderManagementFee: string;
  monthlySalary: string;
  currentMonth: string;
  fullStartDate: string;
  fullEndDate: string;
  crossStartDate: string;
  crossEndDate: string;
};

export type GoldenRuntimeState = {
  scenario: GoldenScenario;
  caregiverDetailPath?: string;
};

export function createScenario(): GoldenScenario {
  const uniqueSeed = `${Date.now()}`.slice(-8);
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const fullStart = addDays(monthStart, 9);
  const fullEnd = addDays(fullStart, 2);
  const crossStart = subDays(monthEnd, 1);
  const crossEnd = addDays(monthEnd, 3);

  return {
    adminEmail: `golden-test-admin-${uniqueSeed}@example.com`,
    adminPhone: `${GOLDEN_PHONE_PREFIX}${uniqueSeed.slice(-6)}`,
    adminPassword: "GoldenTest123A",
    caregiverWorkerId: `GOLDEN-${uniqueSeed}`,
    caregiverName: `${GOLDEN_PREFIX} 阿姨·苏州#${uniqueSeed}`,
    caregiverUpdatedName: `${GOLDEN_PREFIX} 阿姨·苏州#${uniqueSeed}-已修订`,
    caregiverPhone: `138${uniqueSeed.slice(-8)}`,
    caregiverIdCard: `32050019900101${uniqueSeed.slice(-3)}X`,
    fullOrderClientName: `${GOLDEN_PREFIX} 客户/整月-A`,
    crossOrderClientName: `${GOLDEN_PREFIX} 客户&跨月-B`,
    dispatcherName: `${GOLDEN_PREFIX} 调度员`,
    dispatcherPhone: `137${uniqueSeed.slice(-8)}`,
    fullOrderManagementFee: "100",
    fullOrderUpdatedFee: "260",
    crossOrderManagementFee: "200",
    monthlySalary: "7800",
    currentMonth: CURRENT_MONTH,
    fullStartDate: format(fullStart, "yyyy-MM-dd"),
    fullEndDate: format(fullEnd, "yyyy-MM-dd"),
    crossStartDate: format(crossStart, "yyyy-MM-dd"),
    crossEndDate: format(crossEnd, "yyyy-MM-dd"),
  };
}

async function ensureRuntimeDir(): Promise<void> {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

export async function resetGoldenRuntime(): Promise<void> {
  await ensureRuntimeDir();
  await fs.rm(GOLDEN_RUNTIME_STATE_PATH, { force: true });
  await fs.rm(GOLDEN_STORAGE_STATE_PATH, { force: true });
}

export async function writeGoldenRuntime(state: GoldenRuntimeState): Promise<void> {
  await ensureRuntimeDir();
  await fs.writeFile(GOLDEN_RUNTIME_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readGoldenRuntime(): Promise<GoldenRuntimeState> {
  const raw: string = await fs.readFile(GOLDEN_RUNTIME_STATE_PATH, "utf8");
  return JSON.parse(raw) as GoldenRuntimeState;
}
