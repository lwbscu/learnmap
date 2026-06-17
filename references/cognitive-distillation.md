# Cognitive Distillation

Use this reference only when the learner explicitly asks for a named thinker, expert, public figure, or domain framework lens.

The goal is not role-play. The goal is to adapt a lesson through a useful thinking lens while preserving the normal learning workflow.

## Inputs

- Topic or lesson concept
- Learner background and goal
- Requested lens, such as Feynman, Karpathy, Munger, Jobs, a senior systems engineer, or a product-first operator
- Available source material, if the learner provides it
- Language mode

## Outputs

- Chinese mode: `思维镜片.md`
- English mode: `mentor-lens.md`
- A concise lens brief embedded or linked from the current lesson when useful
- Lens-adapted explanation sections, examples, counterexamples, quiz prompts, and review questions

## Routing

Use a mentor lens only when the learner asks for it directly:

```text
用费曼方式解释 PPO
Explain transformers through a Karpathy-style lens
用芒格视角帮我理解这个投资模型
用产品经理视角讲这个架构
```

If the learner does not ask for a lens, keep `mentorLens: none` and teach normally.

If the learner asks for role-play, convert it to a teaching lens unless role-play is the explicit learning objective. Say that the output is based on public patterns or a domain framework, not the real person's private view.

## Extraction Steps

1. Define the lens
   - Identify whether it is a named-person lens or a domain-framework lens.
   - State the teaching purpose in one sentence.
   - If evidence is thin, mark it provisional.

2. Extract 3-5 mental models
   - Cross-domain recurrence: the idea appears in more than one context.
   - Generative power: it helps predict how the lens would approach a new problem.
   - Distinctiveness: it is not just generic smart advice.

3. Extract 3-7 decision heuristics
   - Write them as concrete "when X, do Y" rules.
   - Attach each heuristic to a learning use case, not a biographical claim.

4. Extract expression DNA only as teaching style
   - Sentence rhythm, analogy density, directness, uncertainty level, and preferred examples.
   - Use lightly. The goal is clarity, not imitation.

5. Set honest boundaries
   - Separate public evidence, learner-provided source material, and inference.
   - Do not claim private beliefs, current views, or exact wording without a source.
   - If current facts matter, verify them before using them.

## Lens Brief Template

```markdown
# Mentor Lens / 思维镜片

- Lens: [name]
- Purpose: [why this helps this lesson]
- Status: [stable teaching analogy / source-backed / provisional]
- Source basis: [public work, learner-provided material, or domain framework]
- Use for: [concept ordering, analogies, mistakes to watch, practice prompts]
- Do not use for: [impersonation, quotes, current biography, replacing mastery checks]

## Mental Models

1. [Model]: [one sentence]
2. [Model]: [one sentence]
3. [Model]: [one sentence]

## Decision Heuristics

- When [learning situation], use [heuristic].
- When [common mistake], ask [diagnostic question].

## Teaching Adaptation

- Explanation style:
- Best examples:
- Counterexamples:
- Quiz style:
- Boundaries:
```

## Lesson Integration

Apply the lens in the lesson without changing the core artifact rules:

- Global map: add a small "lens view" box after the neutral map.
- Concept explanation: explain neutrally first, then add the lens-specific angle.
- Examples: choose examples the lens would naturally foreground.
- Mistake diagnosis: use lens-specific questions to reveal the broken reasoning link.
- Quizzes: include one optional lens-based question, but keep core mastery checks neutral.
- Learning record: include `mentorLens` and any lens-specific weak spots.

## Anti-Patterns

- Do not speak in first person as the mentor.
- Do not write fake quotes.
- Do not imply endorsement or real-time opinion.
- Do not replace evidence with vibes.
- Do not let the lens narrow the lesson so much that the learner misses core concepts.
- Do not create a separate person-skill inside the learning workspace unless the user asks for a new skill.
