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
  const initialData: any = {
    idString: caregiver.idString,
    workerId: caregiver.workerId,
    name: caregiver.name,
    phone: caregiver.phone,
    idCardNumber: caregiver.idCardNumber || '',
    dob: caregiver.dob ? new Date(caregiver.dob) : null,
    gender: caregiver.gender || '女',
    nativePlace: caregiver.nativePlace || '',
    education: caregiver.education || '',
    currentResidence: caregiver.currentResidence || '',
    residenceDetail: caregiver.residenceDetail || '',
    
    // Physical Info
    height: caregiver.height ? Number(caregiver.height) : undefined,
    weight: caregiver.weight ? Number(caregiver.weight) : undefined,
    
    // Professional Info
    experienceYears: caregiver.experienceYears ? Number(caregiver.experienceYears) : undefined,
    isLiveIn: caregiver.isLiveIn || '',
    isTrainee: !!caregiver.isTrainee,
    
    // Skills & JSON Arrays
    jobTypes: Array.isArray(caregiver.jobTypes) ? caregiver.jobTypes : [],
    specialties: Array.isArray(caregiver.specialties) ? caregiver.specialties : [],
    cookingSkills: Array.isArray(caregiver.cookingSkills) ? caregiver.cookingSkills : [],
    languages: Array.isArray(caregiver.languages) ? caregiver.languages : [],
    certificates: Array.isArray(caregiver.certificates) ? caregiver.certificates : [],
    
    // Content Blocks
    selfIntro: caregiver.selfIntro || '',
    workHistory: caregiver.workHistory || '',
    reviews: caregiver.reviews || '',
    notes: caregiver.notes || '',
    
    // Files & Images
    avatarUrl: caregiver.avatarUrl || '',
    idCardFrontUrl: caregiver.idCardFrontUrl || '',
    idCardBackUrl: caregiver.idCardBackUrl || '',
    healthCertImages: Array.isArray(caregiver.healthCertImages) ? caregiver.healthCertImages : [],
    lifeImages: Array.isArray(caregiver.lifeImages) ? caregiver.lifeImages : [],
    
    // Custom/System Data
    customData: caregiver.customData || '',
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
