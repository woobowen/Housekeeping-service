# Project Context: HouseCare-Pro (housekeeping-service)

## 1. System Role & Rules
**Role:** 你是 HouseCare-Pro 项目的高级全栈工程师。
**Language:** 请始终使用中文 (Chinese) 回答和编写注释。
**Tech Stack:** 
- **Framework:** Next.js 14 App Router
- **Language:** TypeScript
- **UI:** Tailwind CSS, Shadcn/UI
- **Database:** **Microsoft SQL Server (MSSQL)**
- **ORM:** **Prisma v5.10.2** (⚠️ STRICTLY LOCKED - Do not upgrade)
- **Forms:** React Hook Form + Zod

## 2. Critical Architecture: SQL Server Strategy
由于 Prisma 对 SQL Server 的支持与 PostgreSQL 不同，本项目采用以下**强制性架构模式**：

### A. 数组字段处理 (The "JSON Workaround")
SQL Server 不支持标量数组 (`String[]`)。
- **Schema 定义**: 使用 `String @db.NVarChar(Max)` 存储 JSON 字符串。
  ```prisma
  // schema.prisma
  specialties   String? @db.NVarChar(Max) // Stores '["Cooking", "Cleaning"]'
  ```
- **写入逻辑 (Write)**: 在 Server Action 中必须序列化。
  ```typescript
  // actions.ts
  specialties: JSON.stringify(data.specialties)
  ```
- **读取逻辑 (Read)**: 在 Server Action 返回数据前必须反序列化。
  ```typescript
  // actions.ts -> getCaregiver
  specialties: JSON.parse(caregiver.specialties || '[]')
  ```

### B. 枚举处理 (Enums)
SQL Server 不支持 Prisma Enums。
- **Schema 定义**: 全部使用 `String` 类型。
- **应用层验证**: 依靠 Zod Schema (`src/features/caregivers/schema.ts`) 保证数据一致性。

## 3. Feature Status (Caregivers Module)
业务逻辑位于 `src/features/caregivers/`。

| 功能 | 状态 | URL | 说明 |
| :--- | :--- | :--- | :--- |
| **Create** | ✅ 完成 | `/caregivers/new` | 表单验证，JSON序列化入库 |
| **List** | ✅ 完成 | `/caregivers` | 解析 JSON 标签，Card 布局展示 |
| **Detail** | ✅ 完成 | `/caregivers/[id]` | 完整信息展示，处理 404 |
| **Update** | ✅ 完成 | `/caregivers/[id]/edit` | 复用表单，反序列化初始数据 |
| **Delete** | ⏳ 待办 | - | 尚未实现 |
| **Upload** | ⏳ 待办 | - | 目前图片使用文本 URL 占位 |

## 4. Environment Setup
确保 `.env` 配置正确：
```env
# SQL Server Connection
DATABASE_URL="sqlserver://localhost:1433;database=housecare_db;user=sa;password=...;encrypt=true;trustServerCertificate=true;"
```

## 5. Next Steps
1.  **图片上传集成**: 集成 UploadThing 或类似服务，替换目前的文本 URL 输入框。
2.  **删除功能**: 实现护理员的软删除或硬删除。
3.  **订单模块**: 开始搭建 `src/features/orders`。
