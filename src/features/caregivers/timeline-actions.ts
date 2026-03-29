'use server';

import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { saveFile } from '@/lib/file-storage';
import { z } from 'zod';
import { requireAdminSession } from '@/lib/auth/session';

const timelineSchema = z.object({
  caregiverId: z.string().trim().min(1, '护理员 ID 不能为空'),
  content: z.string().trim().min(1, '时间线内容不能为空').max(5000, '时间线内容过长'),
});

export async function addTimelineItem(_prevState: unknown, formData: FormData) {
  await requireAdminSession();
  const parsed = timelineSchema.safeParse({
    caregiverId: formData.get('caregiverId'),
    content: formData.get('content'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message || '时间线参数不合法' };
  }

  try {
    const caregiver = await db.caregiver.findUnique({
      where: { idString: parsed.data.caregiverId },
      select: { idString: true },
    });

    if (!caregiver) {
      return { success: false, message: '护理员不存在' };
    }

    const files: File[] = formData.getAll('images').filter((file): file is File => file instanceof File);
    const imageUrls: string[] = await Promise.all(
      files
        .filter((file: File) => file.size > 0 && file.name)
        .map((file: File) => saveFile(file, 'timeline')),
    );

    await db.caregiverTimeline.create({
      data: {
        caregiverId: parsed.data.caregiverId,
        content: parsed.data.content,
        imageUrls: JSON.stringify(imageUrls),
      },
    });

    revalidatePath(`/caregivers/${parsed.data.caregiverId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add timeline item:', error);
    return { success: false, message: 'Failed to add timeline item' };
  }
}

export type TimelineItem = {
  idString: string;
  content: string;
  imageUrls: string[];
  createdAt: Date;
  caregiverId: string;
};

export async function getTimelineItems(caregiverId: string): Promise<TimelineItem[]> {
  try {
    await requireAdminSession();
    const items = await db.caregiverTimeline.findMany({
      where: { caregiverId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => {
      let imageUrls: string[] = [];
      try {
        imageUrls = JSON.parse(item.imageUrls || '[]');
        if (!Array.isArray(imageUrls)) imageUrls = [];
      } catch {
        imageUrls = [];
      }

      return {
        ...item,
        imageUrls,
      };
    });
  } catch (error) {
    console.error('Failed to fetch timeline items:', error);
    return [];
  }
}
