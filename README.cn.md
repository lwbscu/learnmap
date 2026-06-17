# LearnMap

<p align="center">
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/">
    <img src="docs/assets/learnmap-cover.png" alt="LearnMap cover" width="960">
  </a>
</p>

<p align="center">
  <a href="https://github.com/lwbscu/ai-10x-learning-coach"><img alt="GitHub" src="docs/assets/badges/github.svg"></a>
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html"><img alt="60s Demo" src="docs/assets/badges/demo.svg"></a>
  <a href="README.en.md"><img alt="Documentation" src="docs/assets/badges/docs-en.svg"></a>
  <a href="README.cn.md"><img alt="Chinese Documentation" src="docs/assets/badges/docs-cn.svg"></a>
  <a href="https://mp.weixin.qq.com/s/OsIiHKvV8h0e9URDjRBJnw?scene=1&amp;click_id=669507184"><img alt="WeChat" src="docs/assets/badges/wechat.svg"></a>
  <a href="https://zhuanlan.zhihu.com/p/2044006519017035140"><img alt="Zhihu" src="docs/assets/badges/zhihu.svg"></a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License MIT" src="docs/assets/badges/license.svg"></a>
  <a href="https://skills.sh"><img alt="Agent Skill Compatible" src="docs/assets/badges/skill.svg"></a>
  <img alt="Version 2.5" src="docs/assets/badges/version.svg">
  <a href="README.en.md"><img alt="Language English" src="docs/assets/badges/lang-en.svg"></a>
  <a href="README.cn.md"><img alt="Language Simplified Chinese" src="docs/assets/badges/lang-cn.svg"></a>
</p>

**Map first. Learn faster.**

LearnMap 是一个面向 Agent Skills 的学习 skill。它不会直接输出一篇长文，而是先把陌生主题变成知识地图，再按你的目标生成交互式 HTML 课件、掌握检查、错题复习跳转和可导出的学习记录。

<p align="center">
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html">
    <img src="docs/assets/learnmap-demo-poster.png" alt="观看 LearnMap 60 秒使用流程演示" width="900">
  </a>
  <br>
  <a href="https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html">观看 60 秒使用流程演示</a>
</p>

[在线演示](https://lwbscu.github.io/ai-10x-learning-coach/) · [使用流程演示](https://lwbscu.github.io/ai-10x-learning-coach/promo-video.html) · [English docs](README.en.md)

## 安装

Claude Code 用户级安装：

```bash
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/learnmap-skill
```

Windows PowerShell：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.claude\skills\learnmap-skill"
```

Codex 用户级安装：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.codex\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$env:USERPROFILE\.codex\skills\learnmap-skill"
```

项目级安装：

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/learnmap-skill
```

## 使用

```text
使用 learnmap-skill 教我强化学习。我会 Python，希望一周内跑一个简单实验。
```

```text
使用 learnmap-skill 快速模式教我强化学习。
```

第一次交互会先问语言；如果你没有指定课件模式，LearnMap 会问你要快速总览，还是慢速逐章深入。

## What's New

- [2026/06] LearnMap adds fast overview mode, slow deep-course mode, and an embedded recorded usage walkthrough.
- [2026/06] Optional HTML video explainers and mentor lenses are now opt-in learning paths.
- [2026/05] Interactive HTML lessons now export detailed learning records for AI follow-up.

## 两种课件模式

| 模式 | 适合场景 | 输出 |
|---|---|---|
| Fast overview | 先快速理解全貌 | `快速总览/课件.html`，一章包含地图、例子、误区、测验和下一步 |
| Slow course | 逐章理解全貌和细节 | `第01课-全局地图/课件.html` 起步，然后一章一课推进 |

## 核心产出

| 场景 | 产出 |
|---|---|
| 快速理解全貌 | 一章浓缩版交互式 HTML 课件 |
| 深入学习新领域 | 全局地图、学习路线、逐章 HTML 课件、掌握检查 |
| 纠正错题 | 答错后显示解析，并提供 `复习 →` 跳回对应知识点 |
| 项目交付准备 | 技术决策清单、风险列表、实施路线 |
| 面试或考试 | 知识地图、主动回忆题、分级模拟题 |
| 理解代码库 | 仓库地图、术语表、逐步探索任务 |
| 可视化讲解 | 可选 HTML 动效讲解页 |
| 高手视角学习 | 可选 mentor lens、反例和诚实边界 |

视频式讲解不是默认流程。LearnMap 会先询问是否需要；接受后默认生成 HTML 动效页，不直接渲染 MP4。

mentor lens 同样不会默认开启。它只作为教学适配器，不做人物扮演，也不编造原话。

## 学习闭环

```text
校准学习者
→ 绘制知识地图
→ 生成交互式 HTML 课件
→ 页面内练习和自检
→ 导出学习记录
→ AI 读取薄弱点继续下一课
```

## 安全说明

- Skill 本身只有 Markdown 指令和 YAML 元数据。
- 不会自动发起网络请求。
- 课程文件生成在本地工作空间。
- 可选视频讲解默认是 HTML 预览，不会自动调用外部渲染服务。

## 来源

学习工作流源自：[如何用 Claude Code 开启 10 倍学习法？](https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ)

质量闸门吸收 [Darwin Skill](https://github.com/alchaincyf/darwin-skill) 的评估与验证思想；可选 mentor lens 吸收 [Nuwa Skill](https://github.com/alchaincyf/nuwa-skill) 的认知框架提炼方法。

如果要用 DeepSeek 做回归反馈，设置 `DEEPSEEK_API_KEY` 后运行 `node scripts/deepseek-skill-eval.mjs`。报告会写入 `.skill-evals/`，不会进入 git。

MIT © [lwbscu](https://github.com/lwbscu)
