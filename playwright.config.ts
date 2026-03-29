import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PROJECT_ROOT: string = __dirname;
const ARTIFACTS_ROOT: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts");
const TRACE_DIR: string = path.join(ARTIFACTS_ROOT, "traces");

export default defineConfig({
  testDir: path.join(PROJECT_ROOT, "tests", "e2e", "specs"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: path.join(PROJECT_ROOT, "playwright-report"),
      },
    ],
  ],
  outputDir: path.join(PROJECT_ROOT, "test-results"),
  webServer: {
    command: "npm run start:e2e",
    url: "http://127.0.0.1:3000/login",
    timeout: 120_000,
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "off",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        trace: {
          mode: "retain-on-failure",
          snapshots: true,
          screenshots: false,
          sources: true,
        },
        launchOptions: {
          args: [
            "--disable-dev-shm-usage",
            "--no-sandbox",
          ],
        },
      },
      outputDir: TRACE_DIR,
    },
  ],
});
