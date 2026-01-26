'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/prisma';
import { caregiverFormSchema, type CaregiverFormValues } from './schema';
import { type ActionState } from './types';
import { Prisma } from '@prisma/client';
import { saveLocalFile } from '@/lib/upload';

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

  // 1. Extract Files & Upload
  const avatarFile = formData.get('avatarFile');
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const url = await saveLocalFile(avatarFile, 'uploads');
    if (url) rawData.avatarUrl = url;
  }

  const idCardFrontFile = formData.get('idCardFrontFile');
  if (idCardFrontFile instanceof File && idCardFrontFile.size > 0) {
    const url = await saveLocalFile(idCardFrontFile, 'uploads');
    if (url) rawData.idCardFrontUrl = url;
  }

  const idCardBackFile = formData.get('idCardBackFile');
  if (idCardBackFile instanceof File && idCardBackFile.size > 0) {
    const url = await saveLocalFile(idCardBackFile, 'uploads');
    if (url) rawData.idCardBackUrl = url;
  }

  // 2. Parse Standard Fields
  // We iterate over keys expected by the schema or just grab them
  const simpleKeys = [
    'workerId', 'name', 'phone', 'idCardNumber', 'nativePlace', 
    'notes', 'gender', 'education', 'workExpLevel', 'isLiveIn',
    // Fallback URL fields (if string provided and no new file)
    'avatarUrl', 'idCardFrontUrl', 'idCardBackUrl'
  ];

  for (const key of simpleKeys) {
    const value = formData.get(key);
    if (value && typeof value === 'string' && !rawData[key]) {
      rawData[key] = value;
    }
  }
  
  // 3. Handle Date
  const dob = formData.get('dob');
  if (dob && typeof dob === 'string') {
    rawData.dob = dob; // Let Zod coerce it
  }

  // 4. Parse JSON Arrays/Objects
  const specialtiesValue = formData.get('specialties');
  if (specialtiesValue !== null) {
    rawData.specialties = parseJsonEntry(specialtiesValue, []);
  }

  const cookingSkillsValue = formData.get('cookingSkills');
  if (cookingSkillsValue !== null) {
    rawData.cookingSkills = parseJsonEntry(cookingSkillsValue, []);
  }

  const languagesValue = formData.get('languages');
  if (languagesValue !== null) {
    rawData.languages = parseJsonEntry(languagesValue, []);
  }

  const metadataValue = formData.get('metadata');
  if (metadataValue !== null) {
    rawData.metadata = parseJsonEntry(metadataValue, {});
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

  const { specialties, cookingSkills, languages, metadata, ...otherData } = validatedFields.data;

  try {
    const prismaData: Prisma.CaregiverCreateInput = {
      ...otherData,
      specialties: JSON.stringify(specialties || []),
      cookingSkills: JSON.stringify(cookingSkills || []),
      languages: JSON.stringify(languages || []),
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'PENDING', 
      level: 'TRAINEE',
    };

    await db.caregiver.create({
      data: prismaData,
    });

    revalidatePath('/caregivers');
  } catch (error) {
    console.error('Failed to create caregiver:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          message: '该手机号或身份证号已存在',
        };
      }
    }

    return {
      success: false,
      message: '创建护理员失败，请稍后重试',
    };
  }

  // Redirect outside try/catch
  return { success: true, message: '护理员创建成功' };
  // Note: Usually we redirect after create? 
  // The original code returned success message. 
  // Let's check original behavior... it returned success: true. 
  // The component handled the redirect via router.push.
  // We will keep it that way for create, OR change to redirect if the component expects it.
  // Original: return { success: true, message: '...' } -> component did router.push.
  // So we keep returning state. 
}

export async function updateCaregiver(
  prevState: any,
  formData: FormData
): Promise<ActionState> {
  // Extract ID from FormData
  const id = formData.get('idString') as string;
  
  if (!id) {
    return { success: false, message: 'Missing caregiver ID' };
  }

  // 1. Get base data with file handling from helper (keep this for files)
  const processedData = await processFormData(formData);
  
  // 2. Explicitly overwrite JSON fields by parsing raw FormData
  // This ensures that even if processFormData fails or logic changes, we get the data here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawData: any = { ...processedData };

  // Explicitly Parse JSON Fields
  const metadataRaw = formData.get('metadata');
  if (metadataRaw && typeof metadataRaw === 'string') {
    try {
      rawData.metadata = JSON.parse(metadataRaw);
    } catch (e) {
      console.error("Metadata parsing failed:", e);
    }
  }

  const specialtiesRaw = formData.get('specialties');
  if (specialtiesRaw && typeof specialtiesRaw === 'string') {
    try {
      rawData.specialties = JSON.parse(specialtiesRaw);
    } catch (e) {
      console.error("Specialties parsing failed:", e);
    }
  }

  const cookingSkillsRaw = formData.get('cookingSkills');
  if (cookingSkillsRaw && typeof cookingSkillsRaw === 'string') {
    try {
      rawData.cookingSkills = JSON.parse(cookingSkillsRaw);
    } catch (e) {
      console.error("CookingSkills parsing failed:", e);
    }
  }

  const languagesRaw = formData.get('languages');
  if (languagesRaw && typeof languagesRaw === 'string') {
    try {
      rawData.languages = JSON.parse(languagesRaw);
    } catch (e) {
      console.error("Languages parsing failed:", e);
    }
  }

  const validatedFields = caregiverFormSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '表单验证失败，请检查输入',
    };
  }

  const { specialties, cookingSkills, languages, metadata, ...otherData } = validatedFields.data;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...otherData,
    };

    if (specialties !== undefined) updateData.specialties = JSON.stringify(specialties);
    if (cookingSkills !== undefined) updateData.cookingSkills = JSON.stringify(cookingSkills);
    if (languages !== undefined) updateData.languages = JSON.stringify(languages);
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null;

    console.log('Update Data Payload:', updateData);

    await db.caregiver.update({
      where: { idString: id },
      data: updateData,
    });

    revalidatePath('/caregivers');
    revalidatePath(`/caregivers/${id}`);
  } catch (error) {
    console.error('Failed to update caregiver:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          message: '该手机号或身份证号已存在',
        };
      }
    }

    return {
      success: false,
      message: '更新失败，请稍后重试',
    };
  }

  redirect(`/caregivers/${id}`);
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
  education?: string;
  jobType?: string; // Comma separated
  jobTypeMode?: 'AND' | 'OR';
  certificate?: string; // Comma separated
  certificateMode?: 'AND' | 'OR';
  level?: string;
  minExperience?: string;
}

export async function getCaregivers({
  page = 1,
  pageSize = 10,
  query = '',
  minAge,
  maxAge,
  nativePlace,
  gender,
  liveInStatus,
  education,
  jobType,
  jobTypeMode = 'OR',
  certificate,
  certificateMode = 'OR',
  level,
  minExperience,
}: GetCaregiversParams = {}) {
  try {
    const skip = (page - 1) * pageSize;

    // Build Where Clause
    const where: Prisma.CaregiverWhereInput = {
      AND: [],
    };

    const andConditions = where.AND as Prisma.CaregiverWhereInput[];

    // 1. Basic Text Search (Name, Phone, ID)
    if (query) {
      andConditions.push({
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { idCardNumber: { contains: query } },
        ],
      });
    }

    // 2. Exact Match Filters
    if (nativePlace) andConditions.push({ nativePlace: { equals: nativePlace } });
    if (gender) andConditions.push({ gender: { equals: gender } });
    if (liveInStatus) andConditions.push({ liveInStatus: { equals: liveInStatus } });
    if (education) andConditions.push({ education: { equals: education } });
    if (level) andConditions.push({ level: { equals: level } });

    // 3. Age Filter (Calculated from BirthDate)
    const now = new Date();
    if (minAge !== undefined) {
      // Younger than max date: Born after (Now - minAge)
      const maxDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
      andConditions.push({ birthDate: { lte: maxDate } });
    }
    if (maxAge !== undefined) {
      // Older than min date: Born before (Now - maxAge)
      const minDate = new Date(now.getFullYear() - maxAge - 1, now.getMonth(), now.getDate());
      andConditions.push({ birthDate: { gte: minDate } });
    }

    // 4. Min Experience Filter
    if (minExperience) {
      const levels = ['ENTRY', 'INTERMEDIATE', 'SENIOR', 'EXPERT'];
      const minIndex = levels.indexOf(minExperience);
      if (minIndex !== -1) {
        const allowedLevels = levels.slice(minIndex);
        andConditions.push({ workExpLevel: { in: allowedLevels } });
      }
    }

    // 5. JSON Field Filters (String Contains) with AND/OR Logic
    if (jobType) {
      const jobTypes = jobType.split(',').filter(Boolean);
      if (jobTypes.length > 0) {
        if (jobTypeMode === 'OR') {
          andConditions.push({
            OR: jobTypes.map((t) => ({ jobTypes: { contains: t } })),
          });
        } else {
          // AND: Must contain ALL items
          jobTypes.forEach((t) => {
            andConditions.push({ jobTypes: { contains: t } });
          });
        }
      }
    }

    if (certificate) {
      const certs = certificate.split(',').filter(Boolean);
      if (certs.length > 0) {
        if (certificateMode === 'OR') {
          andConditions.push({
            OR: certs.map((c) => ({ certificates: { contains: c } })),
          });
        } else {
          // AND: Must contain ALL items
          certs.forEach((c) => {
            andConditions.push({ certificates: { contains: c } });
          });
        }
      }
    }

    // Execute Query
    const [total, caregivers] = await Promise.all([
      db.caregiver.count({ where }),
      db.caregiver.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          orders: {
            where: {
              status: 'CONFIRMED',
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
            select: { id: true }, // Optimization: only fetch ID
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Helper for safe JSON parsing
    const parseArray = (val: string | null) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return []; }
    };

    // Map Results
    const data = caregivers.map((caregiver) => {
      // Calculate Age
      let age = 0;
      if (caregiver.birthDate) {
        const diff = Date.now() - new Date(caregiver.birthDate).getTime();
        age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
      }

      // Dynamic Status Override
      const isBusy = caregiver.orders && caregiver.orders.length > 0;
      const displayStatus = isBusy ? '服务中' : caregiver.status;

      return {
        id: caregiver.idString,
        workerId: caregiver.workerId,
        fullName: caregiver.name,
        phone: caregiver.phone,
        gender: caregiver.gender,
        age: age,
        nativePlace: caregiver.nativePlace,
        education: caregiver.education,
        jobTypes: parseArray(caregiver.jobTypes),
        level: caregiver.level,
        salaryRequirements: caregiver.salaryRequirements,
        status: displayStatus,
        certificates: parseArray(caregiver.certificates),
        specialties: parseArray(caregiver.specialties),
        avatarUrl: caregiver.avatarUrl,
        liveInStatus: caregiver.liveInStatus,
        experienceLevel: caregiver.workExpLevel,
        yearsExperience: caregiver.workExpLevel, // Mapped for UI compatibility
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
      pagination: {
        current: page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export async function getCaregiver(id: string) {
  try {
    const caregiver = await db.caregiver.findUnique({
      where: {
        idString: id,
      },
    });

    if (!caregiver) return null;

    console.log('Raw DB Data for ID:', id, 'Metadata Type:', typeof caregiver?.metadata, 'Value:', caregiver?.metadata);

    // Robust Inline Parsing for Metadata
    let parsedMetadata = { rating: 0, internalNotes: '', customTags: [] };

    if (caregiver.metadata) {
      if (typeof caregiver.metadata === 'string') {
        try {
          const parsed = JSON.parse(caregiver.metadata);
          parsedMetadata = { ...parsedMetadata, ...parsed };
        } catch (e) {
          console.error('Metadata JSON Parse Error:', e);
        }
      } else if (typeof caregiver.metadata === 'object') {
        parsedMetadata = { ...parsedMetadata, ...(caregiver.metadata as any) };
      }
    }

    console.log('Final Parsed Metadata to Client:', parsedMetadata);

    // Helper for arrays (simple fallback)
    const parseArray = (val: any) => {
      if (!val) return [];
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    const result = {
      idString: caregiver.idString,
      workerId: caregiver.workerId,
      name: caregiver.name,
      phone: caregiver.phone,
      idCardNumber: caregiver.idCardNumber,
      dob: caregiver.dob,
      gender: caregiver.gender,
      nativePlace: caregiver.nativePlace,
      education: caregiver.education,
      workExpLevel: caregiver.workExpLevel,
      isLiveIn: caregiver.isLiveIn,
      avatarUrl: caregiver.avatarUrl,
      idCardFrontUrl: caregiver.idCardFrontUrl,
      idCardBackUrl: caregiver.idCardBackUrl,
      notes: caregiver.notes,
      status: caregiver.status,
      level: caregiver.level,
      createdAt: caregiver.createdAt,
      updatedAt: caregiver.updatedAt,
      
      // Explicitly parsed JSON fields
      specialties: parseArray(caregiver.specialties),
      cookingSkills: parseArray(caregiver.cookingSkills),
      languages: parseArray(caregiver.languages),
      // Serializing to string to bypass serialization stripping bugs
      metadataJson: JSON.stringify(parsedMetadata), 
    };

    console.log('Final Object Keys being sent:', Object.keys(result));
    console.log('Final MetadataJson Value:', result.metadataJson);

    return result;
  } catch (error) {
    console.error('Failed to fetch caregiver:', error);
    return null;
  }
}

export async function deleteCaregiver(id: string): Promise<ActionState> {
  try {
    await db.caregiver.delete({
      where: {
        idString: id,
      },
    });

    revalidatePath('/caregivers');
  } catch (error) {
    console.error('Failed to delete caregiver:', error);
    return {
      success: false,
      message: '删除护理员失败，请稍后重试',
    };
  }

  redirect('/caregivers');
}