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

// Ensure this matches the transformed data from actions.ts
// This type represents the data shape used in Client Components
export interface Caregiver {
  idString: string;
  workerId: string;
  name: string;
  phone: string;
  idCardNumber: string;
  dob: Date | null;
  gender: string | null;
  nativePlace: string | null;
  education: string | null;
  workExpLevel: string | null;
  isLiveIn: string | null;
  specialties: string[];
  cookingSkills: string[];
  languages: string[];
  avatarUrl: string | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  notes: string | null;
  metadata: CaregiverMetadata; // Parsed Object
  status: string;
  level: string;
  createdAt: Date;
  updatedAt: Date;
}