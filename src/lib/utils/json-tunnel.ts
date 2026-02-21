/**
 * JSON Tunnel Utility for MSSQL
 * Standardizes the way we store dynamic fields in a single JSON column (customData)
 * due to MSSQL's lack of scalar array and flexible schema support in Prisma.
 */

/**
 * Separates core schema fields from dynamic fields and serializes the latter.
 * 
 * @param allFields - The complete flat object from form/request
 * @param coreSchemaKeys - Array of field names that exist as actual columns in the database
 * @returns An object containing coreData (mapped fields) and customDataString (serialized JSON)
 */
export function serializeCustomData<T extends Record<string, any>>(
  allFields: T,
  coreSchemaKeys: string[]
) {
  const coreData: Record<string, any> = {};
  const customData: Record<string, any> = {};

  Object.entries(allFields).forEach(([key, value]) => {
    if (coreSchemaKeys.includes(key)) {
      coreData[key] = value;
    } else {
      // Any field not in the core schema is funneled into customData
      customData[key] = value;
    }
  });

  return {
    coreData,
    customDataString: Object.keys(customData).length > 0 ? JSON.stringify(customData) : null,
  };
}

/**
 * Safely parses a JSON string from a database column into a typed object.
 * 
 * @param jsonString - The JSON string from the database (e.g., caregiver.customData)
 * @returns The parsed object or an empty object if null/invalid
 */
export function deserializeCustomData<T = Record<string, any>>(
  jsonString: string | null | undefined
): T {
  if (!jsonString) {
    return {} as T;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[JSON-TUNNEL] Failed to deserialize customData:', error);
    return {} as T;
  }
}
