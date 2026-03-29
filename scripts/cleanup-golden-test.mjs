#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const GOLDEN_PREFIX = "[GOLDEN-TEST]";
const GOLDEN_EMAIL_PATTERN = "golden-test";
const GOLDEN_PHONE_PREFIX = "13988";

async function main() {
  const caregivers = await prisma.caregiver.findMany({
    where: {
      OR: [
        { name: { contains: GOLDEN_PREFIX } },
        { workerId: { contains: "GOLDEN" } },
        { notes: { contains: GOLDEN_PREFIX } },
        { selfIntro: { contains: GOLDEN_PREFIX } },
        { workHistory: { contains: GOLDEN_PREFIX } },
        { reviews: { contains: GOLDEN_PREFIX } },
      ],
    },
    select: {
      idString: true,
    },
  });

  const caregiverIds = caregivers.map((item) => item.idString);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { clientName: { contains: GOLDEN_PREFIX } },
        { dispatcherName: { contains: GOLDEN_PREFIX } },
        { remarks: { contains: GOLDEN_PREFIX } },
        caregiverIds.length > 0 ? { caregiverId: { in: caregiverIds } } : undefined,
      ].filter(Boolean),
    },
    select: {
      id: true,
    },
  });

  const orderIds = orders.map((item) => item.id);

  const deletedSettlements = await prisma.salarySettlement.deleteMany({
    where: caregiverIds.length > 0 ? { caregiverId: { in: caregiverIds } } : { caregiverId: "__none__" },
  });

  const deletedOrders = await prisma.order.deleteMany({
    where: orderIds.length > 0 ? { id: { in: orderIds } } : { id: "__none__" },
  });

  const deletedTimelines = await prisma.caregiverTimeline.deleteMany({
    where: caregiverIds.length > 0 ? { caregiverId: { in: caregiverIds } } : { caregiverId: "__none__" },
  });

  const deletedCaregivers = await prisma.caregiver.deleteMany({
    where: caregiverIds.length > 0 ? { idString: { in: caregiverIds } } : { idString: "__none__" },
  });

  const deletedVerificationCodes = await prisma.verificationCode.deleteMany({
    where: {
      email: {
        contains: GOLDEN_EMAIL_PATTERN,
      },
    },
  });

  const deletedAdmins = await prisma.adminAccount.deleteMany({
    where: {
      OR: [
        {
          email: {
            contains: GOLDEN_EMAIL_PATTERN,
          },
        },
        {
          phone: {
            startsWith: GOLDEN_PHONE_PREFIX,
          },
        },
      ],
    },
  });

  const result = {
    deletedSettlements: deletedSettlements.count,
    deletedOrders: deletedOrders.count,
    deletedTimelines: deletedTimelines.count,
    deletedCaregivers: deletedCaregivers.count,
    deletedVerificationCodes: deletedVerificationCodes.count,
    deletedAdmins: deletedAdmins.count,
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
