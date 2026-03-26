#!/usr/bin/env node

import { spawn } from "node:child_process";

const child = spawn("node", ["scripts/playwright-mcp-wrapper.mjs"], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    MCP_IO_TRACE_LOG: "/tmp/mcp-io-trace.log",
  },
});

let buffer = Buffer.alloc(0);

/**
 * @param {NodeJS.WritableStream} stream
 * @param {unknown} message
 * @returns {void}
 */
function writeFrame(stream, message) {
  const body = JSON.stringify(message);
  stream.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

/**
 * @param {Buffer} chunk
 * @returns {void}
 */
function parse(chunk) {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const headerText = buffer.subarray(0, headerEnd).toString("utf8");
    const contentLengthMatch = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      throw new Error(`Missing Content-Length: ${headerText}`);
    }

    const contentLength = Number(contentLengthMatch[1]);
    const frameLength = headerEnd + 4 + contentLength;
    if (buffer.length < frameLength) {
      return;
    }

    const body = buffer.subarray(headerEnd + 4, frameLength).toString("utf8");
    buffer = buffer.subarray(frameLength);
    console.log("MESSAGE", body);

    const message = JSON.parse(body);
    if (message.id === 1) {
      writeFrame(child.stdin, { jsonrpc: "2.0", method: "notifications/initialized" });
      writeFrame(child.stdin, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    }
  }
}

child.stderr.on("data", (chunk) => {
  console.log("STDERR", JSON.stringify(chunk.toString("utf8")));
});

child.stdout.on("data", parse);

child.on("exit", (code, signal) => {
  console.log("EXIT", code, signal);
});

setTimeout(() => {
  writeFrame(child.stdin, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "raw-probe",
        version: "0.0.0",
      },
    },
  });
}, 100);

setTimeout(() => {
  child.kill("SIGTERM");
}, 4000);
