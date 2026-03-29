'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';
import { caregiverFormSchema, type CaregiverFormValues } from './schema';
import { type ActionState, type CaregiverListItem, type CaregiverDetailData } from './types';
import { Prisma } from '@prisma/client';
import { saveFile } from '@/lib/file-storage';
import { requireAdminSession } from '@/lib/auth/session';

// Helper: Parse potential JSON strings from FormData
function parseJsonEntry<T>(value: FormDataEntryValue | null, defaultValue: T): T {
  if (typeof value === 'string' && value.length > 0) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error('JSON Parse Error for field:', e);
    }
  }
  return defaultValue;
}

type CaregiverJsonArrayField = 'jobTypes' | 'specialties' | 'certificates' | 'cookingSkills';

async function uploadFiles(files: File[], folder: string): Promise<string[]> {
  const uploadTasks: Promise<string>[] = files
    .filter((file: File) => file.size > 0 && file.name)
    .map((file: File) => saveFile(file, folder));

  return Promise.all(uploadTasks);
}

function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseCustomDataObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function buildJsonContainsCondition(
  field: CaregiverJsonArrayField,
  value: string,
): Prisma.CaregiverWhereInput {
  switch (field) {
    case 'jobTypes':
      return { jobTypes: { contains: value } };
    case 'specialties':
      return { specialties: { contains: value } };
    case 'certificates':
      return { certificates: { contains: value } };
    case 'cookingSkills':
      return { cookingSkills: { contains: value } };
  }
}

// Helper: Process FormData into Schema-ready object
async function processFormData(formData: FormData): Promise<Partial<CaregiverFormValues>> {
  const rawData: Record<string, unknown> = {};

  // 1. Extract Single Files & Upload
  const singleFileKeys = ['avatarUrl', 'idCardFrontUrl', 'idCardBackUrl'];
  const singleFileEntries = await Promise.all(
    singleFileKeys.map(async (key: string): Promise<[string, string] | null> => {
    // Check for direct file in the key or in a "File" suffixed key (e.g. avatarFile)
      const file = formData.get(key);
      const fileAlt = formData.get(key.replace('Url', 'File'));
    
      const targetFile = (file instanceof File && file.size > 0) ? file :
        (fileAlt instanceof File && fileAlt.size > 0) ? fileAlt : null;

      if (targetFile) {
        const url = await saveFile(targetFile, 'caregivers');
        return url ? [key, url] : null;
      }

      if (typeof file === 'string' && file.length > 0) {
        return [key, file];
      }

      return null;
    }),
  );

  for (const entry of singleFileEntries) {
    if (entry) {
      rawData[entry[0]] = entry[1];
    }
  }

  // 2. Parse Standard Fields
  const simpleKeys = [
    'workerId', 'name', 'phone', 'idCardNumber', 'nativePlace', 
    'notes', 'gender', 'education', 'isLiveIn',
    'customData', 'currentResidence', 'residenceDetail',
    'height', 'weight', 'experienceYears', 'isTrainee',
    'workHistory', 'selfIntro', 'reviews'
  ];

  for (const key of simpleKeys) {
    const value = formData.get(key);
    if (value !== null && value !== undefined && !rawData[key]) {
      if (key === 'isTrainee') {
        rawData[key] = value === 'true';
      } else if (['height', 'weight', 'experienceYears'].includes(key)) {
        rawData[key] = value === '' ? null : Number(value);
      } else {
        rawData[key] = value;
      }
    }
  }
  
  // 3. Handle Date
  const dob = formData.get('dob');
  if (dob && typeof dob === 'string') {
    rawData.dob = dob; // Let Zod coerce it
  }

  // 4. Handle Multi-Image Arrays (Existing URLs + New Files)
  const multiImageKeys = ['healthCertImages', 'lifeImages'];
  for (const key of multiImageKeys) {
    // Existing URLs are sent as a JSON string
    const existingValue = formData.get(key);
    const existingUrls = parseJsonEntry<string[]>(existingValue, []);
    
    // New files are sent as individual entries with the same key but "Files" suffix
    // e.g. healthCertFiles, lifeFiles
    const fileKey = key.replace('Images', 'Files');
    const newFiles = formData.getAll(fileKey).filter((file): file is File => file instanceof File);
    const uploadedUrls: string[] = await uploadFiles(newFiles, 'caregivers');
    
    rawData[key] = [...existingUrls, ...uploadedUrls];
  }

  // 5. Parse Other JSON Arrays
  const arrayKeys = ['jobTypes', 'specialties', 'cookingSkills', 'languages', 'certificates'];
  for (const key of arrayKeys) {
    const val = formData.get(key);
    if (val !== null) {
      rawData[key] = parseJsonEntry(val, []);
    }
  }

  return rawData as Partial<CaregiverFormValues>;
}

export async function createCaregiver(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState<{ idString: string }>> {
  await requireAdminSession();
  const data = await processFormData(formData);
  const validatedFields = caregiverFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '表单验证失败，请检查输入',
    };
  }

  const { dob, ...restValidated } = validatedFields.data;

  try {
    const prismaData: Prisma.CaregiverCreateInput = {
      ...restValidated,
      birthDate: dob ? new Date(dob) : null,
      // Mapping boolean and numbers from validated data
      height: restValidated.height || null,
      weight: restValidated.weight || null,
      experienceYears: restValidated.experienceYears || null,

      // JSON Tunnel Fields
      jobTypes: JSON.stringify(restValidated.jobTypes || []),
      specialties: JSON.stringify(restValidated.specialties || []),
      cookingSkills: JSON.stringify(restValidated.cookingSkills || []),
      languages: JSON.stringify(restValidated.languages || []),
      certificates: JSON.stringify(restValidated.certificates || []),
      healthCertImages: JSON.stringify(restValidated.healthCertImages || []),
      lifeImages: JSON.stringify(restValidated.lifeImages || []),
      
      status: 'PENDING', 
      level: 'TRAINEE',
    };

    const createdCaregiver = await db.caregiver.create({
      data: prismaData,
    });

    revalidatePath('/caregivers');
    return {
      success: true,
      message: '护理员创建成功',
      data: { idString: createdCaregiver.idString },
    };
  } catch (error) {
    console.error('Failed to create caregiver:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: '该手机号或身份证号已存在' };
    }
    return { success: false, message: '创建护理员失败，请稍后重试' };
  }
}

export async function updateCaregiver(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState<{ idString: string }>> {
  await requireAdminSession();
  const id = formData.get('idString') as string;
  if (!id) return { success: false, message: 'ID不能为空' };

  const data = await processFormData(formData);
  const validatedFields = caregiverFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '表单验证失败，请检查输入',
    };
  }

  const { dob, ...restValidated } = validatedFields.data;

  try {
    const prismaUpdateData: Prisma.CaregiverUpdateInput = {
      ...restValidated,
      // Ensure correct mapping
      birthDate: dob ? new Date(dob) : null,
      
      // JSON Storage Fields
      jobTypes: JSON.stringify(restValidated.jobTypes || []),
      specialties: JSON.stringify(restValidated.specialties || []),
      certificates: JSON.stringify(restValidated.certificates || []),
      languages: JSON.stringify(restValidated.languages || []),
      cookingSkills: JSON.stringify(restValidated.cookingSkills || []),
      healthCertImages: JSON.stringify(restValidated.healthCertImages || []),
      lifeImages: JSON.stringify(restValidated.lifeImages || []),
    };

    const updatedCaregiver = await db.caregiver.update({
      where: { idString: id },
      data: prismaUpdateData,
    });

    revalidatePath('/caregivers');
    revalidatePath(`/caregivers/${id}`);
    return {
      success: true,
      message: '护理员更新成功',
      data: { idString: updatedCaregiver.idString },
    };
  } catch (error) {
    console.error('Failed to update caregiver:', error);
    return { success: false, message: '更新失败，请稍后重试' };
  }
}

export interface GetCaregiversParams {
  page?: number;
  pageSize?: number;
  query?: string;
  minAge?: number;
  maxAge?: number;
  nativePlace?: string;
  gender?: string;
  liveInStatus?: string;
  education?: string[];
  jobTypes?: string[];
  jobTypeMode?: 'AND' | 'OR';
  specialties?: string[];
  specialtyMode?: 'AND' | 'OR';
  certificates?: string[];
  certificateMode?: 'AND' | 'OR';
  cookingSkills?: string[];
  cookingSkillMode?: 'AND' | 'OR';
  minExperience?: number;
  maxExperience?: number;
  isTrainee?: boolean;
  status?: string;
  includeBusy?: boolean;
}

export async function getCaregivers(params: GetCaregiversParams = {}) {
  await requireAdminSession();
  const {
    page = 1,
    pageSize = 9,
    query = '',
    minAge,
    maxAge,
    nativePlace,
    gender,
    liveInStatus,
    education,
    jobTypes,
    jobTypeMode = 'OR',
    specialties,
    specialtyMode = 'OR',
    certificates,
    certificateMode = 'OR',
    cookingSkills,
    cookingSkillMode = 'OR',
    minExperience,
    maxExperience,
    isTrainee,
    status,
  } = params;

  try {
    const skip = (page - 1) * pageSize;

    // --- 1. Busy Caregiver Identification (Anti-Collision) ---
    // Simplified for now: just exclude confirmed orders overlapping today if needed, 
    // but usually handled by order-based search.
    // --- 2. Build Prisma Where Clause ---
    const where: Prisma.CaregiverWhereInput = {
      AND: [],
    };

    const andConditions = where.AND as Prisma.CaregiverWhereInput[];

    if (query) {
      andConditions.push({
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { idCardNumber: { contains: query } },
          { workerId: { contains: query } },
        ],
      });
    }

    if (nativePlace) andConditions.push({ nativePlace: { equals: nativePlace } });
    if (gender) andConditions.push({ gender: { equals: gender } });
    if (liveInStatus) andConditions.push({ isLiveIn: { equals: liveInStatus } });
    if (status) andConditions.push({ status: { equals: status } });
    if (isTrainee !== undefined) andConditions.push({ isTrainee: { equals: isTrainee } });

    if (education && education.length > 0) {
      andConditions.push({ education: { in: education } });
    }

    // Age Range
    const now = new Date();
    if (minAge !== undefined) {
      const maxDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
      andConditions.push({ birthDate: { lte: maxDate } });
    }
    if (maxAge !== undefined) {
      const minDate = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
      andConditions.push({ birthDate: { gte: minDate } });
    }

    // Experience Range
    if (minExperience !== undefined) andConditions.push({ experienceYears: { gte: minExperience } });
    if (maxExperience !== undefined) andConditions.push({ experienceYears: { lte: maxExperience } });

    // Helper for JSON array filtering (AND/OR)
    const addJsonFilter = (field: CaregiverJsonArrayField, items: string[] | undefined, mode: 'AND' | 'OR') => {
      if (!items || items.length === 0) return;
      if (mode === 'OR') {
        andConditions.push({
          OR: items.map((t) => buildJsonContainsCondition(field, t)),
        });
      } else {
        items.forEach((t) => {
          andConditions.push(buildJsonContainsCondition(field, t));
        });
      }
    };

    addJsonFilter('jobTypes', jobTypes, jobTypeMode);
    addJsonFilter('specialties', specialties, specialtyMode);
    addJsonFilter('certificates', certificates, certificateMode);
    addJsonFilter('cookingSkills', cookingSkills, cookingSkillMode);

    // --- 3. Execute Query ---
    const [total, caregivers] = await Promise.all([
      db.caregiver.count({ where }),
      db.caregiver.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // --- 4. Data Transformation ---
    const data: CaregiverListItem[] = caregivers.map((caregiver) => {
      let age = 0;
      if (caregiver.birthDate) {
        const diff = Date.now() - new Date(caregiver.birthDate).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      return {
        id: caregiver.idString,
        workerId: caregiver.workerId,
        fullName: caregiver.name,
        phone: caregiver.phone,
        gender: caregiver.gender,
        age: age,
        dob: caregiver.birthDate,
        nativePlace: caregiver.nativePlace,
        education: caregiver.education,
        height: caregiver.height,
        weight: caregiver.weight,
        experienceYears: caregiver.experienceYears,
        isTrainee: caregiver.isTrainee,
        monthlySalary: caregiver.monthlySalary ? Number(caregiver.monthlySalary) : null,
        jobTypes: parseStringArray(caregiver.jobTypes),
        specialties: parseStringArray(caregiver.specialties),
        certificates: parseStringArray(caregiver.certificates),
        cookingSkills: parseStringArray(caregiver.cookingSkills),
        languages: parseStringArray(caregiver.languages),
        status: caregiver.status,
        avatarUrl: caregiver.avatarUrl,
        liveInStatus: caregiver.isLiveIn,
        currentResidence: caregiver.currentResidence,
        residenceDetail: caregiver.residenceDetail,
        idCardNumber: caregiver.idCardNumber ?? '',
        notes: caregiver.notes,
        customData: parseCustomDataObject(caregiver.customData),
      };
    });

    return {
      success: true,
      data,
      pagination: {
        current: page,
        pageSize,
        total,
        totalPages,
      },
    };
  } catch (error) {
    console.error('Failed to fetch caregivers:', error);
    return {
      success: false,
      data: [],
      pagination: { current: 1, pageSize: 9, total: 0, totalPages: 0 },
    };
  }
}

export interface CaregiverOption {
  idString: string;
  workerId: string;
  name: string;
  phone: string;
  status: string;
  monthlySalary: number | null;
}

export async function getCaregiverOptions(): Promise<CaregiverOption[]> {
  await requireAdminSession();
  const caregivers = await db.caregiver.findMany({
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    select: {
      idString: true,
      workerId: true,
      name: true,
      phone: true,
      status: true,
      monthlySalary: true,
    },
  });

  return caregivers.map((item) => ({
    ...item,
    monthlySalary: item.monthlySalary ? Number(item.monthlySalary) : null,
  }));
}

export async function getCaregiver(id: string): Promise<CaregiverDetailData | null> {
  try {
    await requireAdminSession();
    const caregiver = await db.caregiver.findUnique({
      where: { idString: id },
    });

    if (!caregiver) return null;

    return {
      ...caregiver,
      dob: caregiver.birthDate,
      specialties: parseStringArray(caregiver.specialties),
      jobTypes: parseStringArray(caregiver.jobTypes),
      cookingSkills: parseStringArray(caregiver.cookingSkills),
      languages: parseStringArray(caregiver.languages),
      certificates: parseStringArray(caregiver.certificates),
      healthCertImages: parseStringArray(caregiver.healthCertImages),
      lifeImages: parseStringArray(caregiver.lifeImages),
      customData: parseCustomDataObject(caregiver.customData),
    };
  } catch (error) {
    console.error('Failed to fetch caregiver:', error);
    return null;
  }
}

export async function deleteCaregiver(id: string): Promise<ActionState> {
  try {
    await requireAdminSession();
    await db.$transaction(async (tx) => {
      // 中文说明：护理员可能已经关联订单、结算单与时间线。
      // 其中时间线表已配置 onDelete: Cascade，但订单与结算单没有，
      // 因此这里显式先删子表，再删主表，避免外键约束导致删除失败。
      await tx.salarySettlement.deleteMany({
        where: { caregiverId: id },
      });

      await tx.order.deleteMany({
        where: { caregiverId: id },
      });

      await tx.caregiver.delete({
        where: { idString: id },
      });
    });

    revalidatePath('/caregivers');
    revalidatePath('/orders');
    revalidatePath('/salary-settlement');
    return { success: true, message: '护理员删除成功' };
  } catch (error) {
    console.error('Failed to delete caregiver:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return { success: false, message: `删除失败：${error.code}` };
    }

    return { success: false, message: '删除失败，请稍后重试' };
  }
}
