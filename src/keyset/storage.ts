import {promises as fs} from 'node:fs';
import path from 'node:path';
import {getShareDirectory} from './paths.js';
import {ShareFileRecord, ShareMetadata} from './types.js';

export async function ensureShareDirectory(dirOverride?: string): Promise<string> {
  const dir = dirOverride ?? getShareDirectory();
  await fs.mkdir(dir, {recursive: true});
  return dir;
}

export async function readShareFiles(): Promise<ShareMetadata[]> {
  const dir = getShareDirectory();

  try {
    const files = await fs.readdir(dir);
    const shareFiles = files.filter(file => file.endsWith('.json'));

    const entries: ShareMetadata[] = [];

    for (const file of shareFiles) {
      const filepath = path.join(dir, file);
      try {
        const raw = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(raw) as ShareFileRecord;
        entries.push({
          ...data,
          filepath
        });
      } catch (error) {
        // ignore malformed files
      }
    }

    return entries;
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function saveShareRecord(
  record: ShareFileRecord,
  options: {directory?: string} = {}
): Promise<string> {
  const dir = await ensureShareDirectory(options.directory);
  const filepath = path.join(dir, `${record.id}.json`);
  await fs.writeFile(filepath, JSON.stringify(record, null, 2), 'utf8');
  return filepath;
}

export async function loadShareRecord(identifier: {
  id?: string;
  filepath?: string;
}): Promise<ShareMetadata | undefined> {
  const {id, filepath} = identifier;

  if (filepath) {
    try {
      const raw = await fs.readFile(filepath, 'utf8');
      const data = JSON.parse(raw) as ShareFileRecord;
      return {
        ...data,
        filepath
      } satisfies ShareMetadata;
    } catch (error) {
      return undefined;
    }
  }

  if (!id) {
    return undefined;
  }

  const dir = getShareDirectory();
  const target = path.join(dir, `${id}.json`);

  try {
    const raw = await fs.readFile(target, 'utf8');
    const data = JSON.parse(raw) as ShareFileRecord;
    return {
      ...data,
      filepath: target
    } satisfies ShareMetadata;
  } catch (error) {
    return undefined;
  }
}
