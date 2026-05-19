# Ebrain Admin Dashboard - Storybook 设计稿

基于 Ebrain MVP § 9 的 7 个页面设计稿。**纯前端 mock，零后端依赖**。

## 启动

```bash
# 1. 安装依赖（首次约 2-3 分钟）
npm install

# 国内网络慢可以用淘宝镜像：
# npm install --registry=https://registry.npmmirror.com

# 2. 启动 Storybook
npm run storybook
# → http://localhost:6006
```

## 包含什么

### 7 个 Page Story（左侧导航 → Pages）

| Story | 内容 |
|---|---|
| Login | 飞书 / 钉钉 / 企微 SSO + OIDC fallback |
| Dashboard | 4 stat card + SSE 流 + 5 app 健康 + Dream Cycle |
| Executives | 高管列表 + Profile drawer + SOUL Audit |
| EnterpriseApps | 5 应用卡片 + 5 步注册 wizard |
| Ingestion | 20+ 子 Connector 健康度 |
| FactConflicts | 冲突列表 + Resolve workflow drawer |
| Agents | OAuth client 管理 + 一键导出客户端配置 |
| RequestLog | 全部 MCP 请求审计 + 多维过滤 |

### 共享组件

- `AppLayout` — Sidebar + Header 框架
- `StatCard` — 4 种 tone
- `StatusBadge` / `SeverityBadge` — 状态指示

## 设计决策

按 walkthrough § 9 定的：

- ✅ 暗色主题（gbrain 风格）
- ✅ antd 5（中国运维熟悉）
- ✅ 中文默认 + 切换器
- ✅ 桌面优先，不做移动响应式
- ✅ FactConflicts 含 Resolve workflow
- ✅ Agents 含一键导出 Claude Desktop / Cursor / 通用 JSON 三种格式
- ✅ EnterpriseApps 含 5 步注册 wizard

## 从设计稿到落地

所有 Page 代码在 `src/pages/*.tsx`，可以直接搬到 Ebrain fork 仓库的 `admin/src/ebrain/` 目录：

```
src/pages/Dashboard.tsx
    → admin/src/ebrain/pages/Dashboard.tsx
    + 把 mock/data.ts 的引用换成真实 API 调用
```

API 调用走 `admin/src/api.ts`，按 § 5 操作清单加 endpoint。

## 文件结构

```
admin-ebrain-storybook/
├── .storybook/
│   ├── main.ts                # Storybook 主配置
│   └── preview.tsx            # 暗色主题 + antd ConfigProvider
├── src/
│   ├── Overview.mdx           # 首页文档
│   ├── styles/globals.css
│   ├── components/
│   │   ├── AppLayout.tsx
│   │   ├── StatCard.tsx
│   │   └── StatusBadge.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Executives.tsx
│   │   ├── EnterpriseApps.tsx
│   │   ├── Ingestion.tsx
│   │   ├── FactConflicts.tsx
│   │   ├── Agents.tsx
│   │   ├── RequestLog.tsx
│   │   └── *.stories.tsx
│   └── mock/data.ts           # 所有 mock 数据集中处
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 静态构建

```bash
npm run build-storybook
# → storybook-static/
# 静态 HTML，可以部署到任意静态托管（OSS / S3 / Vercel / Nginx）
```
