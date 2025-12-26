import { logger } from './logger';

export async function measureQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    logger.debug('Query timing', { label, duration });
  }
}
