'use server';

import ExcelJS from 'exceljs';
import { getGlobalFieldConfig } from '@/features/system/actions';

export async function downloadImportTemplate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('护理员导入模板');
  
  // Fetch Global Dynamic Fields
  const globalConfig = await getGlobalFieldConfig();
  // Flatten all sections into a single array of fields
  const dynamicFields = Object.values(globalConfig.sections).flat();

  // Define Base Columns
  const baseColumns = [
    { header: '姓名*', key: 'name', width: 15 },
    { header: '手机*', key: 'phone', width: 15, style: { numFmt: '@' } },
    { header: '身份证*', key: 'idCard', width: 25, style: { numFmt: '@' } },
    { header: '工号', key: 'workerId', width: 15 },
    { header: '薪资', key: 'salary', width: 12 },
    { header: '生日', key: 'birthday', width: 15 },
    { header: '性别', key: 'gender', width: 10 },
    { header: '经验等级', key: 'expLevel', width: 12 },
    { header: '学历', key: 'education', width: 12 },
    { header: '籍贯', key: 'nativePlace', width: 15 },
    { header: '住家', key: 'liveIn', width: 12 },
    { header: '工种', key: 'jobTypes', width: 25 },
    { header: '证书', key: 'certificates', width: 25 },
    { header: '备注', key: 'notes', width: 30 },
  ];

  // Map dynamic fields to columns
  const dynamicColumns = dynamicFields.map(f => ({
    header: f.label,
    key: f.name,
    width: 20
  }));

  worksheet.columns = [...baseColumns, ...dynamicColumns];

  // Add Validation to specific columns for rows 2 to 500 (Template limit)
  for (let i = 2; i <= 500; i++) {
    // Format Phone and ID Card as Text
    worksheet.getCell(`B${i}`).numFmt = '@';
    worksheet.getCell(`C${i}`).numFmt = '@';

    // Gender (Column G - 7)
    worksheet.getCell(`G${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"男,女"'],
      showErrorMessage: true,
      errorTitle: '格式错误',
      error: '请从下拉列表中选择性别',
    };

    // Exp Level (Column H - 8)
    worksheet.getCell(`H${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"初级,中级,高级,专家"'],
    };

    // Education (Column I - 9)
    worksheet.getCell(`I${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"小学,初中,高中,中专,大专,本科"'],
    };

    // Live In (Column K - 11)
    worksheet.getCell(`K${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"住家,不住家"'],
    };

    // Dynamic Fields Validation
    dynamicFields.forEach((field, index) => {
      // Dynamic fields start after baseColumns
      // Column index is 1-based in ExcelJS
      const colIndex = baseColumns.length + index + 1;
      const colLetter = worksheet.getColumn(colIndex).letter;
      const cell = worksheet.getCell(`${colLetter}${i}`);

      if (field.type === 'select' && field.options && field.options.length > 0) {
        // Excel list validation formula needs comma separated string in double quotes
        // "Option1,Option2,Option3"
        const optionsString = `"${field.options.join(',')}"`;
        cell.dataValidation = {
          type: 'list',
          allowBlank: !field.required,
          formulae: [optionsString],
          showErrorMessage: true,
          error: `请选择有效的${field.label}`,
        };
      } else if (field.type === 'date') {
        cell.numFmt = 'yyyy-mm-dd';
        cell.dataValidation = {
           type: 'date',
           allowBlank: !field.required,
           operator: 'greaterThan',
           formulae: [new Date(1900, 0, 1)],
           showErrorMessage: true,
           error: '请输入有效日期'
        };
      }
    });
  }

  // Add Comment to ID Card Header (Column C)
  const idCell = worksheet.getCell('C1');
  idCell.note = '必填，必须为合法的18位中国身份证号';

  // Style Header
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F81BD' },
  };

  // Generate Buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Return base64 string
  return Buffer.from(buffer).toString('base64');
}