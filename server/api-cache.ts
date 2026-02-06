/**
 * File-backed cache for external API responses.
 * Persists to disk so restarts don't re-hit endpoints.
 * TTL: 24 hours (data refreshed daily).
 */

import * as fs from 'fs';
import * as path from 'path';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = path.join(process.cwd(), '.api-cache.json');

interface Entry<T> {
  data: T;
  expiresAt: number;
}

type CacheRecord = Record<string, { data: unknown; expiresAt: number }>;

const cache = new Map<string, Entry<unknown>>();

function loadFromDisk(): void {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as CacheRecord;
    const now = Date.now();
    for (const [key, entry] of Object.entries(parsed)) {
      if (entry.expiresAt > now) {
        cache.set(key, { data: entry.data, expiresAt: entry.expiresAt });
      }
    }
  } catch {
    // File missing or invalid — start with empty cache
  }
}

function saveToDisk(): void {
  try {
    const record: CacheRecord = {};
    for (const [key, entry] of cache) {
      record[key] = { data: entry.data, expiresAt: entry.expiresAt };
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(record, null, 0), 'utf-8');
  } catch (err) {
    console.warn('Failed to persist cache:', err);
  }
}

loadFromDisk();

function get<T>(key: string): T | null {
  const entry = cache.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set<T>(key: string, data: T): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS });
  saveToDisk();
}

export function getCached<T>(key: string): T | null {
  return get<T>(key);
}

export function setCached<T>(key: string, data: T): void {
  set(key, data);
}
