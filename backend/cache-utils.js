import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

export function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

export function generateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function getCachedResult(hash) {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${hash}.json`);
  
  if (fs.existsSync(cachePath)) {
    try {
      const data = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to read cache:', e);
      return null;
    }
  }
  return null;
}

export function setCachedResult(hash, data) {
  ensureCacheDir();
  const cachePath = path.join(CACHE_DIR, `${hash}.json`);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write cache:', e);
  }
}
