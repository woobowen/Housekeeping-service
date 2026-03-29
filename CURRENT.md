# CURRENT.md

## 商用级 Auth 重构实施蓝图

### 1. 目标

将当前基于硬编码凭证 + 明文 Cookie 的假登录体系，重构为可用于公网 MVP 的管理员鉴权系统。新体系只服务后台管理员，不污染现有业务 `User` 表。

核心目标：

1. 建立独立的管理员账号模型与验证码模型。
2. 使用邮箱验证码完成零成本注册闭环。
3. 使用密码哈希 + JWT HttpOnly Cookie 完成登录会话。
4. 使用中间件 + 服务端会话解析实现真实路由守卫。
5. 为后续 RBAC、审计日志、密码重置和多端会话治理预留边界。

### 2. 数据模型隔离方案

#### 2.1 新增管理员账号表 `AdminAccount`

新增独立模型，不复用业务 `User`：

- `id String @id @default(cuid())`
- `email String @unique`
- `phone String @unique`
- `passwordHash String`
- `role String`
- `status String @default("ACTIVE")`
- `emailVerifiedAt DateTime?`
- `lastLoginAt DateTime?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

设计原则：

1. `email` 是登录主身份标识。
2. `phone` 只负责唯一性校验与后续业务联系，不参与短信 OTP 成本链路。
3. `passwordHash` 只存哈希，不存明文或可逆密文。
4. `role` 先以字符串枚举实现，MVP 至少保留 `SUPER_ADMIN` / `ADMIN`。
5. 后续若需要冻结账号，可直接基于 `status` 扩展。

#### 2.2 新增验证码表 `VerificationCode`

用于邮箱验证码、防刷、过期和一次性消费控制：

- `id String @id @default(cuid())`
- `email String`
- `codeHash String`
- `type String`
- `expiresAt DateTime`
- `consumedAt DateTime?`
- `createdAt DateTime @default(now())`

索引与约束方向：

1. 基于 `email + type + createdAt` 查询最近发送记录，实现 60 秒限流。
2. 基于 `email + type + consumedAt + expiresAt` 查询当前有效验证码。
3. 验证码只存 `codeHash`，不落明文，防止数据库泄露后被直接利用。

### 3. 注册与登录策略

#### 3.1 注册

注册页 `/register` 必填：

- 手机号
- 邮箱
- 密码
- 邮箱验证码

服务端注册流程：

1. Zod 校验输入格式。
2. 检查 `AdminAccount.email` / `AdminAccount.phone` 是否重复。
3. 校验验证码是否存在、未消费、未过期、类型匹配。
4. 使用 `bcrypt` 或 `argon2` 生成密码哈希。
5. 创建 `AdminAccount`。
6. 标记验证码为已消费。
7. 引导跳转 `/login` 完成首次登录。

#### 3.2 登录

登录页 `/login` 使用：

- 邮箱
- 密码

服务端登录流程：

1. Zod 校验输入。
2. 按邮箱查询 `AdminAccount`。
3. 校验 `status` 是否允许登录。
4. 使用哈希校验函数对比密码。
5. 签发 JWT Session。
6. 写入 HttpOnly Cookie。
7. 更新 `lastLoginAt`。

### 4. 防重放与防爆破设计

#### 4.1 密码哈希

采用 `bcryptjs` 或 `argon2`：

1. 注册时使用安全成本参数生成哈希。
2. 登录时使用常量时间比较函数校验密码。
3. 代码内绝不出现明文默认管理员账号。

MVP 取舍：

- 若部署环境对原生依赖敏感，优先 `bcryptjs`，降低构建摩擦。
- 若环境稳定且允许原生依赖，可切换到 `argon2`。

#### 4.2 邮箱验证码防刷

发送接口 `/api/auth/send-code` 执行：

1. 校验邮箱格式。
2. 查询该邮箱同类型验证码最近 60 秒内是否已发送。
3. 若命中限流，返回中文错误。
4. 生成 6 位验证码。
5. 只保存验证码哈希与过期时间，例如 10 分钟。
6. 发送成功或进入模拟发送兜底后，再返回成功。

#### 4.3 验证码防重放

1. 每个验证码只允许使用一次。
2. 注册成功后立即写入 `consumedAt`。
3. 校验时只接受最近一条未消费、未过期记录。
4. 过期验证码即使哈希匹配也拒绝。

### 5. 高强度会话层

放弃现有 `auth_session=true` 明文 Cookie，改为：

1. 使用 `jose` 签发强签名 JWT。
2. Cookie 名称改为 `admin_session`。
3. Cookie 仅通过 HttpOnly + SameSite + Secure 下发。
4. JWT Payload 至少包含：
   - `sub`：管理员 ID
   - `email`
   - `role`
5. JWT 设置明确过期时间，例如 7 天。
6. 中间件与服务端共用统一解析函数。

环境变量规划：

- `AUTH_JWT_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

开发兜底：

1. 若未配置 SMTP，则打印系统级模拟邮件日志到终端。
2. 若未配置 `AUTH_JWT_SECRET` 且处于开发环境，允许使用仅限本地的兜底 secret，并打印警告。
3. 生产环境必须要求显式 `AUTH_JWT_SECRET`。

### 6. 路由守卫重构

重写 `src/middleware.ts`：

1. 放行公开路由：
   - `/login`
   - `/register`
   - `/api/auth/send-code`
   - `/_next/*`
   - `/favicon.ico`
2. 对其余后台页面解析并校验 JWT。
3. 无有效会话则跳转 `/login`。
4. 已登录用户访问 `/login` 或 `/register` 时反向跳转 `/`。

同时补一层服务端读取工具，供 Layout / Server Action 做防御式校验。

### 7. 文件落位规划

#### 7.1 Prisma

- `prisma/schema.prisma`
- `prisma/migrations/*`

#### 7.2 Auth 基础设施

- `src/lib/auth/password.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/verification.ts`
- `src/lib/auth/mailer.ts`

#### 7.3 Auth Feature

- `src/features/auth/schema.ts`
- `src/features/auth/actions.ts`

#### 7.4 路由与页面

- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/api/auth/send-code/route.ts`
- `src/middleware.ts`

### 8. 自动化验收路径

最终用 Playwright MCP 验证以下闭环：

1. 访问 `/register`。
2. 填写邮箱并请求验证码。
3. 从终端日志读取模拟邮件验证码。
4. 完成注册。
5. 跳转或进入 `/login`。
6. 使用新邮箱 + 密码登录。
7. 成功访问 `/` 与其他受保护后台页面。
8. 验证未登录访问私有路由时会被打回 `/login`。

### 9. 明确废止项

以下旧实现必须彻底失效：

1. `吴博闻 / 123456` 硬编码凭证。
2. `auth_session=true` 明文 Cookie。
3. 仅凭 Cookie 存在性判断已登录的中间件逻辑。
4. 将业务 `User` 表误当作管理员认证表的任何做法。
