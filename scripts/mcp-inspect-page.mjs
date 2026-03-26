#!/usr/bin/env node

import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client, StdioClientTransport } = require("playwright-core/lib/mcpBundle");

const targetUrl = process.argv[2] ?? "http://localhost:3000";
const chromiumExecutablePath =
  process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ??
  "/home/addaswsw/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome";

/**
 * @param {string} name
 * @param {Record<string, unknown>} args
 * @returns {Promise<unknown>}
 */
async function callTool(name, args = {}) {
  return client.callTool({
    name,
    arguments: args,
  });
}

const transport = new StdioClientTransport({
  command: "node",
  args: ["scripts/playwright-mcp-wrapper.mjs"],
  cwd: process.cwd(),
  stderr: "pipe",
  env: {
    ...process.env,
    PLAYWRIGHT_MCP_BROWSER: "chromium",
    PLAYWRIGHT_MCP_EXECUTABLE_PATH: chromiumExecutablePath,
    MCP_WRAPPER_DEBUG_LOG: "/tmp/mcp-inspect-wrapper.log",
  },
});

transport.stderr?.on("data", (chunk) => {
  process.stderr.write(chunk);
});

const client = new Client({
  name: "mcp-inspect-page",
  version: "0.0.0",
});

try {
  await client.connect(transport, { timeout: 15000 });

  const result = {
    url: targetUrl,
    tools: [],
    navigate: null,
    dom: null,
    console: null,
    network: null,
  };

  const tools = await client.listTools();
  result.tools = tools.tools.map((tool) => tool.name);

  await callTool("browser_resize", { width: 1440, height: 900 });

  result.navigate = await callTool("browser_navigate", { url: targetUrl });

  // 中文注释：优先抽取 main，其次回退 body，避免只得到外层骨架节点。
  result.dom = await callTool("browser_run_code", {
    code: `async (page) => {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => {
        const main = document.querySelector('main');
        const body = document.body;
        const pick = main ?? body;
        const text = (pick?.innerText ?? '').replace(/\\s+/g, ' ').trim();
        const mainText = (main?.innerText ?? '').replace(/\\s+/g, ' ').trim();
        const bodyText = (body?.innerText ?? '').replace(/\\s+/g, ' ').trim();
        return {
          title: document.title,
          location: window.location.href,
          hasMain: Boolean(main),
          mainChildCount: main?.children.length ?? 0,
          bodyChildCount: body?.children.length ?? 0,
          mainTag: main?.tagName ?? null,
          bodyClasses: body?.className ?? '',
          textPreview: text.slice(0, 800),
          mainPreview: mainText.slice(0, 800),
          bodyPreview: bodyText.slice(0, 800),
          headings: Array.from(document.querySelectorAll('h1, h2, h3'))
            .map((node) => node.textContent?.trim())
            .filter(Boolean)
            .slice(0, 20),
        };
      });
      return JSON.stringify(data, null, 2);
    }`,
  });

  result.console = await callTool("browser_console_messages", { level: "info" });
  result.network = await callTool("browser_network_requests", { includeStatic: true });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
} finally {
  await transport.close().catch(() => {});
}
