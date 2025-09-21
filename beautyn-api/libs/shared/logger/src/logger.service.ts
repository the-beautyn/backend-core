import * as winston from 'winston';
import { getRequestId } from './context';

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const env = process.env.NODE_ENV || 'dev';
const service = process.env.SERVICE_NAME || 'api';

const pretty = process.env.LOG_PRETTY === '1';
const consoleFormat = pretty
  ? winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const ctx = (meta as any)?.context ? `[${(meta as any).context}]` : '';
        const req = (meta as any)?.requestId ? `(req:${(meta as any).requestId})` : '';
        const rest = (() => {
          try { return JSON.stringify(meta); } catch { return String(meta); }
        })();
        return `${timestamp} ${level} ${ctx}${req} ${message} ${rest}`.trim();
      })
    )
  : winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

const baseLogger = winston.createLogger({
  level,
  defaultMeta: { service, env },
  format: consoleFormat,
  transports: [new winston.transports.Console()],
});

export interface LoggerLike {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  http?(message: string, meta?: any): void;
  verbose?(message: string, meta?: any): void;
}

/** Child logger that auto-attaches {context, requestId}. */
export function createChildLogger(context: string): LoggerLike {
  const attach = (meta?: any) => ({ context, requestId: getRequestId(), ...(meta ?? {}) });
  return {
    error: (msg, meta) => baseLogger.error(msg, attach(meta)),
    warn: (msg, meta) => baseLogger.warn(msg, attach(meta)),
    info: (msg, meta) => baseLogger.info(msg, attach(meta)),
    debug: (msg, meta) => baseLogger.debug(msg, attach(meta)),
    http: (msg, meta) => (baseLogger as any).http?.(msg, attach(meta)) ?? baseLogger.info(msg, attach(meta)),
    verbose: (msg, meta) => (baseLogger as any).verbose?.(msg, attach(meta)),
  };
}

/** Root logger for early boot. */
export const rootLogger = createChildLogger('root');
