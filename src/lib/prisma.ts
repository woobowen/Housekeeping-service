import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient 单例模式实现。
 * 在开发环境下，Next.js 的热重载会导致创建多个 PrismaClient 实例，
 * 从而耗尽数据库连接池。通过将实例挂载到 globalThis 上可以避免此问题。
 */

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
  });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export const db = prisma;

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;