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




## 5, fix bug 核心规则（必须遵守）
- 修复 bug 必须：**先复现→贴报错→定位根因→最小修复→验证通过**，再标记 done。
- **禁止无验证的”已修复”**，禁止静态分析替代真实执行。
- 一次只改一个问题，**不批量修复**；改完必须跑对应测试/复现步骤。
- 若同一问题修复 2 次未解决，**停止修复，重新分析根因**，不许绕圈。
- 先不要改代码！先复现问题、拿到错误日志 / 堆栈 / 测试结果，贴出来。只基于真实报错修复，不许猜、不许静态分析。修复后必须跑一遍复现步骤确认问题消失，再告诉我 “已修复”。

# 项目工作流（必须遵守）

## 每次开始新任务前必须：

1. **检查 memory 中的项目进度**
   - 读取 `memory/MEMORY.md` 和相关进度文件
   - 展示：当前任务 + 已完成 + 下一步

2. **用 TaskCreate 创建任务树**
   - 父任务 = 顶层目标
   - 子任务 = 可执行的最小单位
   - blockedBy = 标记依赖关系

3. **按依赖顺序执行，在检查点停下来等你确认**

## 任务生命周期（每个阶段必须确认才能继续）

```
需求 → 计划 → 开发 → 测试 → 完成
```

| 阶段 | 检查点 |
|------|--------|
| 需求 | “这个理解对吗？同意后我写规格文档” |
| 计划 | “计划这样实现，同意吗？” |
| 开发 | “代码写好了，跑一下看看？” |
| 测试 | “功能验证通过了吗？” |

## 规则

- 子任务不完成，父任务不能标记完成
- 每个检查点停下来等确认，不自动进入下一阶段
- 完成后更新 memory，记录当前进度
- 你可以随时问我：「我们进行到哪一步了？」
