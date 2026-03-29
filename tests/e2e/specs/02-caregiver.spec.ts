import { expect, test } from "@playwright/test";

import {
  CAREGIVER_DETAIL_URL_PATTERN,
  GOLDEN_STORAGE_STATE_PATH,
  writeGoldenRuntime,
  readGoldenRuntime,
} from "../support/golden-runtime";
import { readScenario } from "../support/golden-helpers";

test.use({ storageState: GOLDEN_STORAGE_STATE_PATH });

test.describe("02 Caregiver", () => {
  test("护理员建档、时间线与资料编辑", async ({ page }) => {
    test.slow();

    const scenario = await readScenario();

    await page.goto("/caregivers/new");
    await page.getByLabel("工号 *").fill(scenario.caregiverWorkerId);
    await page.getByLabel("姓名 *").fill(scenario.caregiverName);
    await page.getByLabel("手机号 *").fill(scenario.caregiverPhone);
    await page.getByLabel("身份证号 *").fill(scenario.caregiverIdCard);
    await page.getByRole("button", { name: "下一步" }).click();

    await page.getByText("老年人护理", { exact: true }).click();
    await page.getByText("普通话", { exact: true }).click();
    await page.getByText("养老护理员证", { exact: true }).click();
    await page.getByText("家常菜", { exact: true }).click();
    await page.getByRole("button", { name: "下一步" }).click();

    await page.getByLabel("自我介绍").fill("[GOLDEN-TEST] 自我介绍：细致、稳定、可跨月排班。");
    await page.getByLabel("工作经历").fill("[GOLDEN-TEST] 工作经历：擅长跨月服务与极限班次交接。");
    await page.getByLabel("他人评语").fill("[GOLDEN-TEST] 评语：客户反馈认真负责。");
    await page.getByLabel("备注说明").fill("[GOLDEN-TEST] 备注：验证特殊字符 #&/ 兼容。");
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();

    const createCaregiverButton = page.getByRole("button", { name: "立即创建" });
    try {
      await expect(createCaregiverButton).toBeEnabled({ timeout: 5_000 });
      await createCaregiverButton.click();
    } catch {
      // 中文说明：Server Action 成功后按钮可能被立即卸载，这里只验证最终跳转是否正确。
    }
    await expect(page).toHaveURL(CAREGIVER_DETAIL_URL_PATTERN, { timeout: 30_000 });

    const caregiverDetailPath = new URL(page.url()).pathname;
    await writeGoldenRuntime({
      ...(await readGoldenRuntime()),
      caregiverDetailPath,
    });

    await expect(page.getByText(scenario.caregiverName)).toBeVisible();

    const timelineInput = page.getByPlaceholder("记录阿姨的最近工作表现、客户反馈等...");
    await timelineInput.fill("[GOLDEN-TEST] 时间线 1：客户评价“稳、准、细”。");
    await page.getByRole("button", { name: "发布动态" }).click();
    await expect(timelineInput).toHaveValue("", { timeout: 10_000 });
    await page.reload();
    await expect(page.getByText("[GOLDEN-TEST] 时间线 1", { exact: false })).toBeVisible();

    await page.getByRole("link", { name: "编辑信息" }).click();
    await page.getByLabel("姓名 *").fill(scenario.caregiverUpdatedName);
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();
    await page.getByRole("button", { name: "下一步" }).click();

    const saveCaregiverButton = page.getByRole("button", { name: "保存修改" });
    const caregiverDetailUrlPattern = new RegExp(`${caregiverDetailPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
    try {
      await expect(saveCaregiverButton).toBeEnabled({ timeout: 5_000 });
      await saveCaregiverButton.click();
    } catch {
      // 中文说明：提交后页面重定向会卸载旧按钮，只需确认最终回到详情页。
    }
    await expect(page).toHaveURL(caregiverDetailUrlPattern, { timeout: 30_000 });
    await expect(page.getByText(scenario.caregiverUpdatedName)).toBeVisible();
  });
});
