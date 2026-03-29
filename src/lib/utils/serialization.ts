import { Prisma } from '@prisma/client';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && !(value instanceof Date)
    && !Prisma.Decimal.isDecimal(value);
}

/**
 * Recursively traverses an object/array and converts Prisma Decimal objects to numbers.
 * Also handles Date objects if needed (Next.js supports Date, but sometimes ISO string is preferred).
 * For now, strict requirement is Decimal -> number.
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'object') {
    if (Prisma.Decimal.isDecimal(data)) {
      return data.toNumber() as T;
    }

    if (Array.isArray(data)) {
      return data.map((item: unknown) => sanitizeData(item)) as T;
    }

    if (data instanceof Date) {
      return data;
    }

    if (isPlainObject(data)) {
      const sanitized: PlainObject = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = sanitizeData(value);
      }
      return sanitized as T;
    }
  }

  return data;
}
