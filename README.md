# AI 10x Learning Coach / AI 10倍学习教练

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-38bdf8)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-2.1-a78bfa)]()

**把 Claude Code/Codex 变成一个耐心的、自适应的领域导师 —— 它会画知识地图、生成交互式 HTML 课件、检查掌握程度、记录错题、针对性复教，直到你真正学会。**

**Turn Claude Code/Codex into a patient, adaptive domain tutor — it draws knowledge maps, generates interactive HTML lessons, checks mastery, logs mistakes, and re-teaches weak spots until you actually understand.**

🌐 [Live Demo / 宣传页](https://lwbscu.github.io/ai-10x-learning-coach/) | 📖 [中文文档](README.cn.md) | [English Docs](README.en.md) | [知乎 Demo](https://zhuanlan.zhihu.com/p/2044006519017035140) | [掘金 Demo](https://juejin.cn/spost/7645137278329126964)

---

## Demo：5 分钟学会一个新领域

```
你: 使用 ai-10x-learning-coach 教我强化学习
AI: 🌐 中文版还是 English version?
你: 中文
AI: 请告诉我你的背景和学习目标...
你: 有 Python 基础，想一周内理解核心概念，能跑简单实验
AI: [生成第01课-全局地图/课件.html] 这是你的知识地图，先了解全貌...
AI: [生成第02课-MDP详解/课件.html] 学完请勾选自检清单，把学习记录发给我...
...
```

> 不是一次性丢给你 10000 字长文——而是逐章教学、每题诊断、错题追踪，**像一个真正的家教**。

---

## 这是什么？

`ai-10x-learning-coach` 是一个 Claude Code Skill，将"10 倍学习法"固化为可复用的 AI 行为规范。

**7 步学习循环：** `校准学习者 → 绘制全局地图 → 交互式 HTML 课件 → 掌握检查 → 错题追踪 → 弱项复教 → 生成学习档案`

---

## 快速开始

```bash
# 安装（用户级，所有项目可用）
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach

# 使用（在 Claude Code 中输入）
使用 ai-10x-learning-coach 教我 [你想学的任何主题]
```

首次交互会询问语言选择，之后所有课件、测验、导航提示都用你的语言输出。

---

## 核心特性 (v2.1)

| 特性 | 说明 |
|------|------|
| 🌐 双语分发 | 中/英文完整支持，术语保留英文保准确性 |
| 📚 交互式 HTML 课件 | 每章一个自包含 HTML：多视角切换、即学即练、折叠深读、悬浮注释 |
| ✅ 掌握检查 | 2-4 题自动评判：正确 / 部分正确 / 概念误区 / 边界不清 / 应用脱节 |
| 💾 学习记录导出 | 一键复制 Markdown 报告给 AI，或下载 JSON 供后续恢复 |
| 📋 防迷路导航 | 完结卡片 + 自检清单 + 底部悬浮提示条 + 下一步指令 |
| 📊 错题追踪 | 记录每个理解偏差，针对性复测，进度可随时恢复 |

---

## 课件效果预览

每个 HTML 课件标配：

- 🧭 粘性顶栏 + 侧边目录
- 📦 定义框 / 示例框 / 陷阱标注 / 概念卡片
- 🔀 用户/业务/工程多视角 Tab 切换
- 🧪 嵌入式即学即练（选对变绿、选错变红 + 诊断反馈）
- 💬 关键词悬浮注释
- 🏁 完结卡片：自检清单 + 学习记录面板 + 下一步指令
- 🌙 暗色主题，响应式布局

---

## 适用场景

| 场景 | 产出物 |
|------|--------|
| 🆕 快速上手新领域 | 概念地图 + 交互式 HTML 课件 + 掌握检查 |
| 🏗️ 项目交付 | 技术决策清单 + 风险评估 + 实施路线图 |
| 📝 备考/面试 | 知识地图 + 闪卡 + 分级模拟题 |
| ✍️ 写博客/文章 | 大纲 + 类比库 + 示例集 |
| 💻 理解代码库 | 仓库地图 + 术语表 + 逐步探索任务 |

---

## 仓库结构

```
ai-10x-learning-coach/
├── SKILL.md                     # 核心 Skill 指令（语言分发 + HTML 课件规范）
├── README.md                    # 本文件（双语入口）
├── README.cn.md                 # 中文完整文档
├── README.en.md                 # English full documentation
├── LICENSE                      # MIT
├── agents/openai.yaml           # Agent 接口元数据
└── references/
    ├── session-artifacts.md     # 工作空间模板 + HTML 课件完整脚手架
    └── assessment-rubric.md     # 掌握检查评估量表（中英双语）
```

---

## 安全说明

- 本 Skill **不含可执行代码**，全部为 Markdown 指令 + YAML 元数据
- 不会自动发起网络请求
- 所有学习文件生成在本地工作空间内
- 安装前请检查 `SKILL.md` 确认行为符合预期

---

## 灵感来源

[如何用 Claude Code 开启 10 倍学习法？](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ) — 本 Skill 的核心理念源于此文提炼的 AI 学习方法论。

---

## 许可

MIT © [lwbscu](https://github.com/lwbscu)
