import { z } from 'zod';

// -----------------------------------------------------------------------------
// 1. Enum Definitions (Matching assumed Prisma Enums)
// -----------------------------------------------------------------------------

export const GenderEnum = z.enum(['MALE', 'FEMALE']);
export const EducationEnum = z.enum([
  'PRIMARY',
  'JUNIOR_HIGH',
  'SENIOR_HIGH',
  'VOCATIONAL',
  'COLLEGE',
  'BACHELOR',
]);
export const WorkExperienceLevelEnum = z.enum(['ENTRY', 'INTERMEDIATE', 'SENIOR', 'EXPERT']);
export const LiveInStatusEnum = z.enum(['LIVE_IN', 'LIVE_OUT', 'BOTH']);
export const CaregiverLevelEnum = z.enum(['TRAINEE', 'JUNIOR', 'SENIOR', 'GOLD', 'DIAMOND']);
export const CaregiverStatusEnum = z.enum(['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'BLACKLISTED']);

// -----------------------------------------------------------------------------
// 2. Form Schema Definition
// -----------------------------------------------------------------------------

export const caregiverFormSchema = z.object({
  // --- Step 1: Basic Info ---
  workerId: z.string().min(1, '工号不能为空'),
  name: z.string().min(2, '姓名至少需要2个字符'),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的11位手机号码'),
  idCardNumber: z
    .string()
    .regex(
      /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
      '请输入有效的身份证号码'
    ),
  dob: z.coerce.date().optional().nullable(),
  gender: GenderEnum.optional().nullable(),
  nativePlace: z.string().optional(),
  education: EducationEnum.optional().nullable(),
  notes: z.string().optional(),

  // --- Step 2: Professional Info ---
  workExpLevel: WorkExperienceLevelEnum.optional().nullable(),
  isLiveIn: LiveInStatusEnum.optional().nullable(), // Corresponds to LiveInStatus
  specialties: z
    .array(z.string())
    .min(1, '请至少选择一项特长'),
  cookingSkills: z.array(z.string()).default([]), // Optional in logic, but array type
  languages: z.array(z.string()).default([]),

  // --- Step 3: Files ---
  avatarUrl: z.string().optional().nullable().or(z.literal('')),
  idCardFrontUrl: z.string().optional().nullable().or(z.literal('')),
  idCardBackUrl: z.string().optional().nullable().or(z.literal('')),

  // --- Step 4: Metadata (Extensibility) ---
  metadata: z.object({
    rating: z.coerce.number().min(0).max(5).optional(),
    internalNotes: z.string().optional(),
    customTags: z.array(z.string()).optional(),
  }).optional(),
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
  // dob: undefined, // Date picker usually handles undefined/null
  // gender: 'FEMALE', // Remove default
  nativePlace: '',
  // education: 'JUNIOR_HIGH', // Remove default
  // workExpLevel: 'ENTRY', // Remove default
  // isLiveIn: 'LIVE_OUT', // Remove default
  specialties: [],
  cookingSkills: [],
  languages: [],
  avatarUrl: '',
  idCardFrontUrl: '',
  idCardBackUrl: '',
  notes: '',
  metadata: {
    rating: 0,
    internalNotes: '',
    customTags: [],
  },
};
