# AI 10倍学习教练

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-38bdf8)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-2.0-a78bfa)]()

**把 Claude Code/Codex 变成一个耐心的、自适应的领域导师。**

> 不再是被动的问答机器人，而是一个会画知识地图、逐章生成交互式 HTML 课件、检查掌握程度、记录错题并针对性复测的"10 倍学习"教练。

---

## 这是什么？

`ai-10x-learning-coach` 是一个 Claude Code Skill，它将[如何用 Claude Code 开启 10 倍学习法？](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ)中提炼的工作流固化为一套可复用的 AI 行为规范。

**核心理念：** `全局地图 → 逐章教学 → 多视角理解 → 示例演练 → 掌握检查 → 错题追踪 → 弱项复教`

---

## 适用场景

| 场景 | 产出物 |
|------|--------|
| 🆕 **快速上手新领域** | 概念地图 + 学习路径 + 交互式 HTML 课件 + 掌握检查 |
| 🏗️ **项目交付** | 技术决策清单 + 风险评估 + 实施路线图 |
| 📝 **备考 / 面试** | 知识地图 + 闪卡 + 分级模拟题 |
| ✍️ **写博客 / 文章** | 大纲 + 类比库 + 示例集 + 概念关系图 |
| 💻 **理解代码库** | 仓库地图 + 术语表 + 逐步探索任务 |

---

## 快速开始

### 安装

**方式 1：用户级安装（推荐，所有项目可用）**

```bash
# Windows PowerShell
mkdir -p "$env:USERPROFILE\.claude\skills"
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.claude\skills\ai-10x-learning-coach"
```

```bash
# macOS / Linux
mkdir -p ~/.claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach
```

**方式 2：项目级安装（仅当前项目可用）**

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/ai-10x-learning-coach
```

### 使用

在 Claude Code 中输入以下指令即可开始：

```
使用 ai-10x-learning-coach 教我强化学习
```

或者更具体的：

```
用 ai-10x-learning-coach 帮我从零学 MLOps，我有一周时间，目标是能部署一个简单的 pipeline
```

### 首次交互

Skill 启动后，第一条消息会问你：

> 🌐 **中文版还是 English version?**

选择后，所有课件内容、学习产物文件夹名、笔记文件名、测验文件名、导航提示都会用你选择的语言输出。**但技术术语（如 MDP、Q-Learning、Bellman 方程）保留英文。**

中文模式下，除 `README*`、`SKILL.md`、`LICENSE`、`agents/openai.yaml`、`references/*.md` 这类仓库功能文件外，生成给学习者使用的文件都采用中文命名。例如：`第01课-全局地图/笔记.md`、`掌握检查.html`、`课件.html`。

---

## 学习循环（7 步）

```
┌──────────────────┐
│  1. 校准学习者     │  ← 了解背景、目标、时间预算，选择语言
├──────────────────┤
│  2. 绘制全局地图   │  ← 5-9 个核心模块、依赖关系、关键术语、学习路线
├──────────────────┤
│  3. 交互式 HTML 课件│  ← 每章一个完整 HTML 页面，含多种交互组件
├──────────────────┤
│  4. 掌握检查       │  ← 每章 2-4 题，自动评判：正确/部分正确/概念误区/边界不清/应用脱节
├──────────────────┤
│  5. 错题追踪       │  ← 记录每个理解偏差，后续针对性复测
├──────────────────┤
│  6. 生成学习档案   │  ← 可随时恢复进度，不会让你从头开始
└──────────────────┘
```

---

## 交互式 HTML 课件特性（v2.0 新增）

从第 2 课开始，每课生成一个自包含的交互式 HTML 页面，**所有课件标配以下功能**：

### 导航与结构
- 🧭 **粘性顶栏** — 面包屑导航 + 课题名称 + 一键重置按钮
- 📑 **侧边目录** — 宽屏（≥1300px）显示，点击平滑滚动

### 内容组件
- 📦 **定义框** — 蓝色左边框，突出核心定义
- 💡 **示例框** — 绿色左边框，具体场景举例
- ⚠️ **陷阱标注** — 黄色标签，标记常见误区
- 🃏 **概念卡片** — 五元组式可点击卡片，点击跳转详细解释
- 🔄 **Agent-Env 循环图** — CSS flexbox 流程图
- 📐 **公式展示** — 居中、等宽字体、带边框

### 交互组件
- 🔀 **多视角切换 Tab** — 用户视角 / 业务视角 / 工程视角，一键切换
- 📚 **折叠 FAQ** — 点击标题展开/收起深层解释
- 🧪 **即学即练** — 嵌入式选择题，选对变绿、选错变红，附带解释
  - *防重复点击* — 使用 `_mqAnswered` 字典防止内容叠加
  - *防作用域 bug* — Tab 切换用 `section.querySelectorAll` 而非 `tabs.querySelectorAll`
- 💬 **悬浮注释** — 关键词有虚线底划线，悬停弹出深度提示
- 🎯 **MDP 卡片精准滚动** — 手动计算 `getBoundingClientRect` 而非依赖 `scroll-margin-top`

### 底部导航（防迷路）
- 🏁 **完结卡片** — 虚线边框收尾卡，包含：
  - ✅ **自检清单** — 点击 ☐ → ☑ 标记已掌握
  - 📋 **下一步指令** — 等宽字体框，可直接复制粘贴回 Claude Code
  - 🔮 **下节课预告** — 一句话预告内容
- 🔔 **底部悬浮提示条** — 滚动到完结卡片时从底部滑出，提醒下一步操作

### 设计
- 🌙 **暗色主题** — CSS 变量统一管理配色，适合技术学科
- 🔄 **全局重置** — 顶栏重置按钮一键恢复所有交互状态
- 📱 **响应式** — 适配桌面和移动端

---

## 课件生成规范

Skill 内置了完整的 HTML 课件脚手架（见 `references/session-artifacts.md`），确保每课风格一致、功能齐全。关键规范：

| 规范 | 说明 |
|------|------|
| CSS 变量 | 10 个设计 token，统一暗色主题 |
| JS 写法 | 使用 `function` 和 `var`，不用箭头函数和 `const`/`let` |
| Tab 查询 | 从 `section` 范围查 `.tab-panel`，不从 `.tabs` 容器查 |
| 滚动计算 | `getBoundingClientRect().top + pageYOffset - 85` 偏移 header |
| 测验防重复 | `_mqAnswered[quizId]` 字典守卫 |
| 底部条触发 | `IntersectionObserver`，threshold 0.3 |

---

## 学习工作空间结构

```
学习/<主题>/
├── 元数据/
│   ├── 学习档案.md          # 学习者档案（背景、目标、语言选择）
│   ├── 学习进度.md          # 进度追踪（当前课、薄弱点、下一步）
│   └── 错题记录.md          # 错题记录（日期、概念、错误理解、正确版本）
├── 第01课-全局地图/
│   ├── 笔记.md              # 全局地图笔记
│   └── 掌握检查.html        # 独立交互式测验
├── 第02课-MDP详解/
│   └── 课件.html            # 交互式课件 + 嵌入式测验
├── 第03课-价值函数/
│   └── 课件.html
└── ...
```

中文模式下学习产物目录和文件名全部中文；英文模式下使用英文 slug。技术术语（MDP、PPO 等）在两种模式下均保留英文。

---

## 仓库结构

```
ai-10x-learning-coach/
├── SKILL.md                     # 核心 Skill 指令（含语言分发 + HTML 课件规范）
├── README.md                    # 双语入口页
├── README.cn.md                 # 中文完整文档（本文件）
├── README.en.md                 # English full documentation
├── LICENSE                      # MIT
├── agents/
│   └── openai.yaml              # Agent 接口元数据
└── references/
    ├── session-artifacts.md     # 学习工作空间模板 + HTML 课件完整脚手架
    └── assessment-rubric.md     # 掌握检查评估量表（中英双语）
```

---

## 安全说明

- 本 Skill **不含任何可执行代码**，全部为 Markdown 指令 + YAML 元数据
- 不会自动发起网络请求
- 所有学习文件生成在你指定的本地工作空间内
- 安装前请检查 `SKILL.md` 确认行为符合预期

---

## 常见问题

### Q: 和直接问 Claude "教我 XX" 有什么区别？

直接问是一次性的大段文本输出，容易变成"信息堆砌"。Skill 会强制走完整教学流程：地图先行 → 逐章细讲 → 交互式课件 → 掌握检查 → 错题追踪。你不会被允许在概念模糊时进入下一章。

### Q: 中文和英文版本有什么区别？

语言选择会影响：UI 文字、学习产物文件夹命名、笔记文件命名、测验文件命名、课件文件命名、测验题目文本。**两种模式下的技术术语（MDP、Q-Learning、policy gradient）都保留英文**，确保概念准确、与国际社区一致。

### Q: 第 1 课为什么是全局地图而不是直接讲内容？

认知科学告诉我们：大脑在接触细节之前需要一个"框架"来挂载信息。没有地图的细节是零散的；有了地图，每个新概念都知道"它在整个知识体系中的位置"。

### Q: 为什么从第 2 课开始用 HTML 而不是 Markdown？

互动性。HTML 课件可以内嵌测验、折叠深读、多视角切换，学习者不只是"读"而是"用"。Markdown 只适合第 1 课的地图笔记，例如中文模式下的 `第01课-全局地图/笔记.md`。

---

## 致谢

灵感来源：[如何用 Claude Code 开启 10 倍学习法？](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ)

---

## 许可

MIT © [lwbscu](https://github.com/lwbscu)
