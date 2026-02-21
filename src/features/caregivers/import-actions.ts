'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { getGlobalFieldConfig } from '../system/actions';

export type ImportError = {
  row: number;
  name: string;
  reason: string;
};

export type ImportState = {
  success: boolean;
  count?: number;
  message?: string;
  errors?: ImportError[];
};

// --- Security & Parsing Helpers ---

const isValidChineseID = (id: string): boolean => {
  if (!id || id.length !== 18 || !/^\d{17}[\dXx]$/.test(id)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += parseInt(id.charAt(i), 10) * weights[i];
  return id.charAt(17).toUpperCase() === checkCodes[sum % 11];
};

const normalizeKey = (key: string) => key.replace(/\(.*\)|（.*）/g, '').replace(/[\*\s＊]/g, '').trim();

const normalizeKeys = (row: any) => {
  const normalized: any = {};
  for (const key in row) normalized[normalizeKey(key)] = row[key];
  return normalized;
};

const extractInfoFromIdCard = (idCard: string) => {
  if (!isValidChineseID(idCard)) return { birthDate: null, gender: null };
  try {
    const year = parseInt(idCard.substring(6, 10), 10);
    const month = parseInt(idCard.substring(10, 12), 10) - 1;
    const day = parseInt(idCard.substring(12, 14), 10);
    return { 
      birthDate: new Date(year, month, day), 
      gender: parseInt(idCard.charAt(16), 10) % 2 === 1 ? '男' : '女' 
    };
  } catch (e) { return { birthDate: null, gender: null }; }
};

const parseExcelDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(Math.round((value - 25569) * 86400 * 1000));
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const parseExcelList = (val: any): string => {
  if (!val) return JSON.stringify([]);
  const list = String(val).split(/[,，]/).map(s => s.trim()).filter(Boolean);
  return JSON.stringify(list);
};

const mapEducation = (v: string) => ({'小学':'PRIMARY','初中':'JUNIOR_HIGH','高中':'SENIOR_HIGH','中专':'VOCATIONAL','大专':'COLLEGE','本科':'BACHELOR'}[v] || null);
const mapLiveInStatus = (v: string) => (v?.includes('不住家') ? 'LIVE_OUT' : v?.includes('住家') ? 'LIVE_IN' : null);
const mapBool = (v: any) => (v === '是' || v === 'yes' || v === true || v === '1');

export async function importCaregivers(prevState: any, formData: FormData): Promise<ImportState> {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return { success: false, message: '请上传有效的文件' };

  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { raw: false, defval: '' });

    if (jsonData.length === 0) return { success: true, count: 0, message: 'Excel 文件中没有数据。' };

    const idCardNumbers = jsonData.map(r => String(normalizeKeys(r)['身份证'] || '').trim()).filter(Boolean);
    const existingIds = new Set((await db.caregiver.findMany({ where: { idCardNumber: { in: idCardNumbers } }, select: { idCardNumber: true } })).map(c => c.idCardNumber));

    const globalConfig = await getGlobalFieldConfig();
    const allGlobalFields = Object.values(globalConfig.sections).flat();
    const labelToNameMap: Record<string, string> = {};
    allGlobalFields.forEach(f => labelToNameMap[normalizeKey(f.label)] = f.name);

    const STATIC_HEADERS = new Set([
      '姓名', '手机', '身份证', '工号', '薪资', '生日', '出生日期', '性别', '年限', '从业年限',
      '学历', '籍贯', '住家', '工种', '特长', '证书', '烹饪', '备注', '培训中', '身高', '体重'
    ]);

    const caregiversToInsert: Prisma.CaregiverCreateManyInput[] = [];
    const errors: ImportError[] = [];
    const localIdSet = new Set<string>();

    for (let i = 0; i < jsonData.length; i++) {
      const row = normalizeKeys(jsonData[i]);
      const rowNum = i + 2;
      
      const name = String(row['姓名'] || '').trim();
      const idCard = String(row['身份证'] || '').trim();
      const phone = String(row['手机'] || '').trim();

      if (!name && !idCard && !phone) continue;
      if (!name) { errors.push({ row: rowNum, name: '未知', reason: '姓名必填' }); continue; }
      if (!idCard) { errors.push({ row: rowNum, name, reason: '身份证必填' }); continue; }
      if (!isValidChineseID(idCard)) { errors.push({ row: rowNum, name, reason: '身份证格式非法' }); continue; }
      if (existingIds.has(idCard) || localIdSet.has(idCard)) { errors.push({ row: rowNum, name, reason: '身份证号已存在' }); continue; }
      localIdSet.add(idCard);

      const customValues: Record<string, any> = {};
      for (const key in row) {
        if (STATIC_HEADERS.has(key)) continue;
        const val = row[key];
        if (val !== undefined && val !== null && val !== '') customValues[labelToNameMap[key] || key] = val;
      }

      const idInfo = extractInfoFromIdCard(idCard);
      caregiversToInsert.push({
        idString: crypto.randomUUID(),
        workerId: row['工号'] ? String(row['工号']) : `CG${Date.now()}${i}`,
        name, phone, idCardNumber: idCard,
        birthDate: parseExcelDate(row['生日'] || row['出生日期']) || idInfo.birthDate,
        gender: row['性别'] || idInfo.gender || '女',
        nativePlace: row['籍贯'] || '',
        education: mapEducation(row['学历']),
        isLiveIn: mapLiveInStatus(row['住家']),
        isTrainee: mapBool(row['培训中']),
        height: row['身高'] ? parseInt(row['身高'], 10) : null,
        weight: row['体重'] ? parseInt(row['体重'], 10) : null,
        experienceYears: row['年限'] || row['从业年限'] ? parseInt(row['年限'] || row['从业年限'], 10) : null,
        salaryRequirements: parseInt(row['薪资'] || '0', 10),
        jobTypes: parseExcelList(row['工种']),
        specialties: parseExcelList(row['特长']),
        certificates: parseExcelList(row['证书']),
        cookingSkills: parseExcelList(row['烹饪']),
        notes: row['备注'] || '',
        status: 'PENDING', level: 'TRAINEE',
        customData: Object.keys(customValues).length > 0 ? JSON.stringify(customValues) : null,
      });
    }

    if (caregiversToInsert.length > 0) await db.caregiver.createMany({ data: caregiversToInsert });
    revalidatePath('/caregivers');

    return { success: true, count: caregiversToInsert.length, message: `成功导入 ${caregiversToInsert.length} 名护理员`, errors: errors.length > 0 ? errors : undefined };
  } catch (e) {
    return { success: false, message: '系统错误: ' + (e instanceof Error ? e.message : '未知') };
  }
}