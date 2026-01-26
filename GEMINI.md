# HouseCare-Pro (Housekeeping Service) - Architect's Handoff Document

## 1. Project Overview & Tech Stack

*   **Project:** HouseCare-Pro (专业家政服务管理平台)
*   **Framework:** Next.js 16.1.4 (App Router, Turbopack)
*   **Database:** Microsoft SQL Server (MSSQL)
*   **ORM:** Prisma v5.10.2 (⚠️ **STRICTLY LOCKED** - 不得升级，以保持 MSSQL 稳定性)
*   **UI:** Tailwind CSS v4, Shadcn/UI (基于 Radix UI)
*   **Language:** TypeScript
*   **Key Strategy:** 
    *   **Server Actions:** 全面采用 Server Actions 进行数据处理。
    *   **URL-Driven State:** 列表页的筛选、搜索、分页完全由 URL 参数驱动，确保状态可分享且刷新不丢失。
    *   **"JSON Tunnel" for MSSQL:** 由于 SQL Server 不支持标量数组 (`String[]`)，所有集合字段均存储为 `NVarChar(Max)` 的 JSON 字符串。

## 2. Feature Status Matrix (Current State)

| 模块 | 功能状态 | 技术细节 |
| :--- | :--- | :--- |
| **Caregiver (V2.0)** | ✅ 完成 | 包含 `jobTypes`, `certificates`, `birthDate`, `nativePlace` 等新 Schema 字段。 |
| **Filter UI** | ✅ 完成 | 实现了 `ComprehensiveFilter` (标签云风格) 和 `MultiSelectLogic` (下拉多选组件)。 |
| **Advanced Filter** | ✅ 完成 | 支持 **AND/OR 逻辑切换**。通过 URL 参数 `jobTypeMode` 控制多选字段的交集/并集查询。 |
| **Order (Phase 1)** | ✅ 完成 | 已建立 `User` (客户) 与 `Order` (订单) 模型。支持 1:n 关联。 |
| **Dynamic Status** | ✅ 完成 | `getCaregivers` 会根据活跃订单自动将阿姨状态覆写为 **"服务中"**。 |
| **Database** | ✅ 完成 | 已执行 `init_order_module` 迁移，并生成了涵盖各种忙闲场景的 Seed 数据。 |

## 3. Critical Logic Chains (核心逻辑链路)

### A. Dynamic Availability (自动忙闲逻辑)
*   **输入:** 在执行 `getCaregivers` 时，系统会检查当前日期。
*   **处理:** 使用 Prisma `include` 关联查询该阿姨的订单：
    *   条件：`status: 'CONFIRMED'` 且 `startDate <= Today <= endDate`。
*   **输出:** 
    *   如果存在匹配订单，返回给前端的 `status` 字段会被强制覆写为 **"服务中" (In Service)**。
    *   如果不存在，则保留数据库原有的 `status` (如 "待岗", "请假")。
*   **精度:** 天级精度 (Day Precision)。

### B. JSON Tunnel Strategy (MSSQL 兼容方案)
*   **存储:** `jobTypes`, `certificates`, `specialties`, `cookingSkills`, `languages` 全都以 JSON 字符串形式存入 `@db.NVarChar(Max)`。
*   **查询:** 
    *   **OR 模式:** 使用 Prisma 的 `contains` 操作符生成 `{ OR: [ { field: { contains: val1 } }, ... ] }`。
    *   **AND 模式:** 动态构建多个 `contains` 条件放入 `AND` 数组。
*   **映射:** Server Action 必须显式解析 JSON 字符串为数组后再返回。

## 4. Minefield Map (排雷指南 - 开发者必读)

1.  **Strict Rule: No Spread Operator!**
    *   在 Server Action 返回数据给 Client Component 时，**严禁使用 `{ ...caregiver }`**。
    *   **原因:** Prisma 返回的对象可能包含 `undefined` 或未解析的 JSON 字符串，会导致 Next.js 序列化错误或前端解析失败。必须逐个字段显式映射。
2.  **Async Params (Next.js 16):**
    *   `page.tsx` 中的 `params` 和 `searchParams` 是 **Promise**。
    *   **必须使用** `const searchParams = await props.searchParams`。
3.  **MSSQL JSON Search:**
    *   由于是字符串搜索，确保存储时 JSON 格式统一（如 `["月嫂"]`）。
4.  **Redirect Pattern:**
    *   `redirect()` 必须放在 `try/catch` 块外部，因为它通过抛出错误实现跳转。

## 5. Next Immediate Tasks (待办事项)

1.  **Order Creation UI:** 开发下单页面，允许客户选择日期范围并指定阿姨。
2.  **Conflict Validation:** 在创建订单前，需复用 `getCaregivers` 的逻辑校验阿姨在该时间段是否已有重叠订单。
3.  **Caregiver Detail V2:** 更新阿姨详情页，展示其历史订单和排期日历。

---
*Last Updated: 2026-01-26*
*Current Architect: Gemini Agent*
