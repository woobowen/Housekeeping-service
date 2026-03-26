#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Client, StdioClientTransport } = require("playwright-core/lib/mcpBundle");

const logPath = process.env.DEBUG_MCP_LOG_PATH ?? "/tmp/mcp-debug.log";
const childLogPath = process.env.DEBUG_MCP_CHILD_LOG_PATH ?? "/tmp/mcp-debug-child.log";
const targetCommand = process.argv[2] ?? "node";
const targetArgs = process.argv.length > 3 ? process.argv.slice(3) : ["scripts/playwright-mcp-wrapper.mjs"];
const rawMode = process.argv.includes("--raw-jsonl");

/**
 * @param {string} message
 * @returns {void}
 */
function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logPath, line, "utf8");
}

/**
 * @param {Buffer} chunk
 * @returns {string}
 */
function toHex(chunk) {
  return chunk.toString("hex").replace(/(..)/g, "$1 ").trim();
}

fs.writeFileSync(logPath, "", "utf8");
log(`debug script start command=${JSON.stringify(targetCommand)} args=${JSON.stringify(targetArgs)}`);
fs.writeFileSync(childLogPath, "", "utf8");

if (rawMode) {
  const child = spawn(targetCommand, targetArgs, {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      MCP_WRAPPER_DEBUG_LOG: childLogPath,
    },
  });

  child.stdout.on("data", (chunk) => {
    log(`raw stdout bytes=${chunk.length} hex=${toHex(chunk)} text=${JSON.stringify(chunk.toString("utf8"))}`);
  });

  child.stderr.on("data", (chunk) => {
    log(`raw stderr bytes=${chunk.length} hex=${toHex(chunk)} text=${JSON.stringify(chunk.toString("utf8"))}`);
  });

  child.on("exit", (code, signal) => {
    log(`raw child exit code=${code} signal=${signal}`);
  });

  const initialize = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: {
        name: "debug-mcp-raw",
        version: "0.0.0",
      },
    },
  };

  const initialized = {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  };

  const listTools = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  };

  const initializeLine = `${JSON.stringify(initialize)}\n`;
  const initializedLine = `${JSON.stringify(initialized)}\n`;
  const listToolsLine = `${JSON.stringify(listTools)}\n`;

  child.stdin.write(initializeLine, "utf8");
  log(`raw stdin bytes=${Buffer.byteLength(initializeLine)} hex=${toHex(Buffer.from(initializeLine, "utf8"))} text=${JSON.stringify(initializeLine)}`);

  setTimeout(() => {
    child.stdin.write(initializedLine, "utf8");
    log(`raw stdin bytes=${Buffer.byteLength(initializedLine)} hex=${toHex(Buffer.from(initializedLine, "utf8"))} text=${JSON.stringify(initializedLine)}`);

    child.stdin.write(listToolsLine, "utf8");
    log(`raw stdin bytes=${Buffer.byteLength(listToolsLine)} hex=${toHex(Buffer.from(listToolsLine, "utf8"))} text=${JSON.stringify(listToolsLine)}`);
  }, 100);

  setTimeout(() => {
    child.kill("SIGTERM");
  }, 3000);

  await new Promise((resolve) => child.on("close", resolve));
  process.exit(0);
}

const transport = new StdioClientTransport({
  command: targetCommand,
  args: targetArgs,
  cwd: process.cwd(),
  stderr: "pipe",
  env: {
    ...process.env,
    MCP_WRAPPER_DEBUG_LOG: childLogPath,
  },
});

transport.stderr?.on("data", (chunk) => {
  log(`transport stderr bytes=${chunk.length} text=${JSON.stringify(chunk.toString("utf8"))}`);
});

transport.onclose = () => {
  log("transport close");
};

transport.onerror = (error) => {
  log(`transport error ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
};

const client = new Client({
  name: "debug-mcp",
  version: "0.0.0",
});

try {
  await client.connect(transport, { timeout: 5000 });
  log("client connected");

  const tools = await client.listTools();
  log(`tools/list success count=${tools.tools.length}`);
  log(`tools/list names=${JSON.stringify(tools.tools.map((tool) => tool.name))}`);
} catch (error) {
  log(`client failure ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await transport.close().catch((error) => {
    log(`transport close failure ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  });
}
