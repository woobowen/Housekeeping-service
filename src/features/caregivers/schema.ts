import { z } from 'zod';

// -----------------------------------------------------------------------------
// 1. Enum Definitions (Simplified or matching new requirements)
// -----------------------------------------------------------------------------

export const EducationEnum = z.enum([
  'PRIMARY',
  'JUNIOR_HIGH',
  'SENIOR_HIGH',
  'VOCATIONAL',
  'COLLEGE',
  'BACHELOR',
]);

export const LiveInStatusEnum = z.enum(['LIVE_IN', 'LIVE_OUT', 'BOTH']);

// -----------------------------------------------------------------------------
// 2. Form Schema Definition
// -----------------------------------------------------------------------------

export const caregiverFormSchema = z.object({
  // --- Required Fields ---
  workerId: z.string().min(1, '工号不能为空'),
  name: z.string().min(1, '姓名不能为空'),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的11位手机号码'),
  idCardNumber: z
    .string()
    .regex(
      /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      '请输入有效的身份证号码'
    ),

  // --- Optional Physical Info ---
  dob: z.coerce.date().optional().nullable(),
  gender: z.string().optional().nullable(),
  height: z.coerce.number().optional().nullable(),
  weight: z.coerce.number().optional().nullable(),
  nativePlace: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  
  // Residence Info
  currentResidence: z.string().optional().nullable(),
  residenceDetail: z.string().optional().nullable(),

  // --- Optional Professional Info ---
  experienceYears: z.coerce.number().optional().nullable(),
  isLiveIn: z.string().optional().nullable(),

  // Skills (JSON Lists)
  jobTypes: z.array(z.string()).default([]),
  specialties: z.array(z.string()).default([]),
  cookingSkills: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  certificates: z.array(z.string()).default([]),

  // Content Blocks
  workHistory: z.string().optional().nullable(),
  selfIntro: z.string().optional().nullable(),
  reviews: z.string().optional().nullable(),

  // --- Files & Images ---
  avatarUrl: z.string().optional().nullable(),
  idCardFrontUrl: z.string().optional().nullable(),
  idCardBackUrl: z.string().optional().nullable(),
  healthCertImages: z.array(z.string()).default([]),
  lifeImages: z.array(z.string()).default([]),

  notes: z.string().optional().nullable(),
  customData: z.string().optional().nullable(),
});

// -----------------------------------------------------------------------------
// 3. Types
// -----------------------------------------------------------------------------

export type CaregiverFormValues = z.infer<typeof caregiverFormSchema>;

// -----------------------------------------------------------------------------
// 4. Default Values Helper
// -----------------------------------------------------------------------------

export const defaultCaregiverValues: Partial<CaregiverFormValues> = {
  workerId: '',
  name: '',
  phone: '',
  idCardNumber: '',
  gender: '女',
  jobTypes: [],
  specialties: [],
  cookingSkills: [],
  languages: [],
  certificates: [],
  healthCertImages: [],
  lifeImages: [],
  avatarUrl: '',
  idCardFrontUrl: '',
  idCardBackUrl: '',
  notes: '',
  workHistory: '',
  selfIntro: '',
  reviews: '',
};
