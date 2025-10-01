import os from 'node:os';
import path from 'node:path';

export function getAppDataPath(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    return process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  }

  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support');
  }

  return process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');
}

export function getShareDirectory(): string {
  return path.join(getAppDataPath(), 'igloo', 'shares');
}
