export type ActionState<T = null> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>; // 用于表单字段级别的错误返回
};

export interface CaregiverMetadata {
  rating?: number;
  internalNotes?: string;
  customTags?: string[];
}

export interface DynamicFieldDefinition {
  id?: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | string;
  options?: string[];
  required?: boolean;
}

export interface TimelineItem {
  idString: string;
  content: string;
  imageUrls: string[];
  createdAt: Date;
  caregiverId: string;
}

export interface CaregiverListItem {
  id: string;
  workerId: string;
  fullName: string;
  phone: string;
  gender: string | null;
  age: number;
  dob: Date | null;
  status: string;
  nativePlace: string | null;
  education: string | null;
  height: number | null;
  weight: number | null;
  experienceYears: number | null;
  isTrainee: boolean;
  monthlySalary: number | null;
  jobTypes: string[];
  specialties: string[];
  certificates: string[];
  cookingSkills: string[];
  languages: string[];
  avatarUrl: string | null;
  liveInStatus: string | null;
  currentResidence: string | null;
  residenceDetail: string | null;
  idCardNumber: string;
  notes: string | null;
  customData: Record<string, unknown>;
}

// Ensure this matches the transformed data from actions.ts
// This type represents the data shape used in Client Components
export interface CaregiverDetailData {
  idString: string;
  workerId: string;
  name: string;
  phone: string | null;
  idCardNumber: string | null;
  dob: Date | null;
  gender: string | null;
  nativePlace: string | null;
  education: string | null;
  currentResidence: string | null;
  residenceDetail: string | null;
  height: number | null;
  weight: number | null;
  experienceYears: number | null;
  isTrainee: boolean;
  isLiveIn: string | null;
  jobTypes: string[];
  specialties: string[];
  certificates: string[];
  cookingSkills: string[];
  languages: string[];
  healthCertImages: string[];
  lifeImages: string[];
  workHistory: string | null;
  selfIntro: string | null;
  reviews: string | null;
  avatarUrl: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  notes: string | null;
  customData: Record<string, unknown> | string | null;
  metadata?: CaregiverMetadata;
  status: string;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}
