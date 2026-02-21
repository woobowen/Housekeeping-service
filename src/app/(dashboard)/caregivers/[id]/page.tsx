import { notFound } from 'next/navigation';
import { getCaregiver } from '@/features/caregivers/actions';
import { getTimelineItems } from '@/features/caregivers/timeline-actions';
import { getGlobalFieldConfig } from '@/features/system/actions';
import { CaregiverDetail } from '@/features/caregivers/components/caregiver-detail';
import { TimelineSection } from '@/features/caregivers/components/timeline-section';
import { sanitizeData } from '@/lib/utils/serialization';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CaregiverDetailPage(props: PageProps) {
  const { id } = await props.params;
  const caregiver = await getCaregiver(id);
  const timelineItems = await getTimelineItems(id);
  const globalConfig = await getGlobalFieldConfig();

  if (!caregiver) {
    notFound();
  }

  // SERIALIZATION FIX: Use centralized utility to handle Decimals and other non-plain objects
  const serializedCaregiver = sanitizeData(caregiver);

  // Restore metadata object from JSON string for the UI component
  const caregiverWithMetadata = {
    ...serializedCaregiver,
    metadata: caregiver.metadataJson ? JSON.parse(caregiver.metadataJson) : {},
  };

  // Flatten sections for the detail view if needed, or pass as is
  // The user wants to iterate through the config and show values from customData.
  const dynamicFields = [
    ...(globalConfig.sections.basic_info || []),
    ...(globalConfig.sections.skills || []),
  ];

  return (
    <div className="p-6 space-y-8">
      <CaregiverDetail 
        data={caregiverWithMetadata as any} 
        systemFields={dynamicFields as any}
      />
    </div>
  );
}