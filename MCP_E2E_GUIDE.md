# MCP E2E 自动化测试手册
建议保存为：`docs/MCP_E2E_GUIDE.md`

## 1. 文档目标
本手册用于固化当前仓库已经验证成功的全局 MCP E2E 自动化测试方案，确保后续任何协作者、AI 代理、自动化脚本都能沿用同一套稳定架构，而不是重新踩坑。

这份手册覆盖两件事：
1. 如何使用 `@playwright/test` 做确定性回归测试。
2. 如何使用 In-Process Playwright MCP Wrapper 让大模型以“探针”方式读取真实页面状态、DOM、Console、Accessibility Tree，并在不依赖截图的前提下执行诊断。

本方案的核心不是“让 AI 看页面”，而是“让 AI 只读取真实、可验证、结构化的页面信号”。

---

## 2. Core Architecture
### 2.1 双轨制防线
当前全局 E2E 架构采用双轨制：
1. `@playwright/test`
   - 负责确定性回归。
   - 负责稳定、可重复、可 CI 的断言。
   - 负责关键业务链路的自动化验收。
   - 适合登录、表单提交、列表筛选、状态流转、权限控制等“必须可回归”的路径。

2. MCP Wrapper
   - 负责大模型探针。
   - 负责将浏览器能力暴露给 AI，让 AI 在真实浏览器上下文中检查页面。
   - 负责读取 DOM、Console、Network、Accessibility Tree、运行 `evaluate`。
   - 适合排查“页面好像坏了但我不知道坏在哪里”“某个组件是否崩溃”“某段交互是否挂死”“控制台是否报错”等问题。

结论：
- `@playwright/test` 是回归武器。
- MCP Wrapper 是诊断探针。
- 前者解决“是否稳定通过”。
- 后者解决“为什么坏、坏在哪、当前真实页面长什么样”。

这两条线不能互相替代。

### 2.2 绝对视觉盲区
本架构最重要的设计原则是：**绝对视觉盲区**。

意思是：
- 主动剔除 screenshot 能力。
- 不让 AI 依赖截图理解页面。
- 不让 AI 对像素、布局、视觉样式进行脑补。
- 强制 AI 依赖结构化页面信号进行推理。

本仓库的真实做法已经落地在以下几层：
1. `playwright.config.ts`
   - `screenshot: "off"`
   - `video: "off"`
   - trace 中也关闭截图快照

2. `scripts/playwright-mcp-wrapper.mjs`
   - 显式过滤 screenshot 相关工具
   - 阻断一切 screen capture 变体调用
   - 只允许结构化探针能力通过

### 2.3 为什么必须拒绝截图
截图方案的最大问题不是慢，而是**幻觉放大**：
- 大模型会对模糊视觉结果做想当然推断。
- 页面骨架屏、异步抖动、遮罩层、滚动区域、弹层覆盖，都可能误导视觉判断。
- 一个“看起来像按钮”的元素，未必可点击。
- 一个“看起来空白”的区域，可能真实 DOM 已存在，只是 CSS 没渲染出来。
- 一个“看起来表单没报错”的页面，Console 可能已经炸了。

因此本方案明确采用：
- DOM 提取
- Accessibility Tree
- Console 日志
- `evaluate`
- 精确 selector / locator
- 受控交互结果

来替代截图理解。

### 2.4 结构化真相优先级
当 AI 使用 MCP 探针时，页面真相优先级应固定为：
1. 当前 DOM
2. Accessibility Tree
3. Console / Runtime Error
4. Network 请求
5. `evaluate` 返回结果
6. 交互动作后的页面状态变化

禁止把“视觉直觉”当成事实源。

---

## 3. 系统组成
当前仓库内相关基建组件如下：

### 3.1 Playwright Test 主配置
文件：
- `playwright.config.ts`

关键事实：
- `baseURL` 固定为 `http://127.0.0.1:3000`
- `globalSetup` 已接入 `tests/e2e/global.setup.ts`
- `screenshot: "off"`
- `video: "off"`
- `trace: "retain-on-failure"`
- 浏览器项目使用 `chromium`

这意味着测试与探针都围绕固定端口 `3000` 运行，不接受“随机改端口后继续跑”。

### 3.2 E2E 启动防线
文件：
- `tests/e2e/global.setup.ts`

该文件已承担以下职责：
- 检查 `3000` 端口是否已被占用
- 如果端口被非当前工作区进程占用，则直接失败
- 如果当前仓库服务未启动，则自动拉起 `npm run dev:fixed`
- 轮询等待 `http://127.0.0.1:3000` 就绪
- 将 dev server 状态写入 runtime artifacts

这层防线的意义是：
- 不允许测试静默切到别的端口
- 不允许误连到错误服务
- 不允许“测试看起来通过，其实打到了别的项目”

### 3.3 In-Process MCP Wrapper
文件：
- `scripts/playwright-mcp-wrapper.mjs`

它不是简单的 CLI 转发器，而是一个定制化 Wrapper，核心职责包括：
1. 在当前进程内复用 Playwright backend
2. 通过标准 MCP over stdio 与 Codex 交互
3. 过滤 screenshot 工具
4. 记录 stdin/stdout/stderr 黑匣子日志
5. 规避上游 transport 差异
6. 优先复用本地已缓存 Chromium，避免强依赖系统级 Chrome

这也是本架构最终稳定的根本原因之一。

---

## 4. Pre-flight & Launch Protocol
这一节是强制启动闭环。任何人执行 MCP E2E 探针前，都必须按以下顺序操作。

### 4.1 第一步：正确拉起靶机
必须执行：
```bash
npm run dev:fixed
```

原因：
- 该命令显式锚定 3000 端口。
- 当前 playwright.config.ts 的 baseURL 就是 http://127.0.0.1:3000。
- MCP 探针、E2E 测试、人工排查必须共享同一靶机地址。
- 如果你使用 npm run dev，Next.js 可能在端口占用时自动漂移到 3001、3002 等端口，导致探针、测试、人工观察三者脱钩。

当前 package.json 中真实脚本如下：
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:fixed": "next dev --port 3000",
    "test:e2e": "playwright test",
    "mcp:playwright": "node scripts/playwright-mcp-wrapper.mjs"
  }
}
```

结论：
- 靶机启动命令只能优先使用 npm run dev:fixed
- 3000 是契约，不是建议

### 4.2 第二步：挂载探针
推荐使用 codex mcp add 直接挂载本仓库 Wrapper。

精确命令：
```bash
codex mcp add playwright-wrapper node /home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs
```

如果需要重新确认绝对路径，可先执行：
```bash
pwd
```

当前仓库根路径应为：
`/home/addaswsw/project/housekeeping_service`

### 4.3 推荐的 MCP 配置关注点
如果你的客户端支持 MCP 启动配置，建议确保以下语义成立：
```
command = "node"
args = ["/home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs"]
startup_timeout_sec = 60
```

其中最关键的是：
- command = "node"
- args 指向 scripts/playwright-mcp-wrapper.mjs
- startup_timeout_sec = 60

### 4.4 为什么要强制 60 秒启动超时
原因不是为了更快，而是为了避免“假挂起”：
- Wrapper 如果因内核缺失、浏览器依赖缺失、transport 卡死、stdio 握手异常而未成功启动，客户端常表现为长时间无响应。
- 如果超时过短，复杂环境下会误判。
- 如果超时过长，用户会误以为系统还在工作。

60 秒是当前验证下来较稳的折中值。

### 4.5 第三步：验证探针是否存活
挂载后，建议先让 AI 做最小探针动作，而不是一上来跑复杂场景。

例如：
- 导航到登录页
- 读取标题
- 提取页面主表单结构
- 输出 Console 日志
- 输出关键按钮是否存在

只有最小探针成功，才进入复杂交互。

---

## 5. 标准执行闭环
推荐按照以下顺序执行 MCP E2E 诊断：
1. 启动 npm run dev:fixed
2. 挂载 playwright-wrapper
3. 让 AI 先导航到目标页面
4. 让 AI 读取 DOM 和 Accessibility Tree
5. 让 AI 检查 Console 是否有报错
6. 再执行交互，例如输入、点击、提交
7. 交互后再次读取 DOM / Console / Network
8. 最后让 AI 给出基于结构化证据的结论

不要把顺序反过来。
不要一开始就让 AI“看一眼页面哪里坏了”。

---

## 6. 顶级 Prompt 调教指南
这一节给出标准化探针指令模板。目标不是文学表达，而是让 AI 明确调用正确原子工具。

### 6.1 Prompt 总原则
发指令时，要显式要求 AI：
- 使用 evaluate
- 使用 locator
- 使用 Maps
- 读取 Console
- 提取 DOM
- 基于 Accessibility Tree 判断组件结构
- 不使用 screenshot
- 不依赖视觉猜测

其中 Maps 的用途是：
- 保存页面组件状态映射
- 保存 selector 到状态的对应关系
- 保存表单字段检查结果
- 保存错误日志与页面节点的关联

这样能显著降低 AI 的上下文漂移。

---

## 7. 标准化探针指令模板
### 7.1 模板一：检查表单提交流程
适用场景：
- 登录表单
- 新建护理员表单
- 编辑订单表单
- 任意 Server Action 提交流程

可直接使用如下指令：
```
请使用 Playwright MCP 作为结构化探针，不要使用 screenshot。
先访问目标页面，然后用 locator 和 evaluate 提取表单结构。
请用一个 Map 记录每个字段的：
1. 字段名
2. 输入控件类型
3. 是否可见
4. 是否 disabled
5. 默认值
6. 是否存在校验提示

然后执行一次完整表单提交流程：
- 填写必填字段
- 点击提交
- 观察 URL 是否变化
- 读取 Console 日志
- 读取页面中的错误提示或成功提示
- 如果提交失败，请输出失败发生在前端校验、网络请求还是服务端响应阶段

最后只基于 DOM、Accessibility Tree、Console 和 evaluate 结果给出结论，不要做视觉推断。
```

### 7.2 模板二：检查页面组件是否崩溃
适用场景：
- 页面白屏
- 某个表格不渲染
- 某个弹窗打不开
- 某个卡片组件明显坏掉

可直接使用如下指令：
```
请使用 Playwright MCP 检查该页面的目标组件是否崩溃，不要调用 screenshot。
要求：
- 先读取 Console 日志
- 用 locator 定位目标组件根节点
- 用 evaluate 提取该节点的 innerHTML、textContent、data-* 属性、aria 属性
- 读取 Accessibility Tree 中该组件对应的结构
- 用 Map 记录：
  1. 组件根节点是否存在
  2. 是否可见
  3. 是否包含错误边界提示
  4. 是否包含空状态提示
  5. 是否存在 hydration / runtime error 迹象

如果 Console 中有异常，请按错误类型分类输出。
最后判断是：
- 组件未挂载
- 组件挂载了但数据为空
- 组件渲染异常
- 组件被上层状态或样式阻断
```

### 7.3 模板三：检查交互后控制台和网络副作用
适用场景：
- 点击按钮后无反应
- 提交后 toast 不出现
- 页面静默失败
- 某个弹窗点确认后没有结果

可直接使用如下指令：
```
请使用 Playwright MCP 对该交互做一次副作用诊断，不要使用 screenshot。
步骤：
- 导航到目标页面
- 记录交互前的 URL、关键 DOM 状态、Console 日志基线
- 执行目标交互
- 再次读取 URL、DOM、Console、Network
- 用 Map 对比交互前后变化

请重点回答：
1. 点击是否真实触发
2. 目标按钮是否被 disabled / overlay / loading 阻断
3. 是否发出了网络请求
4. 是否出现前端报错
5. 页面是否出现成功或失败提示
6. 交互结果是否与预期一致
```

---

## 8. Prompt 编写硬约束
给 AI 下发指令时，建议强制包含以下约束语句：
```
不要使用 screenshot。
必须优先使用 evaluate、locator、Console、Accessibility Tree。
请用 Map 保存检查结果，避免遗漏字段。
如果结论不足，请先补采样再下结论。
```

### 8.1 推荐的原子能力清单
在 prompt 中可直接点名这些原子能力：
- locator
- evaluate
- browser_console_messages
- browser_network_requests
- browser_navigate
- browser_click
- browser_type
- browser_wait_for

### 8.2 为什么要显式点名原子工具
因为如果不点名，AI 可能：
- 跳过 Console
- 不读取交互前后差异
- 不建立字段级状态映射
- 在证据不足时直接给出猜测性结论

显式要求工具，相当于把推理路径约束住。

---

## 9. 推荐的探针流程模板
### 9.1 页面首次诊断
1. 导航
2. 读 Console
3. 读 DOM
4. 读 Accessibility Tree
5. 定位关键区域
6. 输出结构化结论

### 9.2 交互型诊断
1. 记录交互前状态
2. 执行动作
3. 等待稳定
4. 再读 Console / DOM / Network
5. 对比变化
6. 输出阶段性失败点

### 9.3 表单型诊断
1. 枚举字段
2. 记录默认值
3. 填写必填项
4. 触发提交
5. 检查校验提示
6. 检查请求与返回
7. 检查提交结果

---

## 10. 常见深水区避坑指南
这一节记录真实踩坑后的黑魔法结论。

### 10.1 60 秒死锁陷阱
现象：
- MCP 客户端挂载后长时间无响应
- 看起来像连接成功了，但没有任何工具返回
- 或者第一次调用就卡住

建议配置：
```
startup_timeout_sec = 60
```

原因：
- Wrapper 初始化时可能涉及 Playwright backend 启动、浏览器可执行文件检测、stdio 握手、工具枚举。
- 超时过短时，客户端容易误判为启动失败。
- 某些 transport 异常会表现为“既不报错，也不继续”。

标准处理：
1. 先确认 startup_timeout_sec = 60
2. 再确认 Wrapper 进程是否真实启动
3. 再检查浏览器依赖是否齐全
4. 再检查 stdout/stderr 是否被污染

### 10.2 内核丢失陷阱
现象：
- Wrapper 已启动，但浏览器无法拉起
- 提示找不到 Chromium
- 提示缺少 Linux 依赖
- 默认尝试去找 /opt/google/chrome/chrome

标准修复命令：
```bash
npx playwright install --with-deps chromium
```

为什么必须这样做：
- 当前 Wrapper 优先走本地 Playwright Chromium，而不是系统级 Chrome。
- Linux 环境下，单纯安装 npm 包并不等于浏览器内核和系统依赖已经齐全。
- --with-deps 会同时补浏览器和依赖库，避免“有包无内核”或“有内核无依赖”。

本仓库 Wrapper 中已经有一层防线：
- 会优先设置 PLAYWRIGHT_MCP_BROWSER=chromium
- 会优先尝试本地缓存 Chromium executable
- 目的是绕过系统 Chrome 的硬编码依赖

但如果本地 Chromium 压根没装，这层防线也无能为力。

### 10.3 端口幽灵占用
现象：
- 你以为正在测试当前项目，实际上连到了别的服务
- npm run dev 自动跳到了 3001
- Playwright 还在打 3000
- MCP 探针和人工浏览器看的不是同一靶机

排查命令：
```bash
ss -tlnp | grep 3000
```

当前仓库 tests/e2e/global.setup.ts 已做了防线：
- 会检查 3000 是否被占用
- 会尝试识别占用进程是否属于当前工作区
- 若发现是非当前工作区进程占用，则直接报错退出
- 拒绝静默切换端口

结论：
- 3000 端口被占用不是小问题，而是环境污染
- 不要靠“换个端口继续跑”来掩盖问题
- 应先清理占用，再执行 npm run dev:fixed

### 10.4 stdout 污染陷阱
现象：
- MCP 握手失败
- 工具列表异常
- 客户端解析报文错误
- 看似随机失败

根因：
- MCP over stdio 对 stdout 非常敏感
- 任何无关日志写到 stdout，都会污染协议帧

本仓库 Wrapper 的处理方式：
- 只允许真正的协议帧写 stdout
- 其他 stdout 内容重定向到 stderr
- 记录黑匣子日志方便排查

结论：
- MCP 不是普通 CLI
- stdout 必须被当成“协议总线”，不是调试输出通道

### 10.5 transport 差异陷阱
现象：
- 同样的 Playwright MCP，在不同客户端表现不一致
- 某些 CLI 能跑，某些原生客户端卡住
- 某些封装转发后工具缺失

根因：
- 上游 CLI transport、stdio framing、代理层封装存在差异
- 外层再套一层中转，容易引入协议噪音和时序问题

最终正确架构：
- 使用 In-Process Wrapper
- 直接在当前进程内复用 Playwright backend
- 避免额外 transport 转发层

这是当前方案稳定的关键。

### 10.6 “看起来像没问题”陷阱
现象：
- 页面能打开
- 按钮也在
- 但交互就是没结果

真正需要检查的是：
1. Console 是否报错
2. 按钮是否 disabled
3. 是否有 loading 覆盖层
4. 是否真的发出请求
5. Server Action 是否抛错
6. 提交结果是否被页面刷新、重定向或错误边界吞掉

所以诊断不能停在“元素存在”。

---

## 11. 推荐的排障顺序
当 MCP 探针异常时，按以下顺序排查。

### 11.1 第一层：靶机是否正确
检查：
```bash
npm run dev:fixed
```

再检查：
```bash
ss -tlnp | grep 3000
```

确认：
- 3000 上确实是当前仓库的 Next dev
- 没有被其他项目占用
- 没有偷偷漂移到 3001

### 11.2 第二层：浏览器内核是否完整
执行：
```bash
npx playwright install --with-deps chromium
```

确认：
- Chromium 已安装
- Linux 依赖已安装
- Wrapper 不会退化去找系统 Chrome

### 11.3 第三层：MCP 挂载是否正确
确认挂载命令是：
```bash
codex mcp add playwright-wrapper node /home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs
```

检查：
- 路径是否是绝对路径
- node 是否可用
- startup_timeout_sec 是否设为 60

### 11.4 第四层：最小探针是否通过
先不要跑复杂交互。
先让 AI：
1. 打开页面
2. 读取标题
3. 输出 Console
4. 定位一个已知按钮或表单

如果连这一步都失败，就说明不是业务 bug，而是基建问题。

---

## 12. 推荐的日常使用姿势
### 12.1 确定性回归
执行：
```bash
npm run test:e2e
```

适合：
- PR 回归
- CI 验收
- 核心链路守护

### 12.2 AI 探针诊断
适合：
- 页面局部异常
- 无法快速复现的前端 bug
- 需要读取真实 DOM / Console / A11y 结构
- 想让 AI 帮你做浏览器内诊断

### 12.3 二者协作方式
推荐流程：
1. 先用 MCP 探针定位问题根因
2. 再把问题固化成 @playwright/test 用例
3. 把临时诊断能力转化为长期回归资产

这才是可持续的工程方式。

---

## 13. 反模式清单
以下做法禁止复活。

### 13.1 禁止依赖 screenshot 做主判定
原因：
- 容易幻觉
- 不稳定
- 难复现
- 证据链弱

### 13.2 禁止随机端口
原因：
- 靶机不一致
- 测试与探针脱钩
- 人工排查失真

### 13.3 禁止把 MCP 当成纯视觉代理
原因：
- 它的真正价值在结构化读取和精准交互
- 不是“替你看图”

### 13.4 禁止忽略 Console
原因：
- 大量页面问题在 DOM 层未必直接显现
- 但 Console 往往会直接暴露 runtime/hydration/request 错误

### 13.5 禁止省略最小探针验证
原因：
- 一上来跑复杂流程，很难区分是业务 bug 还是 MCP 环境没起来

---

## 14. 一套推荐的完整实战流程
以下流程适合日常执行。

### 14.1 启动靶机
```bash
npm run dev:fixed
```

### 14.2 检查端口
```bash
ss -tlnp | grep 3000
```

### 14.3 挂载 MCP Wrapper
```bash
codex mcp add playwright-wrapper node /home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs
```

### 14.4 先做最小探针
对 AI 下发：
```
请使用 Playwright MCP 打开登录页，不要使用 screenshot。
先读取页面标题、主表单 DOM、Console 日志，并确认提交按钮是否存在且可交互。
```

### 14.5 再做链路探针
对 AI 下发：
```
请继续检查登录表单提交流程。
要求使用 locator、evaluate、Console，并用 Map 记录每个字段状态。
执行一次登录提交后，比较交互前后的 URL、DOM 和 Console 变化。
```

### 14.6 最后沉淀成回归用例
当问题确认后，把它写入 @playwright/test，形成确定性守护。

---

## 15. 结论
当前已经验证成功的正确架构不是“Playwright + AI”这么简单，而是：
- 固定靶机端口：npm run dev:fixed
- 固定回归武器：@playwright/test
- 固定探针入口：scripts/playwright-mcp-wrapper.mjs
- 固定盲区原则：禁用 screenshot
- 固定真相来源：DOM + Accessibility Tree + Console + evaluate
- 固定环境防线：startup_timeout_sec = 60、npx playwright install --with-deps chromium、ss -tlnp

这套方案的真正价值在于：
- 把 AI 从“看图猜页面”升级为“读取真实浏览器状态”
- 把偶发排障能力沉淀成可重复的工程资产
- 把不稳定的视觉推断替换为结构化证据链

如果后续继续沿用本手册，就不需要再回到截图驱动、随机端口、transport 套 transport 的混乱时代。

---

## 16. 速查命令卡片
### 启动靶机
```bash
npm run dev:fixed
```

### 安装 Chromium 与 Linux 依赖
```bash
npx playwright install --with-deps chromium
```

### 挂载 MCP Wrapper
```bash
codex mcp add playwright-wrapper node /home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs
```

### 排查 3000 端口占用
```bash
ss -tlnp | grep 3000
```

### 跑 E2E 回归
```bash
npm run test:e2e
```

---

## 17. 关键文件索引
- playwright.config.ts
- tests/e2e/global.setup.ts
- scripts/playwright-mcp-wrapper.mjs
- package.json
```