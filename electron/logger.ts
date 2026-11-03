import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const MAX_LOG_BYTES = 1024 * 1024; // rotate at 1 MB, keeping one previous file

let logFile: string | null = null;

const resolveLogFile = (): string | null => {
  if (logFile) return logFile;
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    logFile = path.join(dir, 'main.log');
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_BYTES) {
      fs.renameSync(logFile, path.join(dir, 'main.old.log'));
    }
    return logFile;
  } catch {
    return null;
  }
};

const stringify = (value: unknown): string => {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const log = (level: 'info' | 'warn' | 'error', message: string, detail?: unknown): void => {
  const line = `${new Date().toISOString()} [${level}] ${message}${detail === undefined ? '' : ` ${stringify(detail)}`}\n`;
  (level === 'error' ? console.error : console.log)(line.trimEnd());
  const file = resolveLogFile();
  if (!file) return;
  try {
    fs.appendFileSync(file, line);
  } catch {
    // Logging must never take the app down.
  }
};

export const getLogPath = (): string | null => resolveLogFile();
