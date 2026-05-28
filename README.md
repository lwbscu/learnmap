# AI 10x Learning Coach

[中文](#中文) | [English](#english)

## 中文

**AI 10x Learning Coach** 是一个为 Claude Code / Codex 设计的学习型 Skill。它把 AI 从“回答问题的聊天框”变成“会因材施教的私人导师”：先帮你建立一个陌生领域的全局地图，再一章一章讲解，每章都通过测试验证理解，最后根据你的错误定制补课路径。

它特别适合这些场景：

- 你要在 1-2 周内快速理解一个陌生行业、技术栈或项目领域
- 你不想只收集笔记，而是想真正形成“概念性理解”
- 你希望 Claude Code 能持续维护学习地图、进度、错题和复习任务
- 你想把文章、文档、代码仓库或资料包转成可执行的学习路径

### 核心思想

传统学习很容易陷入两种问题：

1. 一开始就钻细节，越查越乱，缺少全局地图。
2. 看完觉得自己懂了，但没有输出验证，第二天就忘。

这个 Skill 反过来做：

```text
先画地图 -> 再学章节 -> 多视角解释 -> 真实例子 -> 出题验证 -> 记录错误 -> 针对性补课
```

它强调的不是“让 AI 一次性生成一万字教程”，而是让 AI 陪你完成一个高质量学习闭环。

### 学习工作流

| 阶段 | Claude 会做什么 | 你要做什么 |
|---|---|---|
| 1. 校准背景 | 询问你的目标、基础、截止时间 | 说清楚你要学什么、为什么学 |
| 2. 建立地图 | 生成领域模块、概念关系、学习顺序 | 用自己的话复述地图 |
| 3. 逐章学习 | 每章从用户、业务、实现者三个视角讲解 | 追问不懂的概念 |
| 4. 例子落地 | 给真实例子和反例 | 判断例子对应哪个概念 |
| 5. 掌握检查 | 每章出 2-4 道题 | 认真作答 |
| 6. 纠错补课 | 标记误区并针对性重讲 | 重新回答直到过关 |
| 7. 维护记忆 | 更新学习进度、错题、复习提示 | 下次继续时从进度恢复 |

### 安装到 Claude Code

Claude Code Skills 通常放在 `.claude/skills/<skill-name>/SKILL.md` 结构下。可以安装到用户级目录，也可以安装到某个项目里。

用户级安装：

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach
```

项目级安装：

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/ai-10x-learning-coach
```

Windows PowerShell 用户级安装示例：

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$HOME\.claude\skills\ai-10x-learning-coach"
```

### 使用方式

在 Claude Code 中直接说：

```text
Use $ai-10x-learning-coach to help me learn robotics motion planning from zero in two weeks.
```

中文也可以：

```text
使用 $ai-10x-learning-coach 帮我从零学习大模型 API 调用。我有 Python 基础，希望 3 天内能写出一个可发布的教程项目。
```

更具体一点的提示词：

```text
Use $ai-10x-learning-coach.

Topic: diffusion models
Background: I know Python and basic deep learning, but not generative models.
Goal: understand the field well enough to read papers and implement a small demo.
Time budget: 10 days.
Please create a learning workspace, start with a global map, then teach one chapter at a time with mastery checks.
```

### 这个 Skill 会创建什么学习文件

当你需要持续学习一个主题时，它会建议维护类似这样的结构：

```text
learning/<topic>/
├── 00_profile.md
├── 01_map.md
├── progress.md
├── mistakes.md
└── part-XX-<module>.md
```

这些文件分别负责记录：

- 学习目标和背景
- 领域全局地图
- 当前进度
- 错误理解和纠正记录
- 每章讲解、例子、测试和反馈

### 为什么适合 Claude Code

普通 Chatbot 更适合临时问答，而 Claude Code / Codex 这类 Agent 能读写本地文件、整理长期学习资料、维护章节之间的上下文。学习一个陌生领域时，这种“持续维护一套学习资产”的能力很关键。

这个 Skill 会让 Agent 少做空泛解释，多做可沉淀的学习工作：

- 写出结构化地图
- 维护错题和误区
- 追踪章节进度
- 根据你的回答调整后续讲解
- 在需要时生成最终学习报告

### 目录结构

```text
ai-10x-learning-coach/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── assessment-rubric.md
│   └── session-artifacts.md
├── LICENSE
└── README.md
```

### 安全说明

这个 Skill 不包含可执行脚本，不会主动联网或运行命令。它主要提供学习工作流、文件模板和评估规则。安装第三方 Skill 前，仍然建议先阅读 `SKILL.md`。

### 开源协议

MIT License。

### 致谢

感谢这篇文章带来的方法启发：  
https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ

## English

**AI 10x Learning Coach** is a Claude Code / Codex skill that turns an AI agent into an adaptive learning coach. Instead of dumping a long guide, it helps you build a domain map, learn one module at a time, test your understanding, record misconceptions, and adapt the next lesson based on your mistakes.

Use it when you need to:

- onboard into an unfamiliar industry, codebase, technical field, or project domain
- build conceptual understanding instead of collecting passive notes
- convert articles, docs, repos, or source material into a learning path
- maintain a durable learning workspace with maps, progress, mistakes, and review prompts

### Core Idea

The workflow is simple:

```text
map first -> learn one module -> explain from multiple perspectives -> use real examples -> test mastery -> log mistakes -> reteach precisely
```

The goal is not to make Claude produce a giant textbook. The goal is to make Claude run a tight learning loop with you.

### Learning Loop

| Stage | What Claude does | What you do |
|---|---|---|
| 1. Calibration | Understands your background, goal, and deadline | Explain what you want to learn and why |
| 2. Domain map | Builds a coarse map of modules and relationships | Paraphrase the map in your own words |
| 3. Chapter teaching | Teaches one module at a time | Ask questions and identify unclear points |
| 4. Examples | Adds concrete examples and counterexamples | Connect examples back to concepts |
| 5. Mastery checks | Creates 2-4 questions per module | Answer actively |
| 6. Remediation | Diagnoses mistakes and reteaches weak points | Retry until the concept is stable |
| 7. Learning memory | Updates progress, mistakes, and review prompts | Resume from the saved state next time |

### Install For Claude Code

Claude Code skills are filesystem artifacts. A skill usually lives under `.claude/skills/<skill-name>/SKILL.md`.

User-level install:

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git ~/.claude/skills/ai-10x-learning-coach
```

Project-level install:

```bash
mkdir -p .claude/skills
git clone https://github.com/lwbscu/ai-10x-learning-coach.git .claude/skills/ai-10x-learning-coach
```

Windows PowerShell user-level install:

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
git clone https://github.com/lwbscu/ai-10x-learning-coach.git "$HOME\.claude\skills\ai-10x-learning-coach"
```

### Usage

In Claude Code:

```text
Use $ai-10x-learning-coach to help me learn a new domain from zero.
```

More specific:

```text
Use $ai-10x-learning-coach.

Topic: robotics motion planning
Background: I know Python and basic control theory.
Goal: understand the field well enough to read papers and build a small demo.
Time budget: 14 days.
Please create a learning workspace, start with a global map, and teach one module at a time with mastery checks.
```

### Learning Artifacts

For longer learning sessions, the skill may create a workspace like:

```text
learning/<topic>/
├── 00_profile.md
├── 01_map.md
├── progress.md
├── mistakes.md
└── part-XX-<module>.md
```

These files keep the learning process inspectable and resumable.

### Why Claude Code

Chatbots are useful for quick answers. Claude Code and Codex are better for agentic learning because they can read and write files, maintain long-term learning artifacts, inspect repos, and preserve progress across chapters.

This skill helps the agent:

- create structured concept maps
- maintain a mistake log
- track learning progress
- adapt teaching based on learner responses
- produce final learning dossiers when needed

### Repository Structure

```text
ai-10x-learning-coach/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── assessment-rubric.md
│   └── session-artifacts.md
├── LICENSE
└── README.md
```

### Safety

This skill does not include executable scripts. It provides teaching workflow instructions, learning artifact templates, and assessment rubrics. As with any third-party skill, read `SKILL.md` before installing.

### License

MIT License.

### Acknowledgement

Inspired by this article:  
https://mp.weixin.qq.com/s/DF2-X_iXMMz6e28v3Da3EQ
