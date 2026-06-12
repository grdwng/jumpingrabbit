# [Feature/Module Name] — Design Spec

**Date**: YYYY-MM-DD
**Status**: Draft | Approved — Pending Implementation | Approved — In Progress | Implemented
**Phase**: N of M (omit if standalone)
**Author**: [name]

---

## Overview

[1-3 paragraphs: what we're building, why, who benefits, success criteria]

---

## CodeGraph 上下文

> **必填**。在写 spec 前跑下面的命令,把输出贴到对应子段。
> 目的:让 spec 写作者先看清楚代码地图,避免重复造轮子 + 误判模块边界。

### 模块边界

```bash
mcp__codegraph__codegraph_files path=app/renderer/<module>/
```

| 子目录/文件 | 职责 | 现有 symbols |
|------|------|------|
| `app/renderer/X.js` | ... | N symbols |
| `app/renderer/Y.js` | ... | N symbols |

### 关键符号清单(可能复用的)

```bash
mcp__codegraph__codegraph_search query="<feature keyword>"
```

| 现有符号 | 位置 | 用途 |
|------|------|------|
| `existingFunc` | `app/renderer/X.js:42` | 已经做了一半类似的事,可参考 |
| `anotherHelper` | `app/renderer/Y.js:18` | 工具函数,直接复用 |

### 重名/冲突检查

确认新功能不会和现有符号撞名:

```bash
mcp__codegraph__codegraph_search query="<new func name>"
```

[ ] 无冲突,或 [ ] 列出冲突点 + 改名方案

---

## Goals & Non-Goals

### Goals
- [ ] Goal 1
- [ ] Goal 2

### Non-Goals
- Out of scope 1
- Out of scope 2

---

## Design

[Architecture, data model, UI/UX, API contract — whatever fits the feature]

---

## File Plan

| File | Action | Purpose |
|------|--------|---------|
| `path/to/file` | Create / Modify | Why |

---

## Acceptance Criteria

- [ ] Criterion 1 (verifiable)
- [ ] Criterion 2 (verifiable)

---

## Open Questions

- [ ] Question 1
- [ ] Question 2
