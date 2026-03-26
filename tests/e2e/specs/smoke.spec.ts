import { test, expect, type Page } from "@playwright/test";
import { attachPageEventCapture, type PageEventCapture } from "../fixtures/page-events";
import { saveDomSnapshot } from "../utils/dom-snapshot";

test.describe("E2E Smoke", (): void => {
  test("首页在 3000 端口可达，并且具备基础可见结构", async ({ page }: { page: Page }): Promise<void> => {
    const eventCapture: PageEventCapture = await attachPageEventCapture(page);
    let shouldPersistSnapshot: boolean = false;

    try {
      const response = await page.goto("/", {
        waitUntil: "domcontentloaded",
      });

      expect(response, "首页导航必须返回响应对象").not.toBeNull();
      expect(response?.ok(), "首页必须返回 2xx/3xx 响应").toBeTruthy();

      // 中文注释：标题断言保持宽松，只要求存在非空 title，避免在业务首页文案调整时造成脆弱失败。
      await expect(page).toHaveTitle(/\S+/);

      const bodyLocator = page.locator("body");
      await expect(bodyLocator, "页面必须渲染出 body 节点").toBeVisible();

      // 中文注释：优先匹配业务系统中更稳定的主结构；若没有语义化 main，则回退到 body 文本非空。
      const mainLocator = page.locator("main");
      const mainCount: number = await mainLocator.count();

      if (mainCount > 0) {
        await expect(mainLocator.first(), "页面若存在 main，则其必须可见").toBeVisible();
      } else {
        const bodyText: string = (await bodyLocator.textContent()) ?? "";
        expect(bodyText.trim().length, "body 文本内容不能为空").toBeGreaterThan(0);
      }

      eventCapture.assertClean();
    } catch (error: unknown) {
      shouldPersistSnapshot = true;
      throw error;
    } finally {
      if (shouldPersistSnapshot) {
        await saveDomSnapshot(page, {
          fileNamePrefix: "smoke-homepage-failure",
        });
        await eventCapture.flushToFile("smoke-homepage-events.json");
      }

      await eventCapture.dispose();
    }
  });
});
