'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';
import { caregiverFormSchema, type CaregiverFormValues } from './schema';
import { type ActionState } from './types';
import { Prisma } from '@prisma/client';

export async function createCaregiver(
  data: CaregiverFormValues
): Promise<ActionState> {
  const validatedFields = caregiverFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '表单验证失败，请检查输入',
    };
  }

  const { specialties, cookingSkills, languages, ...otherData } = validatedFields.data;

  try {
    await db.caregiver.create({
      data: {
        ...otherData,
        specialties: JSON.stringify(specialties),
        cookingSkills: JSON.stringify(cookingSkills),
        languages: JSON.stringify(languages),
        // 默认状态，如果在 Schema 中没有定义，可以在这里指定
        status: 'PENDING', 
        level: 'TRAINEE',
      },
    });

    revalidatePath('/caregivers');

    return {
      success: true,
      message: '护理员创建成功',
    };
  } catch (error) {
    console.error('Failed to create caregiver:', error);

    // 处理 Prisma 唯一约束冲突 (例如 workerId 重复)
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
}

export async function updateCaregiver(
  id: string,
  data: CaregiverFormValues
): Promise<ActionState> {
  const validatedFields = caregiverFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      message: '表单验证失败，请检查输入',
    };
  }

  const { specialties, cookingSkills, languages, ...otherData } = validatedFields.data;

  try {
    await db.caregiver.update({
      where: { idString: id },
      data: {
        ...otherData,
        specialties: JSON.stringify(specialties),
        cookingSkills: JSON.stringify(cookingSkills),
        languages: JSON.stringify(languages),
      },
    });

    revalidatePath('/caregivers');
    revalidatePath(`/caregivers/${id}`);

    return {
      success: true,
      message: '护理员信息更新成功',
    };
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
      const safeParse = (jsonString: string | null) => {
        if (!jsonString) return [];
        try {
          return JSON.parse(jsonString) as string[];
        } catch (e) {
          console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
          return [];
        }
      };

      return {
        ...caregiver,
        specialties: safeParse(caregiver.specialties),
        cookingSkills: safeParse(caregiver.cookingSkills),
        languages: safeParse(caregiver.languages),
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
    const safeParse = (jsonString: string | null) => {
      if (!jsonString) return [];
      try {
        return JSON.parse(jsonString) as string[];
      } catch (e) {
        console.error(`Failed to parse JSON for caregiver ${caregiver.idString}:`, e);
        return [];
      }
    };

    return {
      ...caregiver,
      specialties: safeParse(caregiver.specialties),
      cookingSkills: safeParse(caregiver.cookingSkills),
      languages: safeParse(caregiver.languages),
    };
  } catch (error) {
    console.error('Failed to fetch caregiver:', error);
    return null;
  }
}