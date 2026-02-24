import { createClient } from '@supabase/supabase-js';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

// 初始化 Supabase 客户端 (Initialize Supabase client)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveLocalFile(
  file: File,
  folder: string = 'uploads'
): Promise<string | null> {
  try {
    if (!file || file.size === 0) {
      return null;
    }

    // 获取文件 buffer (Extract file buffer)
    const arrayBuffer = await file.arrayBuffer();

    // 生成唯一文件名 (Generate unique filename)
    const ext = extname(file.name) || '.jpg'; 
    const filename = `${randomUUID()}${ext}`;
    
    // 构建在云端存储的路径 (Path within the storage bucket)
    const filePath = `${folder}/${filename}`;

    // 利用 @supabase/supabase-js 直接将文件上传至名为 'caregivers' 的云存储桶
    // Upload the file buffer directly to a Supabase Storage bucket named `caregivers`
    const { error } = await supabase.storage
      .from('caregivers')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false // 不覆盖已存在的文件
      });

    if (error) {
      console.error('上传图片至 Supabase 失败 (Error saving file to Supabase):', error);
      return null;
    }

    // 通过 getPublicUrl 生成并返回公共网络访问 URL
    // Return the public URL of the uploaded image
    const { data } = supabase.storage
      .from('caregivers')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('上传图片至 Supabase 发生异常 (Exception saving file to Supabase):', error);
    return null;
  }
}
