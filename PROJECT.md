# PROJECT.md

## 1. 项目定义

`housekeeping-service` 是一个基于 Next.js App Router 的家政服务管理系统，覆盖护理员、订单、财务结算、系统字段配置等模块。

当前项目生命周期已经正式跨越“本地石器时代”：

- 数据库已迁移到 Supabase PostgreSQL。
- 文件上传已迁移到 Supabase Storage。
- 本地历史上传目录 `public/uploads` 已从仓库中移除。
- 冗余上传模块 `src/lib/upload.ts` 已移除。
- 仓库已新增 `.gitattributes`，统一固化 `LF` 换行规约。

## 2. 当前状态拓扑

### 2.1 架构状态

- Web 框架：Next.js `16.1.4`
- 渲染模型：App Router + Server Actions
- 数据访问：Prisma Client
- 数据库：PostgreSQL（Supabase）
- 文件系统策略：业务链路禁止本地写盘
- 对象存储：Supabase Storage

### 2.2 最近里程碑

- `ac97a0b` `chore: 强制清理跨平台 CRLF 扰动，移除 public/uploads 残留，固化 LF 换行规约`
- `734cb0d` `fix: 移除 Google 字体解决构建超时，完成 Supabase 图床接入`
- `8f37c8d` `feat: 迁移数据库至 Supabase PostgreSQL 并修复财务结算与UI逻辑`

结论：数据库上云和图床上云已完成，当前阶段的主要工作不再是迁移，而是围绕既有云架构持续收敛与维护。

## 3. 全栈工具链

### 3.1 核心依赖

- `next@16.1.4`
- `react@19.2.3`
- `react-dom@19.2.3`
- `typescript@5`
- `prisma@5.10.2`
- `@prisma/client@5.10.2`
- `@supabase/supabase-js@^2.97.0`
- `zod@^4.3.6`
- `react-hook-form@^7.71.1`
- `@hookform/resolvers@^5.2.2`
- `date-fns@^4.1.0`
- `sonner@^2.0.7`
- `xlsx@^0.18.5`
- `exceljs@^4.4.0`
- `lucide-react@^0.563.0`
- Radix UI 组件栈：`alert-dialog`、`dialog`、`popover`、`radio-group`、`scroll-area`、`select`、`switch`、`tabs` 等

### 3.2 开发工具链

- `eslint@^9`
- `eslint-config-next@16.1.4`
- `tailwindcss@^4`
- `@tailwindcss/postcss@^4`
- `ts-node@^10.9.2`
- `babel-plugin-react-compiler@1.0.0`

### 3.3 运行与环境要求

- 包管理器：当前仓库使用 `package-lock.json`，默认以 npm 工作流为准。
- 数据库环境变量：`DATABASE_URL`、`DIRECT_URL`
- Supabase 环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`，必要时可回退 `SUPABASE_SERVICE_ROLE_KEY`
- 统一开发基线：文档层要求在 WSL 下使用 Node.js `22 LTS` 进行开发、安装依赖和构建，以减少跨平台换行和原生依赖差异。

说明：仓库当前未在 `package.json` 声明 `engines` 字段，因此 Node 版本要求属于工程治理约束，不是包管理器硬限制。

## 4. 目录地图

### 4.1 根目录

- `prisma/`
  数据模型、迁移、种子数据
- `src/app/`
  App Router 页面入口
- `src/features/`
  按业务域组织的功能模块
- `src/components/`
  共享 UI 组件
- `src/lib/`
  基础设施与通用工具

### 4.2 Feature 约定

每个 feature 应尽量保持以下职责分层：

- `actions.ts`
  Server Action、数据库事务、状态流转、重验证、业务编排
- `components/`
  页面与局部交互、受控表单、用户反馈
- `schema.ts`
  Zod 结构、输入约束、共享数据模型
- `types.ts`
  显式类型定义

当前已存在的核心 feature 包括：

- `caregivers`
- `orders`
- `finance`
- `settings`
- `auth`
- `system`

## 5. 数据库实况

### 5.1 Provider 与连接

`prisma/schema.prisma` 当前真实配置：

- `provider = "postgresql"`
- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

### 5.2 关键模型

- `Caregiver`
- `Order`
- `User`
- `CaregiverTimeline`
- `SalarySettlement`
- `SystemFieldDefinition`
- `SystemSettings`

### 5.3 主键与关联

- `Caregiver.idString`
- `CaregiverTimeline.idString`
- `Order.id`
- `User.id`
- `SalarySettlement.id`
- `SystemFieldDefinition.id`
- `SystemSettings.key`

关键关联：

- `Order.caregiverId -> Caregiver.idString`
- `Order.clientId -> User.id`
- `CaregiverTimeline.caregiverId -> Caregiver.idString`
- `SalarySettlement.caregiverId -> Caregiver.idString`

### 5.4 存储策略现状

尽管数据库已经是 PostgreSQL，当前数组和动态结构仍未迁移为原生数组或 JSON 列，而是延续字符串列上的 JSON 隧道。

当前典型字段：

- 护理员标签与证书：`jobTypes`、`specialties`、`cookingSkills`、`languages`、`certificates`
- 护理员图片列表：`healthCertImages`、`lifeImages`
- 时间线图片：`CaregiverTimeline.imageUrls`
- 动态字段：`Caregiver.customData`、`Order.customData`
- 结算详情：`SalarySettlement.details`

因此所有读写流程都必须自己承担：

- 写入前 `JSON.stringify`
- 读取后 `JSON.parse`
- 空值兜底
- 结构兼容

## 6. 核心数据流

### 6.1 护理员上传与落库链

当前护理员相关的绝对数据流向是：

`Client Form -> Server Action(processFormData) -> Supabase Storage(saveFile) -> public URL -> Zod 校验 -> Prisma -> PostgreSQL`

真实依据：

- `src/features/caregivers/actions.ts`
- `src/lib/file-storage.ts`

关键行为：

- 单文件字段：`avatarUrl`、`idCardFrontUrl`、`idCardBackUrl`
- 多文件字段：`healthCertImages`、`lifeImages`
- 上传成功后写入 URL
- 然后把数组字段序列化后存进字符串列

### 6.2 时间线图片链

护理员时间线的图片也走同一上传底座：

`Timeline Server Action -> saveFile(file, "timeline") -> Supabase Storage bucket(caregivers) -> public URL -> imageUrls JSON 字符串`

### 6.3 订单与财务链

订单和财务的主链为：

`Client Form -> Server Action -> 业务校验/防冲突/金额计算 -> Prisma -> PostgreSQL -> revalidatePath`

## 7. 核心业务规则

### 7.1 日薪计算规则

订单与财务模块当前都遵循 26 天月薪折算规则：

- 优先级：`dailySalary` 优先于 `monthlySalary / 26`
- 若订单未提供日薪，则使用订单月薪折算
- 若订单月薪也缺失，则回退到护理员 `monthlySalary / 26`

对应实现落点：

- `src/features/orders/actions.ts`
- `src/features/orders/components/order-form.tsx`
- `src/features/finance/actions.ts`

### 7.2 订单总金额规则

订单总金额的核心公式为：

`totalAmount = dailyRate * effectiveDays + managementFee`

其中：

- `baseDays = differenceInDays(endDate, startDate) + 1`
- `effectiveDays = baseDays + adjustments`
- `managementFee` 单独累加

### 7.3 订单防冲突规则

当前实际判定逻辑位于 `src/features/orders/actions.ts` 的 `checkCaregiverAvailability`：

- 忽略具体时分秒前会先标准化为 `startOfDay` / `endOfDay`
- 仅排除状态为 `CANCELLED` 的订单
- 重叠条件：
  `existing.startDate <= newEnd AND existing.endDate >= newStart`

这意味着：

- `COMPLETED` 订单也表示该时间曾被占用
- 新订单创建和更新时都必须执行重叠检查

### 7.4 跨月财务结算规则

当前结算逻辑位于 `src/features/finance/actions.ts`：

- 目标月份区间：`startOfMonth(month)` 到 `endOfMonth(month)`
- 订单需满足与目标月份有交集：
  `order.startDate <= monthEnd AND order.endDate >= monthStart`
- 月内有效结算区间：
  `calcStart = max(order.startDate, monthStart)`
  `calcEnd = min(order.endDate, monthEnd)`
- 计费天数：
  `differenceInDays(calcEnd, calcStart) + 1`
- 若订单结束日晚于月末，则该条结算标记为 `PARTIAL`
- 若该月份该护理员已经存在 `SalarySettlement`，则不会再次进入候选列表，避免二次结算

### 7.5 结算回写规则

生成或更新护理员月结后，会把结算结果同步回写到订单 `customData.settlementHistory`，并将订单 `paymentStatus` 更新为 `PAID`。

这构成当前的双写事实：

- 月度汇总保存在 `SalarySettlement`
- 订单级追溯保存在 `Order.customData`

## 8. 护理员模块专题

### 8.1 表单处理

`processFormData` 负责把 `FormData` 归一化成 schema 可消费的数据结构，包含：

- 单图上传
- 多图上传
- 布尔转换
- 数字转换
- 日期透传
- JSON 字符串解析

### 8.2 查询与过滤

`getCaregivers` 支持以下筛选：

- 分页
- 关键字搜索：姓名、手机号、身份证、工号
- 年龄区间
- 籍贯
- 性别
- 住家状态
- 学历
- 培训生状态
- 状态
- 经验区间
- 多选标签字段的 `AND` / `OR` 组合过滤

说明：这些多选过滤当前仍是基于字符串字段的 `contains` 查询，不是 PostgreSQL 原生数组查询。

## 9. 订单模块专题

### 9.1 状态与派单

创建订单时会：

- 校验家政员是否存在
- 检查时间冲突
- 解析薪资配置
- 计算总金额
- 通过事务创建订单
- 同时把护理员状态更新为 `BUSY`

### 9.2 动态字段与附加信息

订单的非核心表单字段会通过 `serializeCustomData` 写入 `customData`，读取时再通过 `deserializeCustomData` 恢复。

## 10. 上传基础设施专题

### 10.1 `file-storage.ts`

当前唯一有效的上传实现位于 `src/lib/file-storage.ts`：

- 使用 `createClient` 初始化 Supabase 客户端
- 基于环境变量注入 URL 和 key
- 上传目标桶：`caregivers`
- 路径格式：`${folder}/${filename}`
- 文件名策略：时间戳 + 清洗后的原始文件名
- 上传选项：`upsert: false`
- 返回：`getPublicUrl(filePath).data.publicUrl`

### 10.2 禁止回退本地写盘

本仓库当前不接受以下模式：

- `fs.writeFile`
- `fs/promises`
- `mkdir`
- `unlink`
- `createWriteStream`
- 把业务媒体写入 `public/uploads`

## 11. 工程治理约束

### 11.1 类型与注释

- 新代码必须有明确类型。
- 金额、日期、状态流转、序列化、上传链路必须有中文注释。
- 前端组件必须保持受控和强类型。

### 11.2 换行符治理

当前仓库已引入：

`* text=auto eol=lf`

因此：

- 提交前不得批量制造 CRLF 扰动。
- Windows / WSL 混合开发必须以 LF 为最终入库格式。

### 11.3 文档治理

旧文档中凡是以 MSSQL、本地上传、未打通 file-storage 为前提的内容，均视为失效历史材料。

## 12. Delta Log

### 最新增量

- 已彻底抹除跨平台 CRLF 扰动，并以 `.gitattributes` 固化 LF。
- 已移除 `public/uploads` 历史包袱，仓库不再承载本地上传资产。
- 已清理无用冗余文件 `src/lib/upload.ts`，上传架构统一收敛到 `src/lib/file-storage.ts`。

### 当前仍存在的结构性现实

- PostgreSQL 已启用，但数组字段仍走 JSON 隧道。
- `idString` 与 `id` 的非对称主键历史仍在，短期内不能粗暴统一。
- Prisma Client 在代码中同时以 `prisma` 和 `db` 两个导出名被使用，这是现状兼容层，不应在无计划情况下随意重写。

## 13. 维护建议

- 新功能优先沿用现有云架构，不要引入第二套上传或数据访问路径。
- 若未来要把 JSON 隧道迁移为 PostgreSQL 原生 `Json` 或数组字段，必须连同 schema、读写逻辑、筛选逻辑、导入导出逻辑一起整体迁移。
- 若未来要统一 `idString` / `id`，必须先完成全量关联审计，再进行迁移。
