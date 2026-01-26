import { notFound } from 'next/navigation';
import { getCaregiver } from '@/features/caregivers/actions';
import { CaregiverForm } from '@/features/caregivers/components/caregiver-form';
import { CaregiverFormValues } from '@/features/caregivers/schema';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCaregiverPage(props: PageProps) {
  const { id } = await props.params;
  const caregiver = await getCaregiver(id);

  if (!caregiver) {
    notFound();
  }

  // Transform db result to form values
  // getCaregiver already parses JSON strings to arrays, so we just need to ensure types match
  const initialData: CaregiverFormValues & { idString: string, metadataJson?: string } = {
    idString: caregiver.idString,
    workerId: caregiver.workerId,
    name: caregiver.name,
    phone: caregiver.phone,
    idCardNumber: caregiver.idCardNumber,
    dob: caregiver.dob ? new Date(caregiver.dob) : undefined,
    gender: (caregiver.gender as any) || null,
    nativePlace: caregiver.nativePlace || undefined,
    education: (caregiver.education as any) || null,
    workExpLevel: (caregiver.workExpLevel as any) || null,
    isLiveIn: (caregiver.isLiveIn as any) || null,
    specialties: caregiver.specialties,
    cookingSkills: caregiver.cookingSkills,
    languages: caregiver.languages,
    avatarUrl: caregiver.avatarUrl || '',
    idCardFrontUrl: caregiver.idCardFrontUrl || '',
    idCardBackUrl: caregiver.idCardBackUrl || '',
    notes: caregiver.notes || undefined,
    metadataJson: (caregiver as any).metadataJson, // Pass the JSON string explicitly
  };

  return (
    <div className="py-6">
      <CaregiverForm 
        initialData={initialData}
        caregiverJson={JSON.stringify(initialData)} 
        metadataJson={(caregiver as any).metadataJson}
        key={id + ((caregiver as any).metadataJson || 'loading')} 
      />
    </div>
  );
}
