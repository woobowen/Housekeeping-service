export type ActionState<T = null> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>; // 用于表单字段级别的错误返回
};