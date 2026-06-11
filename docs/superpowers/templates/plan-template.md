# [Feature/Module Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [1 sentence — what the implementation delivers]

**Architecture:** [1-3 sentences — major design choices, key files, data flow]

**Tech Stack:** [Languages, frameworks, libraries involved]

---

## Impact 分析

> **必填**。在写 task 之前先跑 `codegraph_impact`,把受影响范围写在每个 task 的 Files 段。
> 目的:让执行者一眼看清"动 X 会连带动 Y/Z",避免漏改或漏测。

### 整体影响半径

```bash
mcp__codegraph__codegraph_impact symbol="<entry point>" depth=2
```

> 输出贴在下方,改完本计划后必须回填。

```
[粘贴 codegraph_impact 输出]
```

### 跨文件调用图(关键)

```bash
mcp__codegraph__codegraph_callers symbol="<要改的函数>" limit=20
mcp__codegraph__codegraph_callees symbol="<要改的函数>" limit=20
```

> 输出贴在下方。

```
[粘贴 callers + callees 输出]
```

---

## File Map

| File | Action | 关联 callers(从 codegraph) | 备注 |
|------|--------|------|------|
| `path/to/X.js:42` | Modify | `funcA(X.js:10)`, `funcB(Y.js:55)` | 改完通知所有 caller |
| `path/to/new.js` | Create | (none) | 新文件 |

---

## Task 1: [Title]

**Files:**
- Create / Modify: `path/to/file:line`
- 关联 callers(必查):`codegraph_callers <symbol>` 已确认范围

- [ ] **Step 1: ...**

[详细步骤、代码片段、验证方法]

- [ ] **Step 2: ...**

---

## Task 2: [Title]

**Files:**
- Create / Modify: `path/to/file:line`
- 关联 callers(必查):`codegraph_callers <symbol>` 已确认范围

- [ ] **Step 1: ...**

---

## Verification

[整体怎么验、回归测什么、E2E 跑哪个 spec]

- [ ] `npm test` 通过
- [ ] E2E `tests/e2e/<flow>.spec.js` 通过
- [ ] 手动跑一遍 happy path
