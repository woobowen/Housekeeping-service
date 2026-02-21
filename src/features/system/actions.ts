'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';

const GLOBAL_CONFIG_KEY = 'caregiver_metadata';

export interface FieldDefinition {
  name: string; // The key used in code/JSON
  label: string; // The display label
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[]; // For select type
  required?: boolean;
}

export interface SectionConfig {
  basic_info: FieldDefinition[];
  skills: FieldDefinition[];
  // Allow for potentially more sections in future, but typings focus on these for now
  [key: string]: FieldDefinition[]; 
}

export interface GlobalFieldConfig {
  sections: SectionConfig;
}

const DEFAULT_CONFIG: GlobalFieldConfig = {
  sections: {
    basic_info: [],
    skills: [],
  },
};

/**
 * Fetches the global field configuration for Caregivers.
 * If not found, returns the default structure.
 */
export async function getGlobalFieldConfig(): Promise<GlobalFieldConfig> {
  try {
    const setting = await db.systemSettings.findUnique({
      where: { key: GLOBAL_CONFIG_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_CONFIG;
    }

    try {
      // Ensure specific keys exist even if JSON is partial
      const parsed = JSON.parse(setting.value);
      return {
        sections: {
          basic_info: parsed.sections?.basic_info || [],
          skills: parsed.sections?.skills || [],
          ...parsed.sections
        }
      };
    } catch (e) {
      console.error('Failed to parse global field config JSON:', e);
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    console.error('Database error fetching global field config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Adds a new field definition to a specific section in the global configuration.
 */
export async function addGlobalField(
  section: string,
  fieldDef: FieldDefinition
) {
  try {
    const currentConfig = await getGlobalFieldConfig();

    if (!currentConfig.sections[section]) {
      currentConfig.sections[section] = [];
    }

    // Check for duplicates
    const exists = currentConfig.sections[section].some(
      (f) => f.name === fieldDef.name
    );

    if (exists) {
      return { success: false, message: `Field key "${fieldDef.name}" already exists in this section.` };
    }

    currentConfig.sections[section].push(fieldDef);

    await db.systemSettings.upsert({
      where: { key: GLOBAL_CONFIG_KEY },
      update: {
        value: JSON.stringify(currentConfig),
        updatedAt: new Date(),
      },
      create: {
        key: GLOBAL_CONFIG_KEY,
        value: JSON.stringify(currentConfig),
        description: 'Global configuration for Caregiver dynamic fields',
      },
    });

    revalidatePath('/settings/fields');
    revalidatePath('/caregivers'); 
    return { success: true, message: 'Field added successfully.' };
  } catch (error) {
    console.error('Failed to add global field:', error);
    return { success: false, message: 'Internal server error.' };
  }
}

/**
 * Updates an existing field definition in a specific section.
 */
export async function updateGlobalField(
  section: string,
  key: string,
  newData: FieldDefinition
) {
  try {
    const currentConfig = await getGlobalFieldConfig();

    if (!currentConfig.sections[section]) {
      return { success: false, message: 'Section not found.' };
    }

    const fieldIndex = currentConfig.sections[section].findIndex(
      (f) => f.name === key
    );

    if (fieldIndex === -1) {
      return { success: false, message: 'Field to update not found.' };
    }

    // Update the field at the found index
    // We keep the original 'name' (key) unless the intention is to rename, 
    // but the requirement says key is read-only in UI. 
    // newData should ideally carry the same name, or we force it here.
    currentConfig.sections[section][fieldIndex] = {
      ...newData,
      name: key, // Ensure key immutability from this action's perspective
    };

    await db.systemSettings.upsert({
      where: { key: GLOBAL_CONFIG_KEY },
      update: {
        value: JSON.stringify(currentConfig),
        updatedAt: new Date(),
      },
      create: {
        key: GLOBAL_CONFIG_KEY,
        value: JSON.stringify(currentConfig),
        description: 'Global configuration for Caregiver dynamic fields',
      },
    });

    revalidatePath('/settings/fields');
    revalidatePath('/caregivers');
    return { success: true, message: 'Field updated successfully.' };
  } catch (error) {
    console.error('Failed to update global field:', error);
    return { success: false, message: 'Internal server error.' };
  }
}

/**
 * Removes a field definition from a specific section.
 */
export async function removeGlobalField(
  section: string,
  fieldName: string
) {
  try {
    const currentConfig = await getGlobalFieldConfig();

    if (!currentConfig.sections[section]) {
      return { success: false, message: 'Section not found.' };
    }

    const initialLength = currentConfig.sections[section].length;
    currentConfig.sections[section] = currentConfig.sections[section].filter(
      (f) => f.name !== fieldName
    );

    if (currentConfig.sections[section].length === initialLength) {
      return { success: false, message: 'Field not found.' };
    }

    await db.systemSettings.upsert({
      where: { key: GLOBAL_CONFIG_KEY },
      update: {
        value: JSON.stringify(currentConfig),
        updatedAt: new Date(),
      },
      create: {
        key: GLOBAL_CONFIG_KEY,
        value: JSON.stringify(currentConfig),
        description: 'Global configuration for Caregiver dynamic fields',
      },
    });

    revalidatePath('/settings/fields');
    revalidatePath('/caregivers');
    return { success: true, message: 'Field removed successfully.' };
  } catch (error) {
    console.error('Failed to remove global field:', error);
    return { success: false, message: 'Internal server error.' };
  }
}
