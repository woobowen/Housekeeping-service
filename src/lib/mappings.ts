export const GenderMap: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
};

export const EducationMap: Record<string, string> = {
  PRIMARY: '小学',
  JUNIOR_HIGH: '初中',
  SENIOR_HIGH: '高中',
  VOCATIONAL: '中专/职高',
  COLLEGE: '大专',
  BACHELOR: '本科及以上',
};

export const WorkExpLevelMap: Record<string, string> = {
  ENTRY: '初级 (1年以下)',
  INTERMEDIATE: '中级 (1-3年)',
  SENIOR: '高级 (3-5年)',
  EXPERT: '特级 (5年以上)',
};

export const LiveInStatusMap: Record<string, string> = {
  LIVE_IN: '住家',
  LIVE_OUT: '不住家',
  BOTH: '皆可',
};

export const CaregiverLevelMap: Record<string, string> = {
  TRAINEE: '见习',
  JUNIOR: '初级',
  SENIOR: '高级',
  GOLD: '金牌',
  DIAMOND: '钻石', // Added based on typical schema, can be adjusted
  EXPERT: '专家', // Handling variation just in case
};

export const CaregiverStatusMap: Record<string, string> = {
  PENDING: '待审核',
  ACTIVE: '待岗', // "Active" usually means available in pool
  INACTIVE: '停用',
  SUSPENDED: '暂停',
  BLACKLISTED: '黑名单',
  BUSY: '服务中', // Dynamic status often used
  LEAVE: '请假',
};
