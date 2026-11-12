# 在线部署交接

## 当前状态（2026-11-12）

在线构建和发布配置已完成，尚未公开部署，暂时没有可供孩子打开的互联网网址。

用户选定的访问方式：持链接即可访问，无需登录。学习记录仍只保存在访问设备的浏览器中；别人打开同一个链接不会看到本机学习记录。家长在另一台设备上不能自动查看孩子的结果，可先由孩子端导出可读 HTML 报告。

当前工作区的内置托管服务返回：`Publishing Sites to the internet is not enabled for this workspace.`（`sites_publish_disabled`）。已注册的站点 ID 保存在 `.openai/hosting.json`，未保存部署版本。管理员若启用公开发布，应复用该 ID，勿重复创建站点。

备用方案是 GitHub Pages。目前等待 GitHub 账号连接及可用的仓库写入能力；本地文件未上传至 GitHub，远程发布工作流尚未运行。

## GitHub Pages

1. 在自己的账号下创建公开仓库，将本目录作为仓库根目录，推送到 `main`。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
3. 打开 Actions → Publish family practice → Run workflow。推送 main 也会触发。
4. 工作流安装 Node.js 22、运行 39 项检查、构建静态网页、上传并部署。
5. 等待全部成功后，以 github-pages 环境返回的实际 URL 为准；再用 iPad Safari 打开核验。

`.github/workflows/pages.yml` 从 configure-pages 读取 base_path，因此兼容 `https://账号.github.io/仓库名/` 和自定义域名。无需手改资源 URL，不要将根路径构建产物直接放进仓库子路径。

参考：[GitHub 官方 Pages 工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 其他静态托管

使用 Node.js 22，在本目录运行：

```text
npm ci
npm test
npm run build
```

将 `dist` 内的文件作为网站根目录发布。静态发布包已按根路径构建，解压后 `index.html` 在顶层。不要把整个源码目录公开为网站目录。无需服务器、云数据库、微信登录或付费 API。

如果要部署在 `/practice/` 等子路径，构建时将 `FAMILY_BASE_PATH` 设为 `/practice`；环境变量只影响构建时的资源路径，不改变本地记录结构。

## 本次改动

- `package.json`：默认开发、检查与构建命令转向家庭练习版。
- `scripts/build-static.mjs`：静态构建输出到 dist。
- `apps/family/next.config.mjs`、`apps/family/app/layout.tsx`：支持部署子路径和图标路径。
- `apps/family/src/FamilyApp.tsx`：在线体验版标识。
- `.github/workflows/pages.yml`：构建并部署到 GitHub Pages。
- `.openai/hosting.json`：保留内置托管站点标识和静态目录。
- `README.md`、本文件：维护及部署说明。

原本的本地版和上游学习引擎未覆盖，MIT 许可及第三方声明保留。

## 已验证与限制

- 39 项自动检查通过；生产静态构建通过。
- 仓库子路径构建已用独立浏览器验证：页面、脚本、样式、图标请求全部成功，无控制台错误。
- 768 × 1024 触屏尺寸无横向溢出。更早的闭环、窄屏和每周复测验证见 VALIDATION.md。
- 使用 Chromium 模拟，真实 iPad Safari 尚待发布后的设备验收。
- 原 localhost 数据不会自动进入新的在线地址；清除浏览器数据会丢失记录，请使用设置中的 JSON 备份。
- 本版保留自编示例题库，非官方整册课后习题；仿写由家长阅读，不自动判作文分数。
- 无登录与云同步。下一阶段可把家庭、练习任务、作答记录、错题技能和复测记录存入数据库，再加入家长账号与家庭访问权限；不要将现有无登录页面直接接入公开可写的数据库。
