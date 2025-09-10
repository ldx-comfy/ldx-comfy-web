# 前端鉴权与 RBAC 适配说明

本说明覆盖在 Astro 前端中适配后端 JWT 鉴权与基于角色/用户组（RBAC）的接入方案。无需改动后端，仅新增/修改前端文件与配置，统一通过环境变量读取后端地址，持久化 Token 到 Cookie，给所有 API 请求自动附加 Authorization: Bearer。

后端接口（已实现，不修改）
- 基础前缀：`/api/v1/auth`
  - POST `/api/v1/auth/login`（用户名密码）
  - POST `/api/v1/auth/code`（授权码）
  - GET  `/api/v1/auth/me`（返回 claims：sub、login_mode、iat、exp、roles、groups）
  - GET  `/api/v1/auth/admin/ping`（示例受保护端点，需 admin 角色）
- 未认证返回 401；无权限返回 403

前端技术栈与现状
- Astro 5 SSR + 文件路由（`src/pages`），集成 React 与 i18n（@gudupao/astro-i18n），Tailwind 已启用
- 原有 API 通过页面前置服务端直接调用 `fetch`，基址硬编码为 `http://127.0.0.1:1145/api/v1`
- 本次适配目标：环境变量化、统一 API 客户端、JWT 持久化、路由与组件级 RBAC、登录页面与 401 统一处理

目录结构与新增文件
- 配置与客户端
  - [src/config/env.ts](./src/config/env.ts)
  - [src/lib/api/client.ts](./src/lib/api/client.ts)
- 鉴权模块
  - [src/lib/auth/service.ts](./src/lib/auth/service.ts)
  - [src/lib/auth/store.ts](./src/lib/auth/store.ts)
  - [src/lib/auth/guard.ts](./src/lib/auth/guard.ts)
  - [src/middleware.ts](./src/middleware.ts)
  - [src/components/Can.astro](./src/components/Can.astro)
- 页面
  - [src/pages/login.astro](./src/pages/login.astro)
  - [src/pages/logout.astro](./src/pages/logout.astro)
  - [src/pages/me.astro](./src/pages/me.astro)
  - [src/pages/admin/index.astro](./src/pages/admin/index.astro)
- 改造
  - [src/api/workflows.ts](./src/api/workflows.ts)（移除硬编码基址、透传 Cookie、统一错误处理）
  - [src/pages/index.astro](./src/pages/index.astro)（SSR 透传 Cookie）
  - [src/pages/wfs/[wfs_id].astro](./src/pages/wfs/%5Bwfs_id%5D.astro)（SSR 透传 Cookie、修复图片后端基址）
- 环境变量模板
  - [.env.example](./.env.example)

环境变量
- `VITE_API_BASE_URL`：后端基础地址（不带尾部 `/`），默认 `http://127.0.0.1:1145`
  - 配置示例：见 [.env.example](./.env.example)
- API 客户端自动拼接 `/api/v1`
- 变量优先级：`import.meta.env.VITE_API_BASE_URL` > `process.env.VITE_API_BASE_URL` > 默认

Token 持久化策略
- 服务端可读（httpOnly）Cookie：`auth_token`、`auth_expires`
  - 用于 SSR 请求与后端 API 代理请求，防止 XSS 可读
- 客户端可读 Cookie：`auth_token_js`（非敏感场景可选）
  - 浏览器侧统一请求封装可读取，以便前端直接向后端发起跨域/同域请求
- 生产环境下 `secure` + `sameSite=lax`
- 401 统一处理：
  - 浏览器：清理 Cookie 并重定向到 `/login?next=当前路径`
  - SSR：抛出可识别错误，由页面守卫重定向

统一 API 客户端
- 位置： [src/lib/api/client.ts](./src/lib/api/client.ts)
- 能力：
  - 基址拼接与 URL 规范化（支持相对/绝对）
  - JSON 编解码，FormData 原样透传
  - 从 Cookie 读取 JWT 并自动附加 `Authorization: Bearer`
  - 401 统一处理（浏览器端清 Cookie + 重定向；SSR 抛出 `AuthError`）

鉴权服务与状态工具
- 服务： [src/lib/auth/service.ts](./src/lib/auth/service.ts)
  - `loginPassword(username, password)`，`loginCode(code)`：完成登录并拉取 `/auth/me`
  - `getMe(ctx?)`：获取当前身份（支持 SSR 透传 Cookie）
  - `pingAdmin(ctx?)`：调用受保护端点示例
- Cookie 工具： [src/lib/auth/store.ts](./src/lib/auth/store.ts)
  - `setAuthCookies`、`clearAuthCookies`：服务端写入/清理 Cookie
  - `hasAnyRole/hasAllRoles/hasAnyGroup/hasAllGroup`：辅助 RBAC 判定

路由守卫与组件级 RBAC
- 中间件： [src/middleware.ts](./src/middleware.ts)
  - 保护 `/me` 与 `/admin` 路径，缺少 `auth_token` 时 302 到登录页
  - RBAC 细化在页面层执行，避免中间件频繁远程调用
- 页面守卫： [src/lib/auth/guard.ts](./src/lib/auth/guard.ts)
  - `requireAuthSSR`：登录态校验（无 Token 则重定向登录）
  - `ensureMeSSR`：登录态 + 拉取 `me`，失败则重定向登录
  - `requireRolesSSR`/`requireGroupsSSR`：基于 `roles/groups` 的页面级拦截（不满足时返回 403）
- 组件级包装： [src/components/Can.astro](./src/components/Can.astro)
  - 基于 `me` + `rolesAny/rolesAll/groupsAny/groupsAll` 条件显示/隐藏 `slot` 内容
  - 示例见 [src/pages/me.astro](./src/pages/me.astro)、[src/pages/admin/index.astro](./src/pages/admin/index.astro)

登录/登出与受保护页面
- 登录页： [/login](./src/pages/login.astro)
  - 支持两种模式切换：`?mode=password` 或 `?mode=code`
  - 提交成功：设置 Cookie 并重定向到 `next`（默认 `/`）
- 登出页： [/logout](./src/pages/logout.astro)
  - 清理 Cookie 并重定向到 `/login`
- 身份页（受保护）： [/me](./src/pages/me.astro)
  - 展示当前 `claims`，并演示组件级 RBAC
- 管理页（受保护 + RBAC）： [/admin](./src/pages/admin/index.astro)
  - 要求 `admin` 角色；调用 `/api/v1/auth/admin/ping` 验证

对现有页面与 API 的改造
- 统一基址、删除硬编码： [src/api/workflows.ts](./src/api/workflows.ts)
  - 改为使用统一客户端，所有函数支持 `ctx.cookies` 以便 SSR 透传
- SSR 透传 Cookie：
  - [src/pages/index.astro](./src/pages/index.astro)：`getAvailableWorkflows({ cookies: Astro.request.headers.get('cookie') })`
  - [src/pages/wfs/[wfs_id].astro](./src/pages/wfs/%5Bwfs_id%5D.astro)：`getWorkflowParams/executeWorkflowWithForm` 透传 Cookie
  - 使用 `toBackendAbsoluteUrl()` 修复图片基础地址，避免硬编码

本地运行与手动验证
1. 在前端目录安装依赖并启动
   - `pnpm install`（或 `npm install`/`yarn`）
   - `pnpm dev` 启动 Astro 开发服务器
2. 后端服务保持可用（默认 `http://127.0.0.1:1145`），或设置环境变量：
   - `.env` 中设置：`VITE_API_BASE_URL=http://127.0.0.1:1145`
3. 打开浏览器进行验证
   - 访问 `/login`，使用用户名密码或授权码登录（由后端配置）
   - 登录成功跳转到首页 `/` 或 `next` 指定路径
   - 访问 `/me` 查看 `claims`
   - 访问 `/admin` 验证基于 `admin` 角色的路由与接口访问控制
   - 刷新页面后仍保持登录；过期后自动跳转登录
4. 工作流页面验证（可选）
   - 在首页加载工作流列表，点进 `/wfs/:id`，服务端请求将自动携带 Cookie（若需要鉴权）

常见问题
- 401 自动登出：浏览器端统一清理 Cookie 并重定向；SSR 下页面守卫会处理重定向
- 跨域/同域：统一客户端会根据 `VITE_API_BASE_URL` 生成后端绝对路径
- 安全性：敏感 Token 仅存 `httpOnly`，前端可读 `auth_token_js` 仅用于便捷请求，生产可关闭此行为

未覆盖项
- 未实现复杂的前端状态管理（如全局 store），当前以 SSR/页面级为主
- 未引入 UI 框架路由（保持 Astro 文件路由）
- 未编写自动化测试（提供手动验证步骤）

变更摘要（参考）
- 新增：环境配置、统一 API 客户端、鉴权服务/守卫、登录/登出/示例页、组件级 RBAC 包装
- 改造：工作流 API、首页和工作流详情页的 SSR Cookie 透传与图片地址修复