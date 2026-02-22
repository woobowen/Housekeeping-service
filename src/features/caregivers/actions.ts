'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/prisma';
import { caregiverFormSchema, type CaregiverFormValues } from './schema';
import { type ActionState } from './types';
import { Prisma } from '@prisma/client';
import { saveFile } from '@/lib/file-storage';

// Helper: Parse potential JSON strings from FormData
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// Helper: Process FormData into Schema-ready object
async function processFormData(formData: FormData): Promise<Partial<CaregiverFormValues>> {
  const rawData: Record<string, any> = {};

  // 1. Extract Single Files & Upload
  const singleFileKeys = ['avatarUrl', 'idCardFrontUrl', 'idCardBackUrl'];
  for (const key of singleFileKeys) {
    // Check for direct file in the key or in a "File" suffixed key (e.g. avatarFile)
    const file = formData.get(key);
    const fileAlt = formData.get(key.replace('Url', 'File'));
    
    const targetFile = (file instanceof File && file.size > 0) ? file : 
                       (fileAlt instanceof File && fileAlt.size > 0) ? fileAlt : null;

    if (targetFile) {
      const url = await saveFile(targetFile, 'caregivers');
      if (url) rawData[key] = url;
    } else if (typeof file === 'string' && file.length > 0) {
      rawData[key] = file;
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
    const newFiles = formData.getAll(fileKey);
    
    const uploadedUrls: string[] = [];
    for (const file of newFiles) {
      if (file instanceof File && file.size > 0) {
        const url = await saveFile(file, 'caregivers');
        if (url) uploadedUrls.push(url);
      }
    }
    
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

  return rawData;
}

export async function createCaregiver(
  prevState: any,
  formData: FormData
): Promise<ActionState> {
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

    await db.caregiver.create({
      data: prismaData,
    });

    revalidatePath('/caregivers');
    return { success: true, message: '护理员创建成功' };
  } catch (error) {
    console.error('Failed to create caregiver:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, message: '该手机号或身份证号已存在' };
    }
    return { success: false, message: '创建护理员失败，请稍后重试' };
  }
}

export async function updateCaregiver(
  prevState: any,
  formData: FormData
): Promise<ActionState> {
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

    await db.caregiver.update({
      where: { idString: id },
      data: prismaUpdateData,
    });

    revalidatePath('/caregivers');
    revalidatePath(`/caregivers/${id}`);
    return { success: true, message: '护理员更新成功' };
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
    includeBusy = false,
  } = params;

  try {
    const skip = (page - 1) * pageSize;

    // --- 1. Busy Caregiver Identification (Anti-Collision) ---
    // Simplified for now: just exclude confirmed orders overlapping today if needed, 
    // but usually handled by order-based search.
    const busyCaregiverIds = new Set<string>();
    // ... logic for busy caregivers if search dates provided ...

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
    const addJsonFilter = (field: keyof Prisma.CaregiverWhereInput, items: string[] | undefined, mode: 'AND' | 'OR') => {
      if (!items || items.length === 0) return;
      if (mode === 'OR') {
        andConditions.push({
          OR: items.map((t) => ({ [field]: { contains: t } })),
        } as any);
      } else {
        items.forEach((t) => {
          andConditions.push({ [field]: { contains: t } } as any);
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
    const parseArray = (val: string | null) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return []; }
    };

    const data = caregivers.map((caregiver) => {
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
        jobTypes: parseArray(caregiver.jobTypes),
        specialties: parseArray(caregiver.specialties),
        certificates: parseArray(caregiver.certificates),
        cookingSkills: parseArray(caregiver.cookingSkills),
        languages: parseArray(caregiver.languages),
        status: caregiver.status,
        avatarUrl: caregiver.avatarUrl,
        liveInStatus: caregiver.isLiveIn,
        currentResidence: caregiver.currentResidence,
        residenceDetail: caregiver.residenceDetail,
        idCardNumber: caregiver.idCardNumber,
        notes: caregiver.notes,
        customData: caregiver.customData ? JSON.parse(caregiver.customData) : {},
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

export async function getCaregiver(id: string) {
  try {
    const caregiver = await db.caregiver.findUnique({
      where: { idString: id },
    });

    if (!caregiver) return null;

    const parseArray = (val: any) => {
      if (!val) return [];
      try { return typeof val === 'string' ? JSON.parse(val) : val; } catch { return []; }
    };

    return {
      ...caregiver,
      dob: caregiver.birthDate,
      specialties: parseArray(caregiver.specialties),
      jobTypes: parseArray(caregiver.jobTypes),
      cookingSkills: parseArray(caregiver.cookingSkills),
      languages: parseArray(caregiver.languages),
      certificates: parseArray(caregiver.certificates),
      healthCertImages: parseArray(caregiver.healthCertImages),
      lifeImages: parseArray(caregiver.lifeImages),
      customData: caregiver.customData,
    };
  } catch (error) {
    console.error('Failed to fetch caregiver:', error);
    return null;
  }
}

export async function deleteCaregiver(id: string): Promise<ActionState> {
  try {
    await db.caregiver.delete({ where: { idString: id } });
    revalidatePath('/caregivers');
    return { success: true, message: '护理员删除成功' };
  } catch (error) {
    console.error('Failed to delete caregiver:', error);
    return { success: false, message: '删除失败，请稍后重试' };
  }
}