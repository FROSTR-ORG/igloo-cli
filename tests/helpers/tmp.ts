import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

export async function makeTmp(prefix = 'igloo-tests-') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return dir;
}

export async function writePasswordFile(dir: string, password = 'testpassword123') {
  const file = path.join(dir, 'password.txt');
  await fs.writeFile(file, password + '\n', 'utf8');
  return file;
}

