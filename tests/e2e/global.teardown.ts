import type { FullConfig } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

interface DevServerState {
  pid: number;
  port: number;
  startedByHarness: boolean;
  startedAt: string;
}

const PROJECT_ROOT: string = path.resolve(__dirname, "..", "..");
const PID_FILE: string = path.join(PROJECT_ROOT, "tests", "e2e", "artifacts", "runtime", "dev-server.json");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve: () => void): void => {
    setTimeout(resolve, ms);
  });
}

async function readState(): Promise<DevServerState | null> {
  try {
    const raw: string = await fs.readFile(PID_FILE, "utf8");
    return JSON.parse(raw) as DevServerState;
  } catch {
    return null;
  }
}

function tryKillProcessGroup(pid: number, signal: NodeJS.Signals): boolean {
  try {
    // 中文注释：使用负 PID 杀掉整个进程组，避免 next dev 的子进程残留成僵尸。
    process.kill(-pid, signal);
    return true;
  } catch {
    return false;
  }
}

function tryKillSingleProcess(pid: number, signal: NodeJS.Signals): boolean {
  try {
    process.kill(pid, signal);
    return true;
  } catch {
    return false;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function shutdownDevServer(pid: number): Promise<void> {
  tryKillProcessGroup(pid, "SIGTERM");
  tryKillSingleProcess(pid, "SIGTERM");

  for (let index: number = 0; index < 10; index += 1) {
    if (!isProcessAlive(pid)) {
      return;
    }
    await sleep(500);
  }

  tryKillProcessGroup(pid, "SIGKILL");
  tryKillSingleProcess(pid, "SIGKILL");
}

export default async function globalTeardown(_: FullConfig): Promise<void> {
  const state: DevServerState | null = await readState();

  if (!state) {
    return;
  }

  if (state.startedByHarness && state.pid > 0) {
    await shutdownDevServer(state.pid);
  }

  await fs.rm(PID_FILE, { force: true });
}
