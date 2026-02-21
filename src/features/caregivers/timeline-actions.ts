'use server';

import { db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { saveFile } from '@/lib/file-storage';

export async function addTimelineItem(prevState: any, formData: FormData) {
  const caregiverId = formData.get('caregiverId') as string;
  const content = formData.get('content') as string;
  
  if (!caregiverId || !content) {
    return { success: false, message: 'Missing required fields' };
  }

  try {
    const files = formData.getAll('images') as File[];
    const imageUrls: string[] = [];

    for (const file of files) {
      if (file.size > 0 && file.name) {
        const url = await saveFile(file, 'timeline');
        imageUrls.push(url);
      }
    }

    await db.caregiverTimeline.create({
      data: {
        caregiverId,
        content,
        imageUrls: JSON.stringify(imageUrls),
      },
    });

    revalidatePath(`/caregivers/${caregiverId}`);
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
    const items = await db.caregiverTimeline.findMany({
      where: { caregiverId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((item) => {
      let imageUrls: string[] = [];
      try {
        imageUrls = JSON.parse(item.imageUrls || '[]');
        if (!Array.isArray(imageUrls)) imageUrls = [];
      } catch (e) {
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