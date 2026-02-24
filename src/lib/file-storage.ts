import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端
// 确保使用现有的环境变量配置初始化客户端 (Client Initialization)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// 可以优先使用匿名密钥，如果在服务器端需要权限操作可配置 service role key
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function saveFile(file: File, folder: string): Promise<string> {
  // 提取文件 buffer (Extract file buffer)
  const arrayBuffer = await file.arrayBuffer();
  
  // 生成唯一文件名，结合当前时间戳与原文件名并移除非法字符
  // Generate a unique file name (e.g., using Date.now() + original name)
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  
  // 构建在云端存储的路径。通过 folder 将上传的文件进行结构化归类
  // Path within the storage bucket
  const filePath = `${folder}/${filename}`;

  // 核心上传逻辑：利用 @supabase/supabase-js 直接将文件上传至名为 'caregivers' 的存储桶中
  // Utilize @supabase/supabase-js to upload the file buffer directly to a Supabase Storage bucket named `caregivers`
  const { error } = await supabase.storage
    .from('caregivers')
    .upload(filePath, arrayBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false // 不覆盖已存在的文件
    });

  if (error) {
    console.error('上传图片至 Supabase 云存储失败 (Failed to upload to Supabase Storage):', error.message);
    throw new Error('Failed to upload image to Supabase');
  }

  // 通过 getPublicUrl 生成并返回可供公共访问的图片 URL
  // Return the public URL of the uploaded image
  const { data } = supabase.storage
    .from('caregivers')
    .getPublicUrl(filePath);

  return data.publicUrl;
}
