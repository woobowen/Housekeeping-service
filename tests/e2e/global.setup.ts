import type { FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";

interface ProcessOwnerInfo {
  pid: number;
  cwd: string | null;
  cmdline: string;
}

interface DevServerState {
  pid: number;
  port: number;
  startedByHarness: boolean;
  startedAt: string;
}

const PORT: number = 3000;
const HOST: string = "127.0.0.1";
const START_TIMEOUT_MS: number = 90_000;
const POLL_INTERVAL_MS: number = 1_000;

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..");
const ARTIFACTS_ROOT: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts");
const RUNTIME_ROOT: string = path.join(ARTIFACTS_ROOT, "runtime");
const LOG_ROOT: string = path.join(ARTIFACTS_ROOT, "logs");
const PID_FILE: string = path.join(RUNTIME_ROOT, "dev-server.json");
const DEV_SERVER_LOG_FILE: string = path.join(LOG_ROOT, "dev-server.log");

async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve: () => void): void => {
    setTimeout(resolve, ms);
  });
}

function isPortOpen(host: string, port: number): Promise<boolean> {
  return new Promise((resolve: (value: boolean) => void): void => {
    const socket: net.Socket = new net.Socket();

    const finalize = (result: boolean): void => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1_000);
    socket.once("connect", (): void => finalize(true));
    socket.once("timeout", (): void => finalize(false));
    socket.once("error", (): void => finalize(false));
    socket.connect(port, host);
  });
}

function waitForHttpOk(url: string, timeoutMs: number): Promise<void> {
  const startedAt: number = Date.now();

  return new Promise((resolve: () => void, reject: (reason?: Error) => void): void => {
    const probe = (): void => {
      const request: http.ClientRequest = http.get(url, (response: http.IncomingMessage): void => {
        response.resume();

        if ((response.statusCode ?? 500) >= 200 && (response.statusCode ?? 500) < 400) {
          resolve();
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`等待服务就绪超时，收到状态码 ${(response.statusCode ?? "unknown").toString()}`));
          return;
        }

        setTimeout(probe, POLL_INTERVAL_MS);
      });

      request.once("error", (): void => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`等待 ${url} 就绪超时，目标端口未返回 HTTP 200/3xx`));
          return;
        }

        setTimeout(probe, POLL_INTERVAL_MS);
      });
    };

    probe();
  });
}

async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function detectPortOwnerLinux(port: number): Promise<ProcessOwnerInfo | null> {
  const portHex: string = port.toString(16).toUpperCase().padStart(4, "0");
  const tcpFiles: string[] = ["/proc/net/tcp", "/proc/net/tcp6"];

  for (const tcpFile of tcpFiles) {
    const content: string | null = await readFileSafe(tcpFile);
    if (!content) {
      continue;
    }

    const lines: string[] = content.split("\n").slice(1);

    for (const line of lines) {
      const trimmed: string = line.trim();
      if (!trimmed) {
        continue;
      }

      const columns: string[] = trimmed.split(/\s+/);
      const localAddress: string | undefined = columns[1];
      const inode: string | undefined = columns[9];

      if (!localAddress || !inode) {
        continue;
      }

      const localParts: string[] = localAddress.split(":");
      const localPortHex: string | undefined = localParts[1];

      if (localPortHex !== portHex) {
        continue;
      }

      const procDirEntries: string[] = await fs.readdir("/proc");
      for (const entry of procDirEntries) {
        if (!/^\d+$/.test(entry)) {
          continue;
        }

        const pid: number = Number(entry);
        const fdDir: string = path.join("/proc", entry, "fd");

        let fdEntries: string[];
        try {
          fdEntries = await fs.readdir(fdDir);
        } catch {
          continue;
        }

        for (const fdEntry of fdEntries) {
          const fdPath: string = path.join(fdDir, fdEntry);

          let linkTarget: string;
          try {
            linkTarget = await fs.readlink(fdPath);
          } catch {
            continue;
          }

          if (linkTarget !== `socket:[${inode}]`) {
            continue;
          }

          const cwd: string | null = await fs.realpath(path.join("/proc", entry, "cwd")).catch((): null => null);
          const cmdlineRaw: string | null = await readFileSafe(path.join("/proc", entry, "cmdline"));
          const cmdline: string = (cmdlineRaw ?? "").replace(/\u0000/g, " ").trim();

          return {
            pid,
            cwd,
            cmdline,
          };
        }
      }
    }
  }

  return null;
}

function isWorkspaceOwnedProcess(owner: ProcessOwnerInfo | null, projectRoot: string): boolean {
  if (!owner) {
    return false;
  }

  const normalizedProjectRoot: string = path.resolve(projectRoot);
  const normalizedCwd: string | null = owner.cwd ? path.resolve(owner.cwd) : null;
  const command: string = owner.cmdline.toLowerCase();

  if (!normalizedCwd || !normalizedCwd.startsWith(normalizedProjectRoot)) {
    return false;
  }

  return command.includes("next") || command.includes("node");
}

async function persistDevServerState(state: DevServerState): Promise<void> {
  await ensureDirectory(RUNTIME_ROOT);
  await fs.writeFile(PID_FILE, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

async function appendLogLine(line: string): Promise<void> {
  await ensureDirectory(LOG_ROOT);
  await fs.appendFile(DEV_SERVER_LOG_FILE, `${line}\n`, "utf8");
}

async function startDevServer(): Promise<number> {
  await ensureDirectory(LOG_ROOT);

  const child = spawn(
    "bash",
    [
      "-lc",
      "source ~/.nvm/nvm.sh && npm run dev:fixed",
    ],
    {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: String(PORT),
      },
    },
  );

  child.stdout?.on("data", (chunk: Buffer): void => {
    void appendLogLine(chunk.toString("utf8").trimEnd());
  });

  child.stderr?.on("data", (chunk: Buffer): void => {
    void appendLogLine(chunk.toString("utf8").trimEnd());
  });

  child.unref();

  if (!child.pid) {
    throw new Error("启动 Next dev 失败，未拿到子进程 PID");
  }

  return child.pid;
}

async function preflightGuard(): Promise<void> {
  const occupied: boolean = await isPortOpen(HOST, PORT);

  if (!occupied) {
    return;
  }

  const owner: ProcessOwnerInfo | null = await detectPortOwnerLinux(PORT);
  if (!isWorkspaceOwnedProcess(owner, PROJECT_ROOT)) {
    const ownerText: string = owner
      ? `pid=${owner.pid}, cwd=${owner.cwd ?? "unknown"}, cmd=${owner.cmdline || "unknown"}`
      : "unknown process";

    throw new Error(`Fatal Error: 端口 ${PORT} 已被非当前工作区进程占用，拒绝静默切换端口。owner=${ownerText}`);
  }
}

export default async function globalSetup(_: FullConfig): Promise<void> {
  await ensureDirectory(ARTIFACTS_ROOT);
  await ensureDirectory(RUNTIME_ROOT);
  await ensureDirectory(LOG_ROOT);

  await preflightGuard();

  const healthUrl: string = `http://${HOST}:${PORT}`;
  const alreadyServing: boolean = await isPortOpen(HOST, PORT);

  if (alreadyServing) {
    await waitForHttpOk(healthUrl, 10_000);
    await persistDevServerState({
      pid: -1,
      port: PORT,
      startedByHarness: false,
      startedAt: new Date().toISOString(),
    });
    return;
  }

  const pid: number = await startDevServer();
  await persistDevServerState({
    pid,
    port: PORT,
    startedByHarness: true,
    startedAt: new Date().toISOString(),
  });

  const startedAt: number = Date.now();
  while (Date.now() - startedAt < START_TIMEOUT_MS) {
    const alive: boolean = await isPortOpen(HOST, PORT);
    if (alive) {
      await waitForHttpOk(healthUrl, 10_000);
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Fatal Error: Next dev 未能在 ${START_TIMEOUT_MS}ms 内绑定到 ${HOST}:${PORT}`);
}
