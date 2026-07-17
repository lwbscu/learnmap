# LearnMap

<p align="center">
  <a href="https://lwbscu.github.io/learnmap/">
    <img src="docs/assets/learnmap-cover.png" alt="LearnMap cover" width="960">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lwbscu/learnmap"><img alt="GitHub Repo" src="https://img.shields.io/badge/GitHub-Repo-181717?style=flat&logo=github&logoColor=white"></a>
  <a href="https://lwbscu.github.io/learnmap/demos.html"><img alt="Demos" src="https://img.shields.io/badge/LearnMap-Demos-00a6d6?style=flat&logo=gitbook&logoColor=white"></a>
  <a href="https://mp.weixin.qq.com/s/mO-GAe4arXsKBZTzipwLuA"><img alt="WeChat" src="https://img.shields.io/badge/WeChat-07C160?style=flat&logo=wechat&logoColor=white"></a>
  <a href="https://zhuanlan.zhihu.com/p/2050915019571963028"><img alt="Zhihu" src="https://img.shields.io/badge/Zhihu-0084FF?style=flat&logo=zhihu&logoColor=white"></a>
  <a href="https://juejin.cn/post/7652384976291414054"><img alt="Juejin" src="https://img.shields.io/badge/Juejin-1E80FF?style=flat&logo=juejin&logoColor=white"></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/License-MIT-f0ad4e?style=flat"></a>
  <a href="https://skills.sh"><img alt="Agent Skill" src="https://img.shields.io/badge/Agent-Skill-38bdf8?style=flat"></a>
  <img alt="Version 2.5" src="https://img.shields.io/badge/version-2.5-38bdf8?style=flat">
  <a href="README.en.md"><img alt="English" src="https://img.shields.io/badge/lang-English-007ec6?style=flat"></a>
  <a href="README.cn.md"><img alt="Simplified Chinese" src="https://img.shields.io/badge/%E8%AF%AD%E8%A8%80-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-d9534f?style=flat"></a>
</p>

**Map first. Learn faster.**

LearnMap 是一个面向 Agent Skill 的学习工具。它不会直接输出一篇长文，而是先把陌生主题变成知识地图，再生成可交互 HTML 课件、掌握检查、错题复习跳转和可导出的学习记录。

<p align="center">
  <a href="https://lwbscu.github.io/learnmap/demos.html#walkthrough">
    <img src="docs/assets/learnmap-demo-poster.png" alt="观看 LearnMap 60 秒使用流程演示" width="900">
  </a>
  <br>
  <a href="https://lwbscu.github.io/learnmap/demos.html">打开双语 LearnMap Demo Center</a>
</p>

## What's NEW!

- [2026/07] 🔥 LearnMap runtime v2 新增不遮字的方形笔记徽标、增强高亮、锚定浮动笔记、自定义标记/笔记颜色、兼容 v1 笔记包、等待 5 个子 Agent 结论、默认不设 runtime/正文/总 HTML 体积上限，并上线含可交互课件的双语统一 Demo Center。
- [2026/06] 🔥 LearnMap 新增快速总览模式、慢速深学模式和真实录屏演示。
- [2026/06] 🔥 视频可视化讲解和 mentor lens 改为可选学习路径。
- [2026/05] 🔥 交互式 HTML 课件支持导出学习记录，方便 AI 续学。

## 安装

Claude Code 用户级安装：

```bash
git clone https://github.com/lwbscu/learnmap.git ~/.claude/skills/learnmap-skill
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
git clone https://github.com/lwbscu/learnmap.git "$env:USERPROFILE\.claude\skills\learnmap-skill"
```

Codex 用户级安装：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
git clone https://github.com/lwbscu/learnmap.git "$env:USERPROFILE\.codex\skills\learnmap-skill"
```

## 使用

```text
使用 learnmap-skill 教我强化学习。我会 Python，希望一周内跑一个简单实验。
```

```text
使用 learnmap-skill 快速模式教我强化学习。
```

LearnMap 第一次会先确认教学语言；如果没有指定课件模式，会询问一次并默认使用慢速模式。

## 两种课件模式

| 模式 | 适合场景 | 输出 |
|---|---|---|
| 快速模式 | 先快速理解全貌 | 一页浓缩版交互 HTML：地图、例子、误区、测验和下一步 |
| 慢速模式 | 逐章理解结构和细节 | 先生成全局地图，再按章节生成交互课件 |

## 核心产出

| 需求 | 产出 |
|---|---|
| 学一个新领域 | 知识地图、学习路径、章节课件 |
| 纠正错题 | 答错解析，并用 `Review` 跳回对应知识点 |
| 下次继续学 | Markdown 或 JSON 学习记录，交给 AI 接着讲 |
| 可视化讲解 | 可选 HTML 动效讲解，默认不生成视频 |
| 高手视角学习 | 可选 mentor lens：例子、反例和边界 |

## 来源

学习流程源自：[如何用 Claude Code 开启 10 倍学习法？](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ)

质量闸门吸收 [Darwin Skill](https://github.com/alchaincyf/darwin-skill) 的评估思想；可选 mentor lens 吸收 [Nuwa Skill](https://github.com/alchaincyf/nuwa-skill) 的认知框架提炼方法。

MIT © [lwbscu](https://github.com/lwbscu)
