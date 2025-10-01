import path from 'node:path';
import {promises as fs} from 'node:fs';
import {getShareDirectory} from './paths.js';

export function slugifyKeysetName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'keyset';
}

export function buildShareId(keysetName: string, index: number): string {
  const slug = slugifyKeysetName(keysetName);
  return `${slug}_share_${index}`;
}

export function buildShareFilePath(keysetName: string, index: number): string {
  const dir = getShareDirectory();
  const id = buildShareId(keysetName, index);
  return path.join(dir, `${id}.json`);
}

export async function keysetNameExists(name: string): Promise<boolean> {
  const dir = getShareDirectory();
  try {
    const files = await fs.readdir(dir);
    const slug = slugifyKeysetName(name);
    return files.some(file => file.startsWith(`${slug}_share_`));
  } catch (error: any) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}
