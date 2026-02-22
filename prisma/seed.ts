import { PrismaClient } from '@prisma/client';
import { fakerZH_CN as faker } from '@faker-js/faker';
import {
  PROVINCES,
  JOB_TYPES,
  CERTIFICATES,
  LANGUAGES,
  COOKING_SKILLS,
  WORK_STATUS,
  EDUCATION_LEVELS,
} from '../src/config/constants';

const prisma = new PrismaClient();

// Helper to pick random items from an array
function pickRandom<T>(arr: T[], min = 1, max = 1): T[] {
  const count = faker.number.int({ min, max });
  return faker.helpers.arrayElements(arr, count);
}

// Helper to pick exactly one random item
function pickOne<T>(arr: T[]): T {
  return faker.helpers.arrayElement(arr);
}

async function main() {
  console.log('Start seeding ...');

  // 1. Clean existing data
  await prisma.order.deleteMany(); // Delete child first
  await prisma.user.deleteMany();
  await prisma.caregiver.deleteMany();
  console.log('Cleared existing data.');

  // 2. Generate 50 caregivers
  for (let i = 0; i < 50; i++) {
    const gender = Math.random() < 0.9 ? '女' : '男';
    
    // Generate JSON fields
    const jobTypes = pickRandom(JOB_TYPES, 1, 3);
    const certificates = pickRandom(CERTIFICATES, 0, 4);
    const languages = pickRandom(LANGUAGES, 1, 2);
    const cookingSkills = pickRandom(COOKING_SKILLS, 2, 5);
    const specialties = pickRandom(JOB_TYPES, 1, 2); // Mapping specialties to subset of job types for now

    // Generate Salary (6000 - 25000, step 100)
    const salary = faker.number.int({ min: 60, max: 250 }) * 100;

    // Generate Work Experience Level based on years (rough logic)
    // We don't have exact years stored, but we have workExpLevel enum in schema as string
    const workExpLevels = ['ENTRY', 'INTERMEDIATE', 'SENIOR', 'EXPERT'];
    const workExpLevel = pickOne(workExpLevels);
    
    // Map workExpLevel to a nice string for 'level' or keep schema level enum
    const systemLevels = ['TRAINEE', 'JUNIOR', 'SENIOR', 'GOLD', 'DIAMOND'];
    const systemLevel = pickOne(systemLevels);

    const caregiver = await prisma.caregiver.create({
      data: {
        workerId: `CW${faker.string.numeric(6)}`,
        name: faker.person.fullName({ sex: gender === '女' ? 'female' : 'male' }),
        phone: faker.phone.number(),
        idCardNumber: faker.string.numeric(18), // Virtual ID
        
        // Personal Info
        birthDate: faker.date.birthdate({ min: 20, max: 55, mode: 'age' }),
        gender: gender,
        nativePlace: pickOne(PROVINCES),
        education: pickOne(EDUCATION_LEVELS),
        
        // Professional Info
        workExpLevel: workExpLevel,
        salaryRequirements: salary,
        monthlySalary: salary,
        
        // JSON Fields (Stored as String for MSSQL)
        jobTypes: JSON.stringify(jobTypes),
        certificates: JSON.stringify(certificates),
        languages: JSON.stringify(languages),
        cookingSkills: JSON.stringify(cookingSkills),
        specialties: JSON.stringify(specialties),
        
        // Files (Placeholders)
        avatarUrl: null,
        idCardFrontUrl: null,
        idCardBackUrl: null,
        
        notes: faker.lorem.sentence(),
        customData: JSON.stringify({
          rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
          internalNotes: faker.lorem.sentence(),
          customTags: faker.helpers.arrayElements(['推荐', '高素质', '性格好', '有爱心'], { min: 0, max: 2 })
        }),
        
        // System Fields
        status: (() => {
          const s = pickOne(WORK_STATUS);
          if (s === '待岗') return 'PENDING';
          if (s === '在岗') return 'ACTIVE';
          return 'INACTIVE';
        })(), 
        
        level: systemLevel,
      },
    });

    console.log(`Created caregiver: ${caregiver.name} (${caregiver.workerId})`);
  }

  // 3. Create a Test User
  const user = await prisma.user.create({
    data: {
      name: '测试客户',
      phone: '13800138000',
    },
  });
  console.log(`Created test user: ${user.name}`);

  // 4. Generate Orders for Testing Availability
  const allCaregivers = await prisma.caregiver.findMany();
  const selectedCaregivers = faker.helpers.arrayElements(allCaregivers, 10);
  const now = new Date();
  
  // Helper for date without time
  const getDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  
  for (let i = 0; i < selectedCaregivers.length; i++) {
    const cg = selectedCaregivers[i];
    let startDate: Date;
    let endDate: Date;
    let label: string;

    if (i < 3) {
      // Case 1: Busy (Yesterday -> Tomorrow) covers Today
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 1);
      endDate = new Date(now);
      endDate.setDate(now.getDate() + 1);
      label = 'Busy (Covering Today)';
    } else if (i < 6) {
      // Case 2: Free (Ended Yesterday)
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 1);
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 2);
      label = 'Free (Ended Yesterday)';
    } else {
      // Case 3: Free (Next Week)
      startDate = new Date(now);
      startDate.setDate(now.getDate() + (8 - now.getDay())); // Next Mondayish
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4);
      label = 'Free (Future Order)';
    }

    await prisma.order.create({
      data: {
        orderNo: `${Date.now()}${i}`,
        status: 'CONFIRMED',
        amount: faker.number.int({ min: 1000, max: 10000 }),
        
        // New Financials
        dailySalary: faker.number.float({ min: 200, max: 500, fractionDigits: 2 }),
        totalAmount: faker.number.float({ min: 3000, max: 10000, fractionDigits: 2 }),
        
        // Dispatch Info
        dispatcherName: 'System Admin',
        dispatcherPhone: '13800000000',
        clientLocation: faker.location.streetAddress(), // Using address as location
        serviceType: 'MonthlyCare',
        managementFee: faker.number.int({ min: 500, max: 2000 }),
        remarks: 'Seeded Order',
        paymentStatus: 'UNPAID', // Enum value as string

        startDate: getDate(startDate),
        endDate: getDate(endDate),
        address: faker.location.streetAddress(),
        contactName: user.name || 'Unknown',
        contactPhone: user.phone || '13800000000',
        requirements: '测试订单',
        clientId: user.id,
        caregiverId: cg.idString,
      },
    });
    console.log(`Created Order for ${cg.name}: ${label}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
