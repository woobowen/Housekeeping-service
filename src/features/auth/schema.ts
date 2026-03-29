import { z } from 'zod';

const phoneRegex: RegExp = /^1\d{10}$/;

export const sendCodeSchema = z.object({
  email: z.email('请输入有效的邮箱地址').transform((value: string) => value.trim().toLowerCase()),
});

export const loginSchema = z.object({
  email: z.email('请输入有效的邮箱地址').transform((value: string) => value.trim().toLowerCase()),
  password: z.string().min(8, '密码至少 8 位'),
});

export const registerSchema = z.object({
  email: z.email('请输入有效的邮箱地址').transform((value: string) => value.trim().toLowerCase()),
  phone: z.string().regex(phoneRegex, '请输入有效的 11 位手机号'),
  password: z.string()
    .min(8, '密码至少 8 位')
    .regex(/[A-Z]/, '密码需至少包含 1 个大写字母')
    .regex(/[a-z]/, '密码需至少包含 1 个小写字母')
    .regex(/\d/, '密码需至少包含 1 个数字'),
  code: z.string().trim().length(6, '验证码必须为 6 位数字'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SendCodeInput = z.infer<typeof sendCodeSchema>;

export interface AuthActionState {
  error?: string;
  success?: string;
}
