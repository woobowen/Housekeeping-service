import { notFound } from 'next/navigation';
import { getCaregiver } from '@/features/caregivers/actions';
import { CaregiverDetail } from '@/features/caregivers/components/caregiver-detail';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CaregiverDetailPage(props: PageProps) {
  const { id } = await props.params;
  const caregiver = await getCaregiver(id);

  if (!caregiver) {
    notFound();
  }

  return (
    <div className="p-6">
      <CaregiverDetail data={caregiver} />
    </div>
  );
}
