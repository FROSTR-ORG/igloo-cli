import {spawn} from 'node:child_process';
import path from 'node:path';

export type RunCliOptions = {
  cwd?: string;
  env?: Record<string, string | undefined>;
  input?: string;
  timeoutMs?: number;
  /** If provided, kill the process early once stdout matches this pattern. */
  successPattern?: RegExp;
};

export type RunCliResult = {
  exitCode: number;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
};

export async function runCli(args: string[] = [], options: RunCliOptions = {}): Promise<RunCliResult> {
  const cwd = options.cwd ?? process.cwd();
  const bin = path.join(cwd, 'dist', 'cli.js');
  const nodeBin = process.env.NODE_BINARY && process.env.NODE_BINARY.length > 0
    ? process.env.NODE_BINARY
    : 'node';
  const child = spawn(nodeBin, [bin, ...args], {
    cwd,
    env: {
      ...process.env,
      IGLOO_DISABLE_RAW_MODE: '1',
      ...options.env,
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  child.stdout.on('data', (d) => {
    const buf = Buffer.from(d);
    stdoutChunks.push(buf);
    if (options.successPattern) {
      const current = Buffer.concat(stdoutChunks).toString('utf8');
      if (options.successPattern.test(current)) {
        // Give the process a moment to flush and finish any side effects
        // (e.g., sending an echo event) before terminating.
        setTimeout(() => child.kill('SIGTERM'), 150);
      }
    }
  });
  child.stderr.on('data', (d) => stderrChunks.push(Buffer.from(d)));

  const timeout = options.timeoutMs ?? 15000;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGKILL');
  }, timeout);

  if (options.input) {
    child.stdin.write(options.input);
    child.stdin.end();
  }

  const { exitCode, signal } = await new Promise<{ exitCode: number; signal: NodeJS.Signals | null }>((resolve) => {
    child.on('exit', (code, signal) => {
      const exitCode = (code ?? (signal ? 128 : 0));
      resolve({ exitCode, signal });
    });
  });

  clearTimeout(timer);

  return {
    exitCode,
    signal,
    timedOut,
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
    stderr: Buffer.concat(stderrChunks).toString('utf8')
  };
}
