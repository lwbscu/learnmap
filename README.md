# AI 10x Learning Coach / AI 10倍学习教练

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-38bdf8)](https://claude.com/claude-code)
[![Version](https://img.shields.io/badge/version-2.1-a78bfa)]()

**把 Claude Code/Codex 变成一个耐心的、自适应的领域导师。**  
**Turn Claude Code/Codex into a patient, adaptive domain tutor.**

📖 完整文档 / Full Docs: [中文文档](README.cn.md) | [English Docs](README.en.md)

---

## 这是什么？/ What Is This?

`ai-10x-learning-coach` 是一个 Claude Code Skill，将 "10 倍学习法" 固化为可复用的 AI 行为规范。它会先画知识地图，再逐章生成交互式 HTML 课件，检查掌握程度，记录错题，针对性复教。

`ai-10x-learning-coach` is a Claude Code Skill that codifies the "10x Learning" methodology. It draws a knowledge map, generates interactive HTML lessons chapter by chapter, checks mastery, logs mistakes, and re-teaches weak spots.

---

## 快速开始 / Quick Start

```bash
# 安装 / Install (user-level)
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach

# 使用 / Usage
# 在 Claude Code 中：使用 ai-10x-learning-coach 教我 [主题]
# In Claude Code: Use ai-10x-learning-coach to teach me [topic]
```

首次交互会先询问语言 / First interaction asks for language: 🌐 **中文版还是 English version?**

---

## 核心特性 / Key Features (v2.1)

| 特性 Feature | 说明 Description |
|-------------|-----------------|
| 🌐 双语分发 | 启动时询问语言，学习产物目录/文件名/课件/测验都用所选语言输出，术语保留英文 |
| 📚 交互式 HTML 课件 | 从第1课开始每章一个完整 HTML 页面：多视角切换、即学即练、折叠深读、悬浮注释 |
| ✅ 掌握检查 | 2-4 题自动评判：正确/部分正确/概念误区/边界不清/应用脱节 |
| 💾 学习记录 | 自动保存网页交互状态，并支持复制给 AI / 下载 JSON 供后续读取 |
| 📋 防迷路导航 | 完结卡片 + 自检清单 + 底部悬浮条 + 下一步指令 |
| 📊 错题追踪 | 记录每个理解偏差，针对性复测，进度可随时恢复 |

---

## 仓库结构 / Repo Structure

```
ai-10x-learning-coach/
├── SKILL.md                     # 核心指令 / Core instructions
├── README.md                    # 本文件 / This file (bilingual landing)
├── README.cn.md                 # 中文完整文档
├── README.en.md                 # English full documentation
├── LICENSE                      # MIT
├── agents/openai.yaml           # Agent metadata
└── references/
    ├── session-artifacts.md     # 工作空间模板 + HTML 脚手架
    └── assessment-rubric.md     # 评估量表（双语）
```

---

## 许可 / License

MIT © [lwbscu](https://github.com/lwbscu)
