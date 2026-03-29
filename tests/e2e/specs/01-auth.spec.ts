import { expect, test } from "@playwright/test";

import {
  createScenario,
  resetGoldenRuntime,
  writeGoldenRuntime,
  GOLDEN_STORAGE_STATE_PATH,
} from "../support/golden-runtime";
import { loginAsAdmin, typeInto, waitForPageReady } from "../support/golden-helpers";

test.describe("01 Auth", () => {
  test("注册、登录并固化共享会话", async ({ page, request }) => {
    test.slow();

    const scenario = createScenario();
    await resetGoldenRuntime();
    await writeGoldenRuntime({ scenario });

    await page.goto("/register");
    await waitForPageReady(page);
    await expect(page.getByTestId("register-form")).toBeVisible();
    await typeInto(page.locator("#phone"), scenario.adminPhone);
    await typeInto(page.locator("#email"), scenario.adminEmail);
    await typeInto(page.locator("#password"), scenario.adminPassword);
    await expect(page.getByTestId("send-code-button")).toBeEnabled({ timeout: 10_000 });
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/auth/send-code") && response.ok()),
      page.getByTestId("send-code-button").click(),
    ]);

    const debugCodeResponse = await request.post("http://127.0.0.1:3000/api/auth/e2e-code", {
      data: {
        email: scenario.adminEmail,
      },
    });
    expect(debugCodeResponse.ok()).toBeTruthy();
    const debugCodePayload = JSON.parse(await debugCodeResponse.text()) as { code: string };
    await typeInto(page.locator("#code"), debugCodePayload.code);
    await page.getByRole("button", { name: "完成管理员注册" }).click();
    await expect(page).toHaveURL(/\/login\?registered=1$/, { timeout: 30_000 });
    await expect(page.getByText("管理员账号创建完成")).toBeVisible();

    await loginAsAdmin(page, scenario.adminEmail, scenario.adminPassword);
    await page.context().storageState({ path: GOLDEN_STORAGE_STATE_PATH });
  });
});
