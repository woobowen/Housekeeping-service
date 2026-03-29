import { expect, type Locator, type Page } from "@playwright/test";
import { readGoldenRuntime, type GoldenScenario } from "./golden-runtime";

export async function fillDatePicker(scope: Locator, label: string, value: string): Promise<void> {
  const field = scope.locator("label", { hasText: label }).first().locator("..");
  const input = field.locator('input[placeholder="请选择日期"]').first();
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press("Tab");
}

export async function typeInto(locator: Locator, value: string): Promise<void> {
  await locator.click();
  await locator.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await locator.press("Backspace");
  await locator.pressSequentially(value);
}

export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).toBeVisible();
}

export async function loginAsAdmin(page: Page, email: string, password: string): Promise<void> {
  if (!page.url().includes("/login")) {
    await page.goto("/login");
  }
  await waitForPageReady(page);
  await typeInto(page.locator("#email"), email);
  await typeInto(page.locator("#password"), password);
  await page.getByRole("button", { name: "登录后台" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.getByText("今日经营概览")).toBeVisible();
}

export async function readScenario(): Promise<GoldenScenario> {
  const runtime = await readGoldenRuntime();
  return runtime.scenario;
}

export async function openCreateOrderDialog(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "新建订单" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "提交正式订单" })).toBeVisible();
  return dialog;
}

export async function selectOrderCaregiver(page: Page, dialog: Locator, workerId: string): Promise<void> {
  const trigger = dialog.getByTestId("order-caregiver-select-trigger");
  await expect(trigger).toBeVisible();
  await trigger.click();

  const option = page.getByRole("option").filter({ hasText: workerId }).first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(dialog.locator('input[name="caregiverName"]')).not.toHaveValue("", { timeout: 10_000 });
}

export async function createOrderFromModal(
  page: Page,
  scenario: GoldenScenario,
  clientName: string,
  startDate: string,
  endDate: string,
  managementFee: string,
): Promise<void> {
  const dialog = await openCreateOrderDialog(page);

  await selectOrderCaregiver(page, dialog, scenario.caregiverWorkerId);
  await dialog.getByLabel("月薪 (¥)").fill(scenario.monthlySalary);
  await dialog.getByLabel("客户姓名 *").fill(clientName);
  await dialog.getByLabel("手机号 *").fill(`136${scenario.caregiverPhone.slice(-8)}`);
  await dialog.getByLabel("区域 *").fill(`${scenario.dispatcherName} 服务片区`);
  await dialog.getByLabel("派单员 *").fill(scenario.dispatcherName);
  await dialog.getByLabel("派单员电话 *").fill(scenario.dispatcherPhone);
  await dialog.getByLabel("管理费 (¥) *").fill(managementFee);
  await fillDatePicker(dialog, "开始日期 *", startDate);
  await fillDatePicker(dialog, "结束日期 *", endDate);
  await dialog.getByRole("button", { name: "提交正式订单" }).click();
}

export async function waitForFinanceQueryReady(page: Page): Promise<void> {
  const queryButton = page.getByRole("button", { name: /查询/ });
  await expect(queryButton).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByText("正在加载数据...")).toHaveCount(0);
}
