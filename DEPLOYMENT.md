# 在线部署交接

## 当前状态（2026-11-13）

已公开部署：[聪聪家庭练习](https://wiwijiang2002-lgtm.github.io/congcong-family-practice/)。无需登录，电脑不必运行本地服务或保持开机。

本轮新增“弱点建议练习”：家长端「练习安排」按最近 7 天错题从本地题库寻找未做过的同知识点题目，生成家长确认后才布置的建议。不会自动发布；匹配是知识点/关键词文字比对，不跨设备。

家长本地题库仍只在访问设备的浏览器中：真实题目和答案不进入仓库或静态构建。家长需在每台设备（例如 iPad）上单独导入；学习记录与题库均不跨设备同步。

源码仓库：[wiwijiang2002-lgtm/congcong-family-practice](https://github.com/wiwijiang2002-lgtm/congcong-family-practice)。首次成功发布的程序提交为 `1454244f1a71d3b3f20293c413a3e860b8d04bda`，发布记录为 [Actions #2](https://github.com/wiwijiang2002-lgtm/congcong-family-practice/actions/runs/43192223734)。

用户选定的访问方式：持链接即可访问，无需登录。学习记录仍只保存在访问设备的浏览器中；别人打开同一个链接不会看到本机学习记录。家长在另一台设备上不能自动查看孩子的结果，可先由孩子端导出可读 HTML 报告。

当前工作区的内置托管服务返回：`Publishing Sites to the internet is not enabled for this workspace.`（`sites_publish_disabled`）。已注册的站点 ID 保存在 `.openai/hosting.json`，未保存部署版本。管理员若启用公开发布，应复用该 ID，勿重复创建站点。

已改用 GitHub Pages，GitHub 账号已连接，公开仓库和托管均已建立。云端依赖安装、当时的 39 项检查、静态构建与部署全部成功。未购买域名或其他付费服务。

## GitHub Pages

1. 在自己的账号下创建公开仓库，将本目录作为仓库根目录，推送到 `main`。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 GitHub Actions。
3. 打开 Actions → Publish family practice → Run workflow。推送 main 也会触发。
4. 工作流安装 Node.js 22、运行 61 项检查、构建静态网页、上传并部署。
5. 等待全部成功后，以 github-pages 环境返回的实际 URL 为准；再用 iPad Safari 打开核验。

以上初始化步骤已在当前仓库完成。后续在 main 推送程序更新即可自动发布。文档更新可以在提交信息中使用 `[skip ci]`，不触发无关的重新构建。

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
- `apps/family/src/weekly.test.ts`：日历边界测试改用本地时区日期，兼容 UTC 服务器。
- `.github/workflows/pages.yml`：构建并部署到 GitHub Pages。
- `.openai/hosting.json`：保留内置托管站点标识和静态目录。
- `apps/family/src/local-bank.ts`、`LocalBankPanel.tsx`、`local-bank.test.ts`、`download.ts`：家长本地题库导入、管理和测试；`FamilyApp.tsx` 接入题库导航、布置页和自由选课。
- `apps/family/src/suggestions.ts`、`suggestions.test.ts`、`WeakSuggestionPanel.tsx`：按最近 7 天错题从本地题库生成家长确认后布置的弱点建议练习。
- `apps/family/src/selection.ts`、`selection.test.ts`：布置页按序号范围批量选择题目，自动遵守 12 道上限。
- `本地题库导入说明.md`：导入格式、隐私边界和真实题目文件的提供要求。
- `README.md`、`HANDOFF.md`、本文件：维护、部署与更换开发工具的交接说明。

原本的本地版和上游学习引擎未覆盖，MIT 许可及第三方声明保留。

**题库数据不进入构建产物。** 家长导入的题目只写入浏览器 `localStorage`，`dist/` 和 GitHub 仓库都不包含真实练习册内容；静态站发布不会带上任何家庭数据。

## 已验证与限制

- 61 项自动检查通过；生产静态构建通过。
- 浏览器端到端实测（Chromium，独立配置）：家长粘贴导入 3 道本地题 → 题库只写入 `congcong-family-local-bank:v1` → 布置 3 道 → 孩子全部答对得 30/30 → 刷新后题库与结果仍在 → 孩子端“自由选课”出现本地单元 → 页面资源全部来自本机，无外部请求。
- 弱点建议端到端实测：本地题库 5 道题，孩子做错 1 道同知识点题后，家长「练习安排」出现建议；点“用这 3 道准备练习”打开布置页，已选 3 道，布置后计划题目全部来自本地题库。
- 旧键 `congcong-family-demo:v1` 与上游 `csf-*` 记录未被改写；本地题库独立键，损坏时不覆盖原数据。
- 本地题库暂不自动生成同类变式；一周巩固显示“待补充同类题”，不会伪造掌握状态。弱点建议是文字匹配的建议草稿，不会自动发布，也不等于掌握验证。
- 真实练习册题目尚未导入；仓库和静态构建不包含任何练习册原题或答案。
- 未验证 GitHub Ubuntu 的 61 项检查、公开网址重建和真实 iPad Safari（本轮改动后）；更早的闭环、窄屏和每周复测验证见 VALIDATION.md。
- 上一版本已验证仓库子路径构建、公开地址在未登录独立浏览器的家长/孩子闭环、768 × 1024 触屏无横向溢出；本轮新增本地题库页面仍需发布后用真实设备复核。
- 使用 Chromium 模拟，真实 iPad Safari 尚待发布后的设备验收。
- 未验证中国大陆各运营商网络或无 VPN 的家庭 Wi-Fi；若实际直连缓慢或不可达，需要更换托管位置。
- 原 localhost 数据不会自动进入新的在线地址；清除浏览器数据会丢失记录，请使用设置中的 JSON 备份。
- 本版保留自编示例题库，非官方整册课后习题；仿写由家长阅读，不自动判作文分数。
- 无登录与云同步。下一阶段可把家庭、练习任务、作答记录、错题技能和复测记录存入数据库，再加入家长账号与家庭访问权限；不要将现有无登录页面直接接入公开可写的数据库。

