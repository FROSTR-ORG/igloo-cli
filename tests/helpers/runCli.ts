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

export async function runCli(args: string[] = [], options: RunCliOptions = {}) {
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
        // Give the process a moment to flush, then terminate
        setTimeout(() => child.kill('SIGTERM'), 50);
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

  const exitCode: number = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? 0));
  });

  clearTimeout(timer);

  return {
    exitCode,
    timedOut,
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
    stderr: Buffer.concat(stderrChunks).toString('utf8')
  };
}
