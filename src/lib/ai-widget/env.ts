import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type RuntimeGlobal = typeof globalThis & {
  process?: {
    cwd?: () => string;
    env?: Record<string, string | undefined>;
  };
};

let localEnvCache: Record<string, string> | null = null;

export function getRuntimeEnv(name: string) {
  const processEnv = (globalThis as RuntimeGlobal).process?.env?.[name];

  if (processEnv !== undefined) {
    return processEnv;
  }

  const importMetaEnv = (import.meta.env as Record<string, string | undefined>)[name];

  if (importMetaEnv !== undefined) {
    return importMetaEnv;
  }

  return getLocalEnvFiles()[name];
}

export function isVercelRuntime() {
  return getRuntimeEnv('VERCEL') === '1' || getRuntimeEnv('VERCEL_ENV') !== undefined;
}

export function getIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(getRuntimeEnv(name) ?? '', 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getLocalEnvFiles() {
  if (localEnvCache) {
    return localEnvCache;
  }

  localEnvCache = {};
  const cwd = (globalThis as RuntimeGlobal).process?.cwd?.();

  if (!cwd) {
    return localEnvCache;
  }

  for (const filename of ['.env.local', 'local.env']) {
    const path = join(cwd, filename);

    if (!existsSync(path)) {
      continue;
    }

    Object.assign(localEnvCache, parseEnvFile(readFileSync(path, 'utf8')));
  }

  return localEnvCache;
}

function parseEnvFile(contents: string) {
  const env: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line;
    const equalsIndex = normalizedLine.indexOf('=');

    if (equalsIndex === -1) {
      continue;
    }

    const key = normalizedLine.slice(0, equalsIndex).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    env[key] = normalizeEnvValue(normalizedLine.slice(equalsIndex + 1).trim());
  }

  return env;
}

function normalizeEnvValue(value: string) {
  const quote = value[0];
  const isQuoted =
    value.length >= 2 &&
    (quote === '"' || quote === "'" || quote === '`') &&
    value[value.length - 1] === quote;

  if (!isQuoted) {
    const commentIndex = value.indexOf(' #');

    return commentIndex === -1 ? value : value.slice(0, commentIndex).trim();
  }

  return value.slice(1, -1);
}
