# 飞书云文档复刻（高保真学习项目）

一个对飞书云文档（docx 新版）进行「一模一样复刻」的前端项目，用于学习与研究。
技术栈：**React 18 + TypeScript + Vite + Tiptap 2（ProseMirror）**。

> 声明：本项目仅供个人学习研究。图标等视觉资产均为自行绘制的近似 SVG，不复制飞书任何专有素材；项目与字节跳动/飞书官方无关。

## 快速开始

```bash
npm install
npm run dev        # 开发（http://localhost:5173）
npm run build      # 生产构建
npm run typecheck  # 类型检查
```

## 已实现的核心能力

- **斜杠菜单（/ 快速插入）**：AI帮我写置顶 + 基础/常用/按钮/团队协作分组、拼音缩写搜索（/h1、/bg、/gs…）、Esc 删除 /query
- **标题渐进显示**：默认仅一~三级标题，使用 H3 后解锁 H4，依此至 H9（斜杠菜单/工具栏/T 菜单三处同步）
- **块把手**：悬停行首出现 [T][⋮⋮]，点击直接转换样式/剪切复制上下移删除，按住 ⋮⋮ 拖拽移动（蓝色指示线）
- **四种工具栏体系**：斜杠、+（空行插入）、⋮⋮（块操作）、选中浮动工具条（问问AI/解释/T样式/合并色板/缩进）
- **AI 能力（自带模型）**：右侧「问问AI」多轮流式对话，回答可插入到下方/替代所选/作为引用/代码框；「一键排版」LLM 分析全文标题层级 → 预览确认 → 单事务应用可撤销
- **飞书对齐细节**：飞书快捷键全表（⌘⌥1~9、⌘⇧X、⌘⌥C…）、Esc 选中整块、连按 ⌘A 全选、Tab 缩进、左侧大纲可收起、待办/引用/高亮块/代码块/表格/图片、Markdown 即时转换（中文语境优化）
- **文档管理**：首页导航/新建/收藏/回收站，localStorage 持久化，编辑/阅读模式

设计规范与验收标准见 [docs/design-spec.md](docs/design-spec.md)，与飞书的差距分析与迭代计划见 [docs/feishu-gap-analysis-and-optimization-plan.md](docs/feishu-gap-analysis-and-optimization-plan.md)。

## AI 模型配置

在右侧 AI 栏（或斜杠菜单「AI帮我写」）右上角配置你自己的 OpenAI Chat Completions 兼容服务：
Base URL / API Key / 模型名 / temperature。配置仅保存在本机浏览器 localStorage，请求由页面直连你填写的服务地址（需允许跨域），不经过任何第三方。
