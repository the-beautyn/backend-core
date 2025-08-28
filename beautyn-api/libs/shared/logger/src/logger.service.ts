import * as winston from 'winston';
import { getRequestId } from './context';

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

const level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const env = process.env.NODE_ENV || 'development';
const service = process.env.SERVICE_NAME || 'api';

const baseLogger = winston.createLogger({
  level,
  defaultMeta: { service, env },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export interface LoggerLike {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
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
    verbose: (msg, meta) => (baseLogger as any).verbose?.(msg, attach(meta)),
  };
}

/** Root logger for early boot. */
export const rootLogger = createChildLogger('root');
