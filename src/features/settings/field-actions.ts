'use server';

import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export type FieldDefinitionDTO = {
  targetModel: string;
  name: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  order?: number;
};

export async function addField(data: FieldDefinitionDTO) {
  try {
    // Basic validation
    if (!data.targetModel || !data.name || !data.label || !data.type) {
      return { success: false, message: 'Missing required fields' };
    }

    // Check if name exists for this model
    const existing = await db.systemFieldDefinition.findUnique({
      where: {
        targetModel_name: {
          targetModel: data.targetModel,
          name: data.name,
        },
      },
    });

    if (existing) {
      return { success: false, message: 'Field key already exists for this model' };
    }

    await db.systemFieldDefinition.create({
      data: {
        targetModel: data.targetModel,
        name: data.name,
        label: data.label,
        type: data.type,
        options: data.options ? JSON.stringify(data.options) : undefined,
        required: data.required || false,
        order: data.order || 0,
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
