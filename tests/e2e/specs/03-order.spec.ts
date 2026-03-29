import { expect, test, type Locator } from "@playwright/test";

import { GOLDEN_STORAGE_STATE_PATH, readGoldenRuntime } from "../support/golden-runtime";
import { createOrderFromModal, waitForPageReady } from "../support/golden-helpers";

test.use({ storageState: GOLDEN_STORAGE_STATE_PATH });

test.describe("03 Order", () => {
  test("订单调度、弹窗交互与跨月结算", async ({ page }) => {
    test.slow();

    const runtime = await readGoldenRuntime();
    const { scenario, caregiverDetailPath } = runtime;
    expect(caregiverDetailPath).toBeTruthy();

    await page.goto("/orders");
    await waitForPageReady(page);

    await createOrderFromModal(
      page,
      scenario,
      scenario.fullOrderClientName,
      scenario.fullStartDate,
      scenario.fullEndDate,
      scenario.fullOrderManagementFee,
    );
    await expect(page.getByText("订单创建成功")).toBeVisible();
    await expect(page.locator("tr", { hasText: scenario.fullOrderClientName })).toBeVisible();

    await page.goto(caregiverDetailPath!);
    await expect(page.getByText("服务中")).toBeVisible();

    await page.goto("/orders");
    const fullOrderRow = page.locator("tr", { hasText: scenario.fullOrderClientName }).first();
    await fullOrderRow.getByTitle("修改订单").click();
    const editDialog = page.getByRole("dialog");
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("管理费 (¥) *").fill(scenario.fullOrderUpdatedFee);
    await expect(editDialog.getByLabel("应付总额 (¥)")).toHaveValue("1160");
    await editDialog.getByRole("button", { name: "保存修改" }).click();
    await expect(page.getByText("订单更新成功")).toBeVisible();
    await page.reload();
    await waitForPageReady(page);

    await fullOrderRow.getByTitle("修改订单").click();
    await expect(page.getByRole("dialog").getByLabel("应付总额 (¥)")).toHaveValue("1160");
    await page.keyboard.press("Escape");

    await fullOrderRow.getByTitle("结单结算").click();
    await page.getByRole("button", { name: "确认结单" }).click();
    await expect(page.getByText("订单结算成功，家政员已释放")).toBeVisible();

    await page.goto(caregiverDetailPath!);
    await expect(page.getByText("空闲")).toBeVisible();

    await page.goto("/orders");
    await createOrderFromModal(
      page,
      scenario,
      scenario.crossOrderClientName,
      scenario.crossStartDate,
      scenario.crossEndDate,
      scenario.crossOrderManagementFee,
    );
    await expect(page.getByText("订单创建成功")).toBeVisible();

    await createOrderFromModal(
      page,
      scenario,
      "[GOLDEN-TEST] 冲突客户",
      scenario.crossStartDate,
      scenario.crossEndDate,
      "50",
    );
    await expect(page.getByText("派单失败", { exact: false })).toBeVisible();
    await page.keyboard.press("Escape");

    const crossOrderRow: Locator = page.locator("tr", { hasText: scenario.crossOrderClientName }).first();
    await crossOrderRow.getByTitle("结单结算").click();
    await expect(page.getByText("跨月订单提醒")).toBeVisible();
    await expect(page.getByLabel("实际工作天数 (支持 0.5 天)")).toHaveValue("2");
    await page.getByRole("button", { name: "确认部分结算" }).click();
    await expect(page.getByText("本月部分结算成功")).toBeVisible();
    await expect(crossOrderRow.getByText("已确认")).toBeVisible();

    await page.goto(caregiverDetailPath!);
    await expect(page.getByText("服务中")).toBeVisible();
  });
});
