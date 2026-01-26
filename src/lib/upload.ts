import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function saveLocalFile(
  file: File,
  folder: string = 'uploads'
): Promise<string | null> {
  try {
    if (!file || file.size === 0) {
      return null;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), 'public', folder);

    // Ensure directory exists
    await mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    // Sanitize extension or fallback
    const ext = extname(file.name) || '.jpg'; 
    const filename = `${randomUUID()}${ext}`;
    const filePath = join(uploadDir, filename);

    // Write file
    await writeFile(filePath, buffer);

    // Return web path
    return `/${folder}/${filename}`;
  } catch (error) {
    console.error('Error saving local file:', error);
    return null;
  }
}
