import fs from "node:fs/promises";
import path from "node:path";
import type { ConsoleMessage, Page, Request } from "@playwright/test";

export type PageEventLevel = "console" | "pageerror" | "requestfailed";

export interface PageEventRecord {
  level: PageEventLevel;
  message: string;
  url: string | null;
  method: string | null;
  timestamp: string;
}

export interface PageEventCaptureOptions {
  outputDir?: string;
  failOnConsoleError?: boolean;
  failOnPageError?: boolean;
}

export interface PageEventCapture {
  events: PageEventRecord[];
  dispose: () => Promise<void>;
  flushToFile: (fileName: string) => Promise<string>;
  assertClean: () => void;
}

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_LOG_DIR: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts", "logs");

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function normalizeConsoleMessage(message: ConsoleMessage): string {
  const text: string = message.text().trim();
  return text.length > 0 ? text : `[empty console ${message.type()} message]`;
}

export async function attachPageEventCapture(
  page: Page,
  options: PageEventCaptureOptions = {},
): Promise<PageEventCapture> {
  const outputDir: string = options.outputDir ?? DEFAULT_LOG_DIR;
  const failOnConsoleError: boolean = options.failOnConsoleError ?? true;
  const failOnPageError: boolean = options.failOnPageError ?? true;
  const events: PageEventRecord[] = [];

  const onConsole = (message: ConsoleMessage): void => {
    if (message.type() !== "error") {
      return;
    }

    events.push({
      level: "console",
      message: normalizeConsoleMessage(message),
      url: page.url() || null,
      method: null,
      timestamp: new Date().toISOString(),
    });
  };

  const onPageError = (error: Error): void => {
    events.push({
      level: "pageerror",
      message: error.stack ?? error.message,
      url: page.url() || null,
      method: null,
      timestamp: new Date().toISOString(),
    });
  };

  const onRequestFailed = (request: Request): void => {
    events.push({
      level: "requestfailed",
      message: request.failure()?.errorText ?? "unknown request failure",
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString(),
    });
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return {
    events,
    dispose: async (): Promise<void> => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    },
    flushToFile: async (fileName: string): Promise<string> => {
      await ensureDirectory(outputDir);
      const filePath: string = path.join(outputDir, fileName);
      await fs.writeFile(filePath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
      return filePath;
    },
    assertClean: (): void => {
      const consoleErrors: PageEventRecord[] = events.filter((event: PageEventRecord): boolean => event.level === "console");
      const pageErrors: PageEventRecord[] = events.filter((event: PageEventRecord): boolean => event.level === "pageerror");

      // 中文注释：这里强制把前端红字和未捕获异常转成测试失败，避免 UI 报错被“误通过”掩盖。
      if (failOnConsoleError && consoleErrors.length > 0) {
        throw new Error(`检测到 console.error:\n${consoleErrors.map((item: PageEventRecord): string => item.message).join("\n\n")}`);
      }

      if (failOnPageError && pageErrors.length > 0) {
        throw new Error(`检测到未捕获 pageerror:\n${pageErrors.map((item: PageEventRecord): string => item.message).join("\n\n")}`);
      }
    },
  };
}
