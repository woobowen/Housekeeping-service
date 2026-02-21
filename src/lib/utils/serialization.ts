import { Prisma } from '@prisma/client';

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
    // Check for Prisma Decimal (or any object with toNumber method that looks like Decimal)
    if (
      Prisma.Decimal.isDecimal(data) || 
      (data as any) instanceof Prisma.Decimal
    ) {
      return (data as any).toNumber();
    }

    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item)) as unknown as T;
    }

    if (data instanceof Date) {
      // Next.js handles Date serialization, so we keep it.
      return data;
    }

    // Plain object
    const sanitized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeData((data as any)[key]);
      }
    }
    return sanitized as T;
  }

  return data;
}
