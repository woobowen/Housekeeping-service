# Project Context: HouseCare-Pro (housekeeping-service)

## 1. System Role & Rules
**Role:** 你是 HouseCare-Pro 项目的高级全栈工程师与架构师。
**Language:** 请始终使用中文 (Chinese) 回答和编写注释。
**Tech Stack:** 
- **Framework:** Next.js 16.1.4 (App Router, Turbopack)
- **Language:** TypeScript
- **UI:** Tailwind CSS v4, Shadcn/UI
- **Database:** **Microsoft SQL Server (MSSQL)**
- **ORM:** **Prisma v5.10.2** (⚠️ STRICTLY LOCKED - Do not upgrade due to MSSQL stability)
- **Forms:** React Hook Form + Zod

## 2. Critical Architecture: SQL Server & Next.js 16 Strategy

### A. 数组字段处理 (The "JSON Workaround")
SQL Server 不支持标量数组 (`String[]`)。
- **Schema 定义**: 使用 `String @db.NVarChar(Max)` 存储 JSON 字符串。
  ```prisma
  specialties   String? @db.NVarChar(Max) // Stores '["Cooking", "Cleaning"]'
  ```
- **写入逻辑 (Write)**: 在 Server Action 中必须使用 `JSON.stringify`。
- **读取逻辑 (Read)**: 在 Server Action 返回数据前必须使用 `JSON.parse`。

### B. Next.js 16 Async Params
Next.js 16 中，Page 组件的 `params` 和 `searchParams` 变成了 **Promise**。
- **规则**: 必须在组件或逻辑中使用 `await params`。
  ```typescript
  // ❌ 错误
  const id = params.id;
  // ✅ 正确
  const { id } = await params;
  ```

### C. 表单导航与幽灵提交 (Ghost Submission)
多步骤表单中的“下一步”/“上一步”按钮必须明确指定 type。
- **规则**: 非提交按钮必须写 `type="button"`，否则会被视为 `submit` 触发验证或提交。

### D. Rating Input "Sticky Zero" Fix
React 的受控数字输入框在处理 `0` 和空字符串时有原生缺陷。
- **规则**: 必须使用 **Text-as-Number** 模式。
  ```tsx
  <Input
    type="text"           // 禁止浏览器数字处理
    inputMode="decimal"   // 保持移动端键盘
    onChange={(e) => {
       if (e.target.value === '') field.onChange(undefined); // 允许彻底清空
       // ... regex validation
    }}
  />
  ```
  ### E. Server Action Redirect Pattern
Next.js 的 `redirect()` 通过抛出特殊 Error (`NEXT_REDIRECT`) 来中断执行。
- **规则**: `redirect()` 必须放在 `try/catch` 代码块的 **外部 (最后一行)**。
- **原因**: 如果放在 `try` 块内，会被 `catch` 捕获，导致页面无法跳转且前端收到 "Unknown Error"。

## 3. Feature Status Matrix (Caregivers Module)
业务逻辑位于 `src/features/caregivers/`。

| 功能 | 状态 | URL | 说明 |
| :--- | :--- | :--- | :--- |
| **Create** | ✅ 完成 | `/caregivers/new` | 表单验证，JSON序列化入库 |
| **List** | ✅ 完成 | `/caregivers` | 解析 JSON 标签，Card 布局展示 |
| **Detail** | ✅ 完成 | `/caregivers/[id]` | 已修复 Async Params 导致的 500 错误 |
| **Update** | ✅ 完成 | `/caregivers/[id]/edit` | 已修复 Navigation Bug，实现 Rating "Text-as-Number" 模式 |
| **Delete** | ✅ 完成 | - | Server Action + Redirect 逻辑修复 |
| **Metadata**| ✅ 完成 | - | Rating (0-5), Tags, Internal Notes 均已打通 |
| **Upload** | ⏳ 待办 | - | 目前使用 Mock URL，需集成 Local Storage 或 UploadThing |

## 4. Next Steps
1.  **Task 4 - Avatar Image Upload**: 
    -   目标：替换目前的文本输入框。
    -   策略：优先实现本地文件存储 (Local Storage) 用于演示，或集成 OSS。
2.  **Order Module**: 开始搭建 `src/features/orders`。