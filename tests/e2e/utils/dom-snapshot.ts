import fs from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

export interface DomSnapshotOptions {
  outputDir?: string;
  fileNamePrefix?: string;
}

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..", "..");
const DEFAULT_SNAPSHOT_DIR: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts", "snapshots");

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function sanitizeSegment(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildFileName(prefix: string): string {
  const timestamp: string = new Date().toISOString().replace(/[:.]/g, "-");
  return `${sanitizeSegment(prefix)}-${timestamp}.html`;
}

function normalizeHtml(html: string): string {
  return `${html.trim()}\n`;
}

export async function saveDomSnapshot(
  page: Page,
  options: DomSnapshotOptions = {},
): Promise<string> {
  const outputDir: string = options.outputDir ?? DEFAULT_SNAPSHOT_DIR;
  const fileNamePrefix: string = options.fileNamePrefix ?? "dom-snapshot";

  await ensureDirectory(outputDir);

  // 中文注释：这里直接抓取页面最终 HTML，而不是截图，确保后续诊断只依赖 DOM 结构与文本语义。
  const html: string = await page.content();
  const fileName: string = buildFileName(fileNamePrefix);
  const filePath: string = path.join(outputDir, fileName);

  await fs.writeFile(filePath, normalizeHtml(html), "utf8");
  return filePath;
}
