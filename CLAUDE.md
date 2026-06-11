# CLAUDE.md
Behavioral guidelines to reduce common LLM coding mistakes.
Merge with project-specific instructions as needed.

Tradeoff: These guidelines bias toward caution over speed.
For trivial tasks, use judgment.

## 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them.
- If a simpler approach exists, say so.
- If something is unclear, stop. Name what's confusing.

## 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

## 3. Surgical Changes
Only touch what's necessary. Preserve existing style.

- Do not "optimize" unrelated code.
- Do not refactor working logic.
- Match the project's existing code style.
- If you notice dead code, mention it—don't delete.
- Every change must trace directly to the user's request.

## 4. Goal-Driven Execution
Focus on outcomes, not steps. Iterate toward the goal.

- Clarify the target outcome before writing code.
- Break complex goals into small, verifiable steps.
- After each change, verify it works as intended.
- Stop once the goal is achieved—don't overdeliver.

