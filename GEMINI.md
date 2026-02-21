# HouseCare-Pro (专业家政服务管理平台) - 架构与开发宪法

## 1. 系统架构与技术栈 (Architecture & Stack)
*   **核心框架**: Next.js 16.1.4 (App Router), TypeScript 5.x。
*   **目录规范 (Feature-based)**: 采用功能驱动的目录结构 `src/features/{feature}`。
    *   `components/`: UI 组件与局部逻辑。
    *   `actions.ts`: 所有的 Server Actions（业务逻辑核心）。
    *   `schemas.ts`: Zod 校验规则。
    *   `types.ts`: 类型定义。
*   **数据流**: `Client Component` -> `Server Action` -> `Zod Validation` -> `Prisma Client` -> `MSSQL`。
*   **ORM**: Prisma v5.10.2 (⚠️ **LOCKED**)。由于 MSSQL 驱动在某些 Prisma 版本下不稳定，严禁在未经过充分测试的情况下升级。

## 2. 数据库设计与规范 (Database Norms)

### A. "JSON 隧道" 策略 (JSON Tunnel)
由于 MSSQL 不原生支持 Scalar Arrays (字符串数组)，我们使用 `NVarChar(Max)` 存储序列化后的 JSON 字符串。
*   **涉及字段**: `Caregiver` 中的 `jobTypes`, `specialties`, `certificates`, `cookingSkills`, `languages`, `healthCertImages`, `lifeImages`。
*   **读写规范**:
    *   **写入**: 在 Server Action 中通过 `JSON.stringify()` 转化数组。
    *   **读取**: 在 Client Component 获取数据后，必须在 `defaultValues` 或展示逻辑中显式使用 `JSON.parse()`。
    *   **空值处理**: 严禁存储 `null`。如果数组为空，应存储 `[]` 或在读取时回退到 `[]`。

### B. ID 命名规范
为了区分不同模型的 ID 逻辑，我们采用了非对称命名：
*   **Caregiver**: 主键为 `idString` (CUID)。
*   **Order**: 主键为 `id` (CUID)。
*   **SalarySettlement**: 主键为 `id` (CUID)。
*   **CaregiverTimeline**: 主键为 `idString` (CUID)。
*   **原因**: 历史遗留与 MSSQL 迁移过程中的兼容性考量，开发时请务必确认 `where` 子句中的键名。

## 3. 核心业务逻辑 (Business Logic)

### A. 薪资计算引擎 (Salary Math)
*   **标准**: 系统默认按 **26天/月** 计算日薪。
*   **公式**: `DailyRate = MonthlySalary / 26`。
*   **精度控制**: 所有的日薪计算结果必须保留两位小数 (`.toFixed(2)`) 并转化回 `Number` 类型，以防止浮动汇率造成的财务误差。
*   **优先级**: 订单中的 `dailySalary` 具有最高优先级，若未定义则根据关联家政员的 `monthlySalary` 进行实时折算。

### B. 订单防冲突逻辑 (Order Overlap)
*   **维度**: 基于“天”的判定（忽略具体小时）。
*   **判定准则**: `(StartA <= EndB) && (EndA >= StartB)`。
*   **动作**: 只有状态非 `CANCELLED` 的订单会参与冲突判定。

### C. 财务结算逻辑 (Settlement)
*   **跨月处理**: 计算订单在目标月份内的“交集天数”（Intersection Days）。
*   **公式**: `(min(OrderEndDate, MonthEndDate) - max(OrderStartDate, MonthStartDate)) + 1`。

## 4. UI/UX 交互规范
*   **受控表单**: `OrderForm` 等组件的 `defaultValues` 严禁出现 `null`。所有可选字段必须回退到 `""` (String) 或 `0` (Number)，否则会触发 React 受控组件警告。
*   **性别/状态视觉**:
    *   **男**: `blue-600` / `bg-blue-100`。
    *   **女**: `pink-600` / `bg-pink-100`。
    *   **状态勋章**: `PENDING` (Secondary), `CONFIRMED` (Green), `COMPLETED` (Slate), `CANCELLED` (Destructive)。
*   **日期格式化**: 统一使用 `date-fns` 的 `format(date, 'yyyy-MM-dd')` 或 `yyyy年MM月dd日` (带 `zhCN` locale)。

---
*Architect: Gemini Agent*
