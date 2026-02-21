import fs from 'fs/promises';
import path from 'path';

export async function saveFile(file: File, folder: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Create unique filename
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  
  // Write file
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  
  // Return public URL
  return `/uploads/${folder}/${filename}`;
}
