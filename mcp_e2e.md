# MCP E2E 使用说明

## 1. 启动项目

先在仓库根目录启动开发服务，固定使用 3000 端口：

```bash
npm run dev:fixed
```

可选自检：

```bash
curl -I http://localhost:3000
```

## 2. 挂载 Playwright MCP Wrapper

在 Codex 中挂载：

```bash
codex mcp add playwright-wrapper node /home/addaswsw/project/housekeeping_service/scripts/playwright-mcp-wrapper.mjs
```

确认配置：

```bash
codex mcp list
codex mcp get playwright-wrapper
```

## 3. Linux / WSL 必做依赖

如果是 Linux 或 WSL，先安装 Chromium：

```bash
npx playwright install --with-deps chromium
```

## 4. 给 AI 的使用要求

告诉 AI：

- 使用 Playwright MCP 访问 `http://localhost:3000`
- 严禁截图
- 只能依赖：
  - DOM
  - `evaluate` / `browser_run_code`
  - Console 日志
  - Network 日志
- 优先检查是否重定向到 `/login`

## 5. 推荐指令模板

```text
请使用 Playwright MCP 访问 http://localhost:3000。
要求：
1. 导航并等待页面加载。
2. 如果发生重定向，请告诉我最终 URL。
3. 用 DOM / evaluate 提取页面结构，重点看是否渲染了登录表单。
4. 抓取 Console 和 Network。
5. 严禁截图。
```

## 6. 常见问题

### 60 秒超时

确保 MCP 配置里有：

```toml
startup_timeout_sec = 60
```

### 浏览器找不到

执行：

```bash
npx playwright install --with-deps chromium
```

### 3000 端口不通

执行：

```bash
ss -tlnp | grep 3000
curl -I http://localhost:3000
```
