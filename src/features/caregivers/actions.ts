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
  rawData.specialties = parseJsonEntry(formData.get('specialties'), []);
  rawData.cookingSkills = parseJsonEntry(formData.get('cookingSkills'), []);
  rawData.languages = parseJsonEntry(formData.get('languages'), []);
  rawData.metadata = parseJsonEntry(formData.get('metadata'), {});

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
    await db.caregiver.create({
      data: {
        ...otherData,
        specialties: JSON.stringify(specialties),
        cookingSkills: JSON.stringify(cookingSkills),
        languages: JSON.stringify(languages),
        metadata: metadata ? JSON.stringify(metadata) : null,
        status: 'PENDING', 
        level: 'TRAINEE',
      },
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
    await db.caregiver.update({
      where: { idString: id },
      data: {
        ...otherData,
        specialties: JSON.stringify(specialties),
        cookingSkills: JSON.stringify(cookingSkills),
        languages: JSON.stringify(languages),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
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

export async function getCaregivers() {
  try {
    const caregivers = await db.caregiver.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return caregivers.map((caregiver) => {
      // Helper to safely parse JSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeParse = <T = string[]>(jsonString: string | null, defaultValue: T): T => {
        if (!jsonString) return defaultValue;
        try {
          return JSON.parse(jsonString) as T;
        } catch (e) {
          console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
          return defaultValue;
        }
      };

      return {
        ...caregiver,
        specialties: safeParse<string[]>(caregiver.specialties, []),
        cookingSkills: safeParse<string[]>(caregiver.cookingSkills, []),
        languages: safeParse<string[]>(caregiver.languages, []),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: safeParse<any>(caregiver.metadata, {}),
      };
    });
  } catch (error) {
    console.error('Failed to fetch caregivers:', error);
    return [];
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

    // Helper to safely parse JSON
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeParse = <T = string[]>(jsonString: string | null, defaultValue: T): T => {
      if (!jsonString) return defaultValue;
      try {
        return JSON.parse(jsonString) as T;
      } catch (e) {
        console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
        return defaultValue;
      }
    };

    return {
      ...caregiver,
      specialties: safeParse<string[]>(caregiver.specialties, []),
      cookingSkills: safeParse<string[]>(caregiver.cookingSkills, []),
      languages: safeParse<string[]>(caregiver.languages, []),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: safeParse<any>(caregiver.metadata, {}),
    };
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