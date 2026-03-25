# AGENTS.md

## 1. 宪法地位

本文件是本仓库的最高约束文件。任何 AI 代理、自动化脚本、协作者在修改代码前，必须先遵循本文件，再阅读对应 feature 的实现细节。

如旧文档与当前代码冲突，以当前物理代码和本文件为准。

## 2. 当前技术栈真相

- 核心框架：Next.js `16.1.4`，使用 App Router。
- 语言与类型系统：TypeScript `5.x`。
- ORM：Prisma `5.10.2`。
- 数据库：PostgreSQL，连接来自 `DATABASE_URL` / `DIRECT_URL`，当前真实 provider 为 `postgresql`。
- 云存储：Supabase Storage，通过 `@supabase/supabase-js` 上传文件。
- React 版本：React `19.2.3`，React DOM `19.2.3`。
- 表单校验：Zod `4.x` + React Hook Form `7.x`。

## 3. 已废止的旧时代设定

以下设定已被彻底废止，禁止在新代码、重构、文档中复活：

- MSSQL 不是当前数据库，不得再以 MSSQL 为前提设计字段、迁移或查询逻辑。
- 服务端本地 `fs` 写盘不是当前上传方案，不得再向 `public/uploads`、磁盘临时目录或任意本地目录写业务文件。
- `src/lib/upload.ts` 已移除，不得恢复同类重复上传模块。
- 上传主链已经收敛到 `src/lib/file-storage.ts`，必须复用，不得各 feature 自造一套上传实现。

## 4. 目录与职责边界

项目采用 Feature-based 架构，主目录约定如下：

- `src/features/{feature}/actions.ts`
  负责 Server Action、数据库写入、事务、重验证、核心业务流程编排。
- `src/features/{feature}/components/`
  负责 UI、受控表单、局部交互，不直接承载数据库写入规则。
- `src/features/{feature}/schema.ts`
  负责该 feature 的 Zod 校验、输入约束与前后端共享的结构定义。
- `src/lib/`
  负责跨 feature 基础设施，如 Prisma 单例、Supabase 文件上传、JSON 隧道工具、序列化工具。
- `prisma/`
  负责 schema、迁移和 seed，是数据库结构的第一事实源。

注意：当前仓库的命名以 `schema.ts` 单数为主，不要凭空改成 `schemas.ts`，除非整个 feature 已统一迁移。

## 5. 编码底层准则

- 所有新增和修改代码必须保持强类型，禁止无必要的 `any`、弱类型透传和裸对象拼装。
- 所有函数参数、返回值、核心中间结构都应显式 Type Hinting。
- 关键业务逻辑必须补中文注释，尤其是金额计算、日期交集、状态流转、JSON 序列化和上传链路。
- 前端表单必须是强类型受控组件。
- `defaultValues`、`value`、可选输入项必须显式回退，避免 `null`/`undefined` 触发 React 受控组件警告。
- Decimal 字段在进入前端时应明确转成 `number` 或字符串，不得把 Prisma Decimal 直接泄漏给 UI。

## 6. 数据模型兼容规范

### 6.1 ID 命名策略

当前仓库存在历史兼容下的非对称 ID 命名，修改查询条件时必须先确认模型主键：

- `Caregiver.idString`
- `CaregiverTimeline.idString`
- `Order.id`
- `User.id`
- `SalarySettlement.id`
- `SystemFieldDefinition.id`
- `SystemSettings.key`

严禁想当然地统一写成 `id`。涉及关联时，当前真实外键关系包括：

- `Order.caregiverId -> Caregiver.idString`
- `Order.clientId -> User.id`
- `CaregiverTimeline.caregiverId -> Caregiver.idString`
- `SalarySettlement.caregiverId -> Caregiver.idString`

### 6.2 数组与动态字段存储策略

虽然数据库已经迁移到 PostgreSQL，但当前代码没有使用 PostgreSQL 原生数组字段。数组和动态结构仍沿用字符串列 + JSON 序列化隧道策略。

当前明确仍走 JSON 隧道的字段包括：

- `Caregiver.jobTypes`
- `Caregiver.specialties`
- `Caregiver.cookingSkills`
- `Caregiver.languages`
- `Caregiver.certificates`
- `Caregiver.healthCertImages`
- `Caregiver.lifeImages`
- `Caregiver.customData`
- `Order.customData`
- `CaregiverTimeline.imageUrls`
- `SystemFieldDefinition.options`
- `SystemSettings.value`
- `SalarySettlement.details`

结论：

- PostgreSQL 已上云，但数组字段尚未原生化。
- 新代码写入这些字段时必须显式 `JSON.stringify(...)`。
- 读取这些字段时必须显式解析并提供空数组或空对象回退。
- 禁止向这些字段写入 `null` 语义不清的 JSON 内容。

## 7. 上传与媒体链路规范

当前真实上传链路如下：

`Server Action -> saveFile(file, folder) -> Supabase Storage bucket(caregivers) -> public URL -> Prisma 落库`

硬性要求：

- 唯一上传基础设施是 `src/lib/file-storage.ts` 的 `saveFile`。
- 上传文件需先转 `ArrayBuffer`，再上传到 Supabase Storage。
- 存储桶当前为 `caregivers`。
- 返回值是公开可访问 URL，由 `getPublicUrl` 生成。
- 所有媒体字段应存 URL，不存本地路径。

禁止事项：

- 禁止重新引入 `fs.writeFile`、`mkdir`、`unlink`、`createWriteStream` 等服务端写盘流程。
- 禁止把业务图片重新落入 `public/uploads`。
- 禁止为不同 feature 再复制一份上传客户端。

## 8. Caregiver Feature 的真实业务链

根据 `src/features/caregivers/actions.ts`，当前护理员表单的真实处理链为：

1. 从 `FormData` 提取字段。
2. 单图字段和多图字段先上传到 Supabase Storage。
3. 再将 URL 写回待校验对象。
4. 使用 `caregiverFormSchema` 做 Zod 校验。
5. 将数组字段序列化为 JSON 字符串。
6. 通过 Prisma 写入 PostgreSQL。
7. 使用 `revalidatePath` 刷新页面。

因此，代理修改护理员相关逻辑时，必须先判断改动属于哪一层：

- 表单结构变化：先改 `schema.ts` 与组件。
- 上传字段变化：同步修改 `processFormData` 和 Prisma 序列化逻辑。
- 展示变化：同步修改读取端的 JSON 反序列化与默认值。

## 9. 变更守则

- 涉及数据库字段时，先改 `prisma/schema.prisma`，再补迁移，再改 actions 和 UI。
- 涉及上传时，只允许在 `file-storage.ts` 的能力边界内扩展。
- 涉及金额和日期计算时，必须保证两位小数、时区边界和包含首尾日的规则明确。
- 涉及状态流转时，必须检查 `revalidatePath`、关联状态回写和列表筛选是否同步更新。

## 10. 文档优先级

当前仓库的真理源优先级如下：

1. `prisma/schema.prisma`
2. `src/features/*/actions.ts` 与 `src/lib/*`
3. Git 最近提交记录
4. `PROJECT.md`
5. 其他历史文档

