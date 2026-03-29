import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient 单例模式实现。
 * 在开发环境下，Next.js 的热重载会导致创建多个 PrismaClient 实例，
 * 从而耗尽数据库连接池。通过将实例挂载到 globalThis 上可以避免此问题。
 */

function buildPrismaDatasourceUrl(): string | undefined {
  const databaseUrl: string | undefined = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const isSupabasePooler: boolean = parsedUrl.hostname.includes('pooler.supabase.com');

    if (!isSupabasePooler) {
      return databaseUrl;
    }

    // 中文说明：Supabase pooler 在测试和 SSR 预取场景下更容易被瞬时并发压垮；
    // 这里强制把 Prisma 连接池收敛到 1，并关闭 statement cache，避免 transaction pooler 下的连接抖动。
    parsedUrl.searchParams.set('connection_limit', '2');
    parsedUrl.searchParams.set('pool_timeout', '60');
    parsedUrl.searchParams.set('connect_timeout', '30');
    parsedUrl.searchParams.set('statement_cache_size', '0');

    if (parsedUrl.searchParams.get('pgbouncer') !== 'true') {
      parsedUrl.searchParams.set('pgbouncer', 'true');
    }

    return parsedUrl.toString();
  } catch {
    return databaseUrl;
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: buildPrismaDatasourceUrl(),
      },
    },
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export { prisma };
export const db = prisma;

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
