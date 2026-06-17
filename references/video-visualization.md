# Video Visualization Workflow

Use this reference only when the learner accepts an optional video-style visual explainer or explicitly asks for a video/demo artifact.

The default deliverable is a self-contained HTML motion page. Do not render MP4 unless the user asks for a finished video file.

## Source Principle

Effective agent video work is a pipeline, not one magic tool:

1. Choose one video type.
2. Define inputs, outputs, folders, and delivery format.
3. Write the script and storyboard.
4. Gather or create assets.
5. Add captions and motion.
6. Preview, revise, then render only if needed.

For learning content, use this as a lightweight teaching export: turn a lesson map, key examples, mastery checks, and weak spots into a short visual explanation.

## Inputs

Collect or infer:

- topic and lesson title
- learner background and goal
- audience: beginner, practitioner, reviewer, interviewer, or public blog reader
- duration: default 60-90 seconds
- language mode: Chinese, English, or bilingual captions
- visual style: inherit from the lesson unless the user specifies another direction
- delivery: HTML preview by default; MP4 only on explicit request

## Outputs

Create the following inside the topic workspace:

- Chinese mode: `视频讲解.html`
- English mode: `video-explainer.html`

The HTML should include:

- 5-8 timed scenes
- bilingual captions when useful
- visible play, pause, restart controls
- progress indicator or scene counter
- concise source notes embedded in comments or a small appendix section
- no network dependency unless the user approves external assets

## Scene Blueprint

For a 60-90 second learning explainer, use this structure:

| Scene | Purpose | Typical Content |
|---|---|---|
| 1 | Hook | The core question this lesson answers |
| 2 | Map | 3-6 concepts and their relationship |
| 3 | Concrete example | One practical scenario or analogy |
| 4 | Mechanism | How the concept works step by step |
| 5 | Trap | A common misconception and correction |
| 6 | Mastery | One active-recall question or decision point |
| 7 | Next step | What to type or do after watching |

Keep each scene focused. Prefer one message, one diagram, and one caption pair per scene.

## HTML Motion Requirements

- Use a fixed aspect stage such as 16:9 or 9:16, responsive inside the browser.
- Use HTML/CSS/JS only unless the user has requested a specific video framework.
- Put final layout in CSS first, then animate opacity/transform/class changes.
- Keep text large enough for mobile viewing.
- Avoid generic AI-gradient branding. Prefer a style that matches the lesson domain or the user's reference.
- Use deterministic timing. Avoid random motion unless seeded.
- Provide controls: play/pause, restart, and optional scene dots.
- Use captions as real text, not images.

## Tool Routing

- **HTML preview first**: use for teaching explainers, GitHub Pages demos, blog embeds, and quick review.
- **HyperFrames**: use when the user wants a finished motion-graphics MP4, captioned promo, product video, or high-polish render from HTML/CSS/GSAP.
- **Remotion**: use when the user wants React-driven video, reusable compositions, or batch rendering from structured data.
- **video-use / videocut-skills**: use when editing existing footage, trimming speech, burning subtitles, color grading, or producing cuts from raw media.
- **Generative Media / Seedance-style prompt skills**: use only for AI-generated b-roll, cinematic clips, prompt engineering, or external model generation.

When another video skill is available, use the smallest tool chain that completes the requested delivery. Do not ask the learner to install a full video stack for an HTML preview.

## Learning Integration

Before generating the explainer, read:

- profile/progress files for learner background, language, and `videoExplainer`
- the current lesson HTML or map
- exported learning record JSON if present
- mistake log if the video should emphasize weak spots

After generating the explainer:

- update progress with the output path
- set `videoExplainer: accepted`
- include the next lesson command or review command inside the final scene

If the learner declines:

- set `videoExplainer: declined`
- continue normal lesson flow without mentioning video again for the same topic unless asked
