#!/usr/bin/env node

/**
 * 自定义 Playwright MCP Wrapper：
 * 1. 使用标准 MCP over stdio(Content-Length 帧)对接 Codex
 * 2. 直接在当前进程内复用 Playwright backend，避免上游 CLI transport 差异
 * 3. 过滤 screenshot 工具，并记录原始 stdin/stdout 帧到黑匣子日志
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import util from "node:util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightEntry = require.resolve("playwright");
const playwrightRoot = path.dirname(playwrightEntry);
const { contextFactory } = require(path.join(playwrightRoot, "lib/mcp/browser/browserContextFactory.js"));
const { BrowserServerBackend } = require(path.join(playwrightRoot, "lib/mcp/browser/browserServerBackend.js"));
const { resolveCLIConfig } = require(path.join(playwrightRoot, "lib/mcp/browser/config.js"));
const playwrightMcpPackageJson = require("@playwright/mcp/package.json");

const BLOCKED_TOOL_PATTERNS = [
  /screenshot/i,
  /screen[_-]?shot/i,
  /capture.*screen/i,
  /page\.screenshot/i,
];

const IO_TRACE_LOG_PATH = process.env.MCP_IO_TRACE_LOG ?? "/tmp/mcp-io-trace.log";
const DEBUG_LOG_PATH = process.env.MCP_WRAPPER_DEBUG_LOG ?? IO_TRACE_LOG_PATH;
const SERVER_NAME = "Playwright";
const DEFAULT_PROTOCOL_VERSION = "2025-03-26";
const DEFAULT_CHROMIUM_EXECUTABLE_PATH = "/home/addaswsw/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome";

let keepAliveTimer = null;
let isShuttingDown = false;
let backend = null;
let wireProtocol = null;
let allowStdoutFrameWrite = false;
const STDIN_BUFFER_SIZE = 64 * 1024;

/**
 * 中文注释：上游 Playwright MCP 在 Linux 下默认会走 chromium + channel=chrome，
 * 导致硬编码寻址 `/opt/google/chrome/chrome`。这里优先复用已缓存的 Chromium，
 * 避免依赖系统级 Chrome 安装。
 * @returns {void}
 */
function applyPlaywrightBrowserOverrides() {
  if (!process.env.PLAYWRIGHT_MCP_BROWSER) {
    process.env.PLAYWRIGHT_MCP_BROWSER = "chromium";
  }

  if (!process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH && fs.existsSync(DEFAULT_CHROMIUM_EXECUTABLE_PATH)) {
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH = DEFAULT_CHROMIUM_EXECUTABLE_PATH;
  }
}

/**
 * @param {string} kind
 * @param {string} message
 * @returns {void}
 */
function appendLog(kind, message) {
  const line = `[${new Date().toISOString()}] pid=${process.pid} ${kind} ${message}\n`;
  fs.appendFileSync(DEBUG_LOG_PATH, line, "utf8");
}

/**
 * @param {string} message
 * @returns {void}
 */
function debugLog(message) {
  appendLog("DEBUG", message);
}

/**
 * @param {"stdin" | "stdout" | "stderr"} streamName
 * @param {Buffer | string} chunk
 * @returns {void}
 */
function traceRaw(streamName, chunk) {
  const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
  const preview = JSON.stringify(buffer.toString("utf8"));
  appendLog("IO", `${streamName} bytes=${buffer.length} text=${preview}`);
}

/**
 * @param {"log" | "warn" | "error" | "info" | "debug"} level
 * @param {unknown[]} args
 * @returns {void}
 */
function redirectConsole(level, args) {
  const text = util.format(...args);
  appendLog("CONSOLE", `${level} ${text}`);
  process.stderr.write(`[wrapper:${level}] ${text}\n`);
}

console.log = (...args) => {
  redirectConsole("log", args);
};

console.warn = (...args) => {
  redirectConsole("warn", args);
};

console.error = (...args) => {
  redirectConsole("error", args);
};

console.info = (...args) => {
  redirectConsole("info", args);
};

console.debug = (...args) => {
  redirectConsole("debug", args);
};

process.stderr.write = new Proxy(process.stderr.write.bind(process.stderr), {
  apply(target, thisArg, args) {
    const [chunk] = args;
    if (typeof chunk === "string" || Buffer.isBuffer(chunk)) {
      traceRaw("stderr", chunk);
    }
    return Reflect.apply(target, thisArg, args);
  },
});

process.stdout.write = new Proxy(process.stdout.write.bind(process.stdout), {
  apply(target, thisArg, args) {
    const [chunk] = args;

    if (allowStdoutFrameWrite) {
      if (typeof chunk === "string" || Buffer.isBuffer(chunk)) {
        traceRaw("stdout", chunk);
      }
      return Reflect.apply(target, thisArg, args);
    }

    if (typeof chunk === "string" || Buffer.isBuffer(chunk)) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
      appendLog("SANITIZE", `reroute stdout->stderr bytes=${Buffer.byteLength(text, "utf8")} text=${JSON.stringify(text)}`);
      return process.stderr.write(chunk);
    }

    return Reflect.apply(target, thisArg, args);
  },
});

process.on("uncaughtException", (error) => {
  debugLog(`uncaughtException ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
});

process.on("unhandledRejection", (reason) => {
  debugLog(`unhandledRejection ${reason instanceof Error ? reason.stack ?? reason.message : String(reason)}`);
});

process.on("beforeExit", (code) => {
  debugLog(`process beforeExit code=${code}`);
});

process.on("exit", (code) => {
  debugLog(`process exit code=${code}`);
});

/**
 * @param {string | undefined} value
 * @returns {boolean}
 */
function isBlockedToolName(value) {
  if (!value) {
    return false;
  }

  return BLOCKED_TOOL_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * @param {unknown} maybeTool
 * @returns {boolean}
 */
function isAllowedTool(maybeTool) {
  if (!maybeTool || typeof maybeTool !== "object") {
    return true;
  }

  const tool = /** @type {{ name?: unknown; description?: unknown }} */ (maybeTool);
  const toolName = typeof tool.name === "string" ? tool.name : "";
  const toolDescription = typeof tool.description === "string" ? tool.description : "";

  return !isBlockedToolName(toolName) && !isBlockedToolName(toolDescription);
}

class McpFrameParser {
  /**
   * @param {(message: unknown) => void | Promise<void>} onMessage
   */
  constructor(onMessage) {
    /** @private */
    this.onMessage = onMessage;
    /** @private */
    this.buffer = Buffer.alloc(0);
    /** @private */
    this.lineBuffer = "";
  }

  /**
   * @param {Buffer | string} chunk
   * @returns {Promise<void>}
   */
  async push(chunk) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
    if (wireProtocol === null) {
      const text = bufferChunk.toString("utf8");
      const trimmed = text.trimStart();
      wireProtocol = trimmed.startsWith("Content-Length:")
        ? "content-length"
        : "jsonl";
      debugLog(`wire protocol detected=${wireProtocol}`);
    }

    if (wireProtocol === "jsonl") {
      await this.pushJsonLines(bufferChunk);
      return;
    }

    this.buffer = Buffer.concat([this.buffer, bufferChunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const headerText = this.buffer.subarray(0, headerEnd).toString("utf8");
      const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        throw new Error(`非法 MCP 帧，缺少 Content-Length。header=${headerText}`);
      }

      const contentLength = Number(contentLengthMatch[1]);
      const frameLength = headerEnd + 4 + contentLength;
      if (this.buffer.length < frameLength) {
        return;
      }

      const bodyBuffer = this.buffer.subarray(headerEnd + 4, frameLength);
      const body = bodyBuffer.toString("utf8");
      this.buffer = this.buffer.subarray(frameLength);
      appendLog("FRAME", `stdin body=${body}`);

      let message;
      try {
        message = JSON.parse(body);
      } catch (error) {
        throw new Error(`MCP 消息 JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      await this.onMessage(message);
    }
  }

  /**
   * @param {Buffer | string} chunk
   * @returns {Promise<void>}
   */
  async pushJsonLines(chunk) {
    const textChunk = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk;
    this.lineBuffer += textChunk;

    while (true) {
      const newlineIndex = this.lineBuffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      const line = this.lineBuffer.slice(0, newlineIndex).trim();
      this.lineBuffer = this.lineBuffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      appendLog("FRAME", `stdin line=${line}`);

      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        throw new Error(`JSONL MCP 消息解析失败: ${error instanceof Error ? error.message : String(error)}`);
      }

      await this.onMessage(message);
    }
  }
}

/**
 * @param {unknown} message
 * @returns {message is { id: string | number; method: string; params?: Record<string, unknown> }}
 */
function isRequestMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }

  const record = /** @type {Record<string, unknown>} */ (message);
  return (
    (typeof record.id === "string" || typeof record.id === "number") &&
    typeof record.method === "string"
  );
}

/**
 * @param {unknown} message
 * @returns {message is { method: string; params?: Record<string, unknown> }}
 */
function isNotificationMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }

  const record = /** @type {Record<string, unknown>} */ (message);
  return !("id" in record) && typeof record.method === "string";
}

/**
 * @param {unknown} message
 * @returns {string | null}
 */
function getToolCallName(message) {
  if (!isRequestMessage(message)) {
    return null;
  }

  const params = message.params ?? {};
  if (!params || typeof params !== "object") {
    return null;
  }

  const record = /** @type {Record<string, unknown>} */ (params);
  if (typeof record.name === "string") {
    return record.name;
  }

  if (typeof record.toolName === "string") {
    return record.toolName;
  }

  return null;
}

/**
 * @param {unknown} message
 * @returns {message is { id: string | number; method: "initialize"; params?: Record<string, unknown> }}
 */
function isInitializeRequest(message) {
  return isRequestMessage(message) && message.method === "initialize";
}

/**
 * @param {unknown} message
 * @returns {boolean}
 */
function isToolsListRequest(message) {
  return isRequestMessage(message) && message.method === "tools/list";
}

/**
 * @param {unknown} message
 * @returns {boolean}
 */
function isToolsCallRequest(message) {
  return isRequestMessage(message) && message.method === "tools/call";
}

/**
 * @param {unknown} message
 * @returns {boolean}
 */
function isPingRequest(message) {
  return isRequestMessage(message) && message.method === "ping";
}

/**
 * @param {string | number} id
 * @param {unknown} result
 * @returns {{ jsonrpc: "2.0"; id: string | number; result: unknown }}
 */
function buildResult(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * @param {string} protocolVersion
 * @returns {{ protocolVersion: string; capabilities: { tools: { listChanged: boolean } }; serverInfo: { name: string; version: string } }}
 */
function buildInitializeResult(protocolVersion) {
  return {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    serverInfo: {
      name: SERVER_NAME,
      version: playwrightMcpPackageJson.version,
    },
  };
}

/**
 * @param {string | number | null} id
 * @param {number} code
 * @param {string} message
 * @param {unknown} [data]
 * @returns {{ jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string; data?: unknown } }}
 */
function buildError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id,
    error: data === undefined ? { code, message } : { code, message, data },
  };
}

/**
 * @param {NodeJS.WritableStream} stream
 * @param {unknown} message
 * @returns {void}
 */
function writeFrame(stream, message) {
  const body = JSON.stringify(message);
  if (wireProtocol === "jsonl") {
    appendLog("FRAME", `stdout line=${body}`);
    const payload = `${body}\n`;
    allowStdoutFrameWrite = true;
    try {
      stream.write(payload, "utf8");
    } finally {
      allowStdoutFrameWrite = false;
    }
    return;
  }

  appendLog("FRAME", `stdout body=${body}`);
  const payload = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
  allowStdoutFrameWrite = true;
  try {
    stream.write(payload, "utf8");
  } finally {
    allowStdoutFrameWrite = false;
  }
}

/**
 * @returns {Promise<void>}
 */
async function initializeBackend() {
  if (backend) {
    return;
  }

  debugLog("backend bootstrap start");
  const config = await resolveCLIConfig({});
  debugLog(`config resolved browser=${config.browser.browserName ?? "default"} channel=${config.browser.launchOptions.channel ?? "default"}`);
  backend = new BrowserServerBackend(config, contextFactory(config));
}

/**
 * @returns {Promise<unknown[]>}
 */
async function listAllowedTools() {
  await initializeBackend();
  const tools = await backend.listTools();
  const filteredTools = tools.filter((tool) => isAllowedTool(tool));
  debugLog(`backend listTools total=${tools.length} filtered=${filteredTools.length}`);
  return filteredTools;
}

/**
 * @param {string} name
 * @param {Record<string, unknown> | undefined} rawArguments
 * @returns {Promise<unknown>}
 */
async function callTool(name, rawArguments) {
  await initializeBackend();
  debugLog(`backend callTool name=${name}`);

  if (isBlockedToolName(name)) {
    return {
      content: [{ type: "text", text: `### Error\nTool "${name}" 已被策略层禁用：禁止使用截图类能力。` }],
      isError: true,
    };
  }

  // 中文注释：真正的 browser.launch 发生在 tool.handle 阶段，不在 tools/list 阶段。
  return backend.callTool(name, rawArguments);
}

/**
 * @returns {Promise<void>}
 */
async function shutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  debugLog("shutdown start");
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
  }
  if (backend?.serverClosed) {
    backend.serverClosed();
  }
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});

async function main() {
  debugLog("wrapper main start");
  applyPlaywrightBrowserOverrides();
  debugLog(
    `browser overrides browser=${process.env.PLAYWRIGHT_MCP_BROWSER ?? "unset"} executablePath=${process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ?? "unset"}`,
  );

  const parser = new McpFrameParser(async (message) => {
    try {
      if (isInitializeRequest(message)) {
        const params = message.params ?? {};
        clientInfo = params;
        initialized = true;
        debugLog(`initialize received params=${JSON.stringify(params)}`);

        if (backend && typeof backend.initialize === "function") {
          await backend.initialize({
            name: typeof params.clientInfo?.name === "string" ? params.clientInfo.name : "unknown",
            version: typeof params.clientInfo?.version === "string" ? params.clientInfo.version : "unknown",
            roots: [],
            timestamp: Date.now(),
          });
        }

        writeFrame(
          stdoutStream,
          buildResult(
            message.id,
            buildInitializeResult(
              typeof params.protocolVersion === "string" ? params.protocolVersion : DEFAULT_PROTOCOL_VERSION,
            ),
          ),
        );
        return;
      }

      if (isNotificationMessage(message) && message.method === "notifications/initialized") {
        debugLog("notifications/initialized received");
        return;
      }

      if (isPingRequest(message)) {
        writeFrame(stdoutStream, buildResult(message.id, {}));
        return;
      }

      if (isToolsListRequest(message)) {
        const tools = await listAllowedTools();
        writeFrame(stdoutStream, buildResult(message.id, { tools }));
        return;
      }

      if (isToolsCallRequest(message)) {
        const params = message.params ?? {};
        const toolName = getToolCallName(message);
        const result = await callTool(toolName ?? "unknown", /** @type {Record<string, unknown> | undefined} */ (params.arguments ?? params));
        writeFrame(stdoutStream, buildResult(message.id, result));
        return;
      }

      if (isRequestMessage(message)) {
        writeFrame(stdoutStream, buildError(message.id, -32601, `Method not found: ${message.method}`));
        return;
      }

      debugLog(`ignored message=${JSON.stringify(message)}`);
    } catch (error) {
      const id = isRequestMessage(message) ? message.id : null;
      const errorText = error instanceof Error ? error.stack ?? error.message : String(error);
      debugLog(`message handling failure id=${String(id)} error=${errorText}`);
      if (id !== null) {
        writeFrame(stdoutStream, buildError(id, -32000, error instanceof Error ? error.message : String(error)));
      }
    }
  });

  await initializeBackend();

  // 中文注释：保活定时器仅作为兜底，真正的协议流由 stdin data 事件驱动。
  keepAliveTimer = setInterval(() => {}, 60 * 60 * 1000);
  debugLog("keepalive timer armed");
  pumpStdin(parser);
}

/**
 * 中文注释：直接轮询 fd0，绕开 process.stdin / fs.ReadStream 在不同宿主下的 EOF 与 EAGAIN 差异。
 * @param {McpFrameParser} parser
 * @returns {void}
 */
function pumpStdin(parser) {
  const buffer = Buffer.allocUnsafe(STDIN_BUFFER_SIZE);

  const readNext = () => {
    fs.read(0, buffer, 0, buffer.length, null, (error, bytesRead) => {
      if (error) {
        if (error.code === "EAGAIN" || error.code === "EWOULDBLOCK") {
          setTimeout(readNext, 10);
          return;
        }

        debugLog(`fd0 read error ${error.stack ?? error.message}`);
        setTimeout(readNext, 50);
        return;
      }

      if (bytesRead === 0) {
        debugLog("fd0 read EOF");
        setTimeout(readNext, 50);
        return;
      }

      const chunk = Buffer.from(buffer.subarray(0, bytesRead));
      traceRaw("stdin", chunk);
      void parser.push(chunk).catch((parseError) => {
        const errorText = parseError instanceof Error ? parseError.stack ?? parseError.message : String(parseError);
        debugLog(`stdin parser failure ${errorText}`);
      }).finally(() => {
        setImmediate(readNext);
      });
    });
  };

  readNext();
}

main().catch((error) => {
  const errorText = error instanceof Error ? error.stack ?? error.message : String(error);
  debugLog(`fatal error ${errorText}`);
  process.stderr.write(`${errorText}\n`);
  process.exit(1);
});
