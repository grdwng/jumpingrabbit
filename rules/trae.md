# trae.md
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




## 5, fix bug 核心规则（必须遵守）
- 修复 bug 必须：**先复现→贴报错→定位根因→最小修复→验证通过**，再标记 done。
- **禁止无验证的“已修复”**，禁止静态分析替代真实执行。
- 一次只改一个问题，**不批量修复**；改完必须跑对应测试/复现步骤。
- 若同一问题修复 2 次未解决，**停止修复，重新分析根因**，不许绕圈。
- 先不要改代码！先复现问题、拿到错误日志 / 堆栈 / 测试结果，贴出来。只基于真实报错修复，不许猜、不许静态分析。修复后必须跑一遍复现步骤确认问题消失，再告诉我 “已修复”。
