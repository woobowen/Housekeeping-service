/**
 * Caregiver Data Models & Types
 */

export interface Caregiver {
  idString: string;
  workerId: string;
  name: string;
  phone: string;
  idCardNumber: string | null;
  birthDate: Date | null;
  gender: string | null;
  nativePlace: string | null;
  education: string | null;

  // Residence Info
  currentResidence: string | null;
  residenceDetail: string | null;

  // Physical Info
  height: number | null;
  weight: number | null;

  // Professional Info
  workExpLevel: string | null;
  experienceYears: number | null;
  isLiveIn: string | null;
  isTrainee: boolean;
  salaryRequirements: number | null;
  monthlySalary: number; // Decimal mapped to number in frontend
  
  // JSON Fields (Lists)
  jobTypes: string[];
  specialties: string[];
  cookingSkills: string[];
  languages: string[];
  certificates: string[];
  
  // Media Lists (URLs)
  healthCertImages: string[];
  lifeImages: string[];

  // Long Text Content
  workHistory: string | null;
  selfIntro: string | null;
  reviews: string | null;

  // Files
  avatarUrl: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;

  notes: string | null;
  customData: string | null;

  // System Fields
  status: string;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Helper type for Form inputs (everything as string/number before processing)
 */
export interface CaregiverFormInput extends Omit<Caregiver, 'idString' | 'createdAt' | 'updatedAt' | 'monthlySalary' | 'jobTypes' | 'specialties' | 'cookingSkills' | 'languages' | 'certificates' | 'healthCertImages' | 'lifeImages'> {
  monthlySalary: string;
  jobTypes: string[];
  specialties: string[];
  cookingSkills: string[];
  languages: string[];
  certificates: string[];
  healthCertImages: string[];
  lifeImages: string[];
}
