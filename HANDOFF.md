# 家庭练习项目开发交接

## 项目目标

基于聪聪学堂保留孩子端学习体验，验证家庭练习闭环。锁定二年级上册：统编语文、苏教数学。允许直接选后面的课文，不设从第一课逐个解锁的限制。

已实现家长布置、孩子作答、自动判分、错题与结果、家长查看、可读 HTML 报告、浏览器 JSON 备份。语文包含词语拼音默写、生字填空、古诗片段及仿写拓展；数学包含选择与数字填空。仿写保存原文供家长阅读，不自动计分。144 道基础自编活动中含 29 道仿写，非官方整册题库。

一周巩固按最近 7 个本地日历日归类具体技能，每项安排两道未见同类题；全部正确后至少等 24 小时，以另外两道未见题独立复测。复测完成前不提示对错或答案。复测全对仅表示本轮通过；之后出现新错会重新巩固。题池耗尽或不支持的补充题不能伪造掌握状态。

## 文件与命令

- `apps/family/src/FamilyApp.tsx`：家长/孩子界面和角色切换。
- `apps/family/src/data.ts`：课程、基础示例题库、练习模板。
- `apps/family/src/domain.ts`：作答、判分、持久化数据校验和状态推进。
- `apps/family/src/weekly.ts`、`weekly-questions.ts`、`WeeklyPanel.tsx`：一周错题、变式题池、复测规则和界面。
- `apps/family/src/report.ts`：可读报告及文本转义。
- `apps/family/app/family.css`：家庭版响应式样式。
- `apps/web/src`、`packages/core/src`：保留的上游组件与引擎，家庭版通过别名复用。
- `.github/workflows/pages.yml`：线上构建与部署。

Node.js 22；仓库根目录依次运行 `npm ci`、`npm test`、`npm run dev`。开发网址为 `http://localhost:4173`。`npm run build` 生成根路径静态站 `dist/`；GitHub Pages 工作流通过 `FAMILY_BASE_PATH` 自动处理仓库子路径。先查看检查结果，再推送 main；程序推送会自动更新公开网站。

39 项检查已在 Windows、本地 UTC 时区、GitHub Ubuntu 环境通过。生产构建和公开网址家长/孩子闭环已验证；真实 iPad Safari 与家庭无 VPN 网络尚待用户验证。更多证据见 `VALIDATION.md`、`DEPLOYMENT.md`。

## 在 DeepSeek Harness 中继续

将此仓库克隆到自己的电脑，在 DSH 的 Choose workspace 中选择仓库目录。按 DSH 自身要求配置模型及本地文件/命令权限，然后让它先读本文件和 README.md。项目是普通 Next.js/React 代码，无需改写成 DSH 插件。此步骤为可执行交接建议，尚未在本机 DSH 中实测。

DSH 官方说明：[Web UI 与工作目录](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/index.md)。模型凭据留在 DSH 配置，不得写入本项目或网页。孩子访问网站不需要 API Key。

## 数据与后续方向

当前 `congcong-family-demo:v1` 记录只在浏览器本地。网站地址、浏览器和设备之间不会自动同步。上线不能自动读取原 localhost 记录；使用设置中的 JSON 备份。家长/孩子角色无需密码，同一设备切换使用。没有登录、CloudBase、微信、邮件、推送、云数据库或运行时付费 API。

用户后续关注“像玩游戏一样学习”。下一轮可以先设计每天约 10 分钟的短任务、聪聪成长反馈和复测后的奖励；保留自由选课，不把错题答对原题当作掌握，也不奖励单纯反复刷分。完整地图和剧情尚未实现。

接入真实数据库时可依次建家庭、家长账号、练习任务、作答、技能错题、复测记录表，保留题目快照与版本。先实现家庭级权限和同步冲突处理，再迁移本地备份；保持儿童个人信息最少化。无需为孩子真实姓名、学校等信息增加必填项。

## 上游版权

上游：https://github.com/wuwangzhang1216/congcong-school

基准提交：`5540813185ae0867878c101abc083cad13a35fbd`，MIT，Copyright (c) 2026 wangzhang wu。许可和声明见 `LICENSE`、`THIRD_PARTY_NOTICES.txt`、`UPSTREAM.json`。本次在线改动发生在独立副本；不要覆盖原项目或移除版权。
