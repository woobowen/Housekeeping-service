'use server';

import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/session';

export type FieldDefinitionDTO = {
  targetModel: string;
  name: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  order?: number;
};

const fieldDefinitionSchema = z.object({
  targetModel: z.enum(['Caregiver', 'Order']),
  name: z.string().trim().min(1, '字段 key 不能为空').max(50, '字段 key 过长').regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '字段 key 只能使用字母、数字和下划线'),
  label: z.string().trim().min(1, '字段名称不能为空').max(50, '字段名称过长'),
  type: z.enum(['TEXT', 'NUMBER', 'SELECT', 'DATE', 'BOOLEAN']),
  options: z.array(z.string().trim().min(1).max(50)).optional(),
  required: z.boolean().optional(),
  order: z.number().int().min(0).max(9999).optional(),
});

export async function addField(data: FieldDefinitionDTO) {
  try {
    await requireAdminSession();
    const parsed = fieldDefinitionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message || '字段配置不合法' };
    }

    // Check if name exists for this model
    const existing = await db.systemFieldDefinition.findUnique({
      where: {
        targetModel_name: {
          targetModel: parsed.data.targetModel,
          name: parsed.data.name,
        },
      },
    });

    if (existing) {
      return { success: false, message: 'Field key already exists for this model' };
    }

    await db.systemFieldDefinition.create({
      data: {
        targetModel: parsed.data.targetModel,
        name: parsed.data.name,
        label: parsed.data.label,
        type: parsed.data.type,
        options: parsed.data.options ? JSON.stringify(parsed.data.options) : undefined,
        required: parsed.data.required || false,
        order: parsed.data.order || 0,
      },
    });

    revalidatePath(`/settings/fields`); 
    return { success: true };
  } catch (error) {
    console.error('Failed to add field:', error);
    return { success: false, message: 'Failed to add field' };
  }
}

export async function deleteField(id: string) {
  try {
    await requireAdminSession();
    await db.systemFieldDefinition.delete({
      where: { id },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to delete field:', error);
    return { success: false, message: 'Failed to delete field' };
  }
}

export async function getFields(targetModel: string) {
  try {
    await requireAdminSession();
    const fields = await db.systemFieldDefinition.findMany({
      where: { targetModel },
      orderBy: { order: 'asc' },
    });

    return fields.map(f => ({
      ...f,
      options: f.options ? JSON.parse(f.options) : [],
    }));
  } catch (error) {
    console.error('Failed to get fields:', error);
    return [];
  }
}
