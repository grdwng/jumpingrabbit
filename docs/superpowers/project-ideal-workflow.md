# 02_project Ideal Workflow (本地基线)

> 2026-06-07 首次 audit 后建立的项目级基线文档
> 对比 [ideal-workflow.md](../templates/ideal-workflow.md) — 那是 01_project 的通用基线;本文件是 **02_project 的本地化版本**
> 数据来源:[audit-2026-06-07.md](./audits/audit-2026-06-07.md)(20 sessions,5月23日~6月7日)

## 🎯 核心原则(沿用)

1. **Think Before Coding** — 不确定就问,假设说清楚
2. **Simplicity First** — 没要的功能不加
3. **Surgical Changes** — 只动必要的
4. **Goal-Driven Execution** — 达成就停

## 🔴 4 个强制 Skill(2026-06-07 audit 实际数据)

| Skill | 触发时机 | 当前(20 sessions) | 目标 | 差距 | 状态 |
|-------|---------|------|------|------|------|
| `superpowers:using-superpowers` | 每个新任务开始 | 0 显式调用 | ≥ 1.0 | -1.0 | ⚠️ 自动注入不算 |
| `superpowers:test-driven-development` | 开发阶段 | 0.40/会话 | ≥ 0.5 | -0.10 | ⚠️ 略低 |
| `superpowers:systematic-debugging` | 每个 bug 修复前 | 0.15/会话 | ≥ 0.5 | **-0.35** | ❌ 严重不足 |
| `superpowers:verification-before-completion` | 标 done 前 | **0.00/会话** | ≥ 1.0 | **-1.00** | ❌ 极差(从未调) |

**2026-06-07 改的硬规则**(见下方"🔴 4 个本地硬规则"):
- `verification-before-completion` 0 → 期望下次 audit ≥ 0.5
- `systematic-debugging` 0.15 → 期望下次 audit ≥ 0.3

## 🟢 重度使用 Skill(应当保持)

| Skill | 当前(20 sessions) | 目标 | 状态 |
|-------|------|------|------|
| `superpowers:writing-plans` | 0.50/会话 | ≥ 0.5 | ✅ |
| `superpowers:brainstorming` | 0.05/会话 | ≥ 0.5 | ❌ 严重不足 |
| `superpowers:subagent-driven-development` | 0.35/会话 | ≥ 0.5 | ⚠️ 略低 |
| `superpowers:executing-plans` | 0.15/会话 | ≥ 0.5 | ❌ 不足 |

## 🏗️ 3 层架构(沿用 + 02_project 实例)

```
全局规则(~/.claude/rules/common/  · 14 文件,自动加载)
        ↓
项目特定(项目/CLAUDE.md  · 87 行,引用 + 身份 + 怎么跑)
        ↓
工具 + 模板 + hook
  · CodeGraph(自动同步,256 历史调用,27 files indexed)
  · docs/superpowers/templates/(spec + plan + project-ideal-workflow)
  · PostToolUse hook(自动 sync + file-type 过滤)
        ↓
02_project 实例
  · game.html 1634 行单文件(单文件架构,影响 Edit/Read 基线)
  · scripts/*.spec.js(25 个 Playwright tests)
  · memory/MEMORY.md(269 行项目工作笔记,持续累积)
  · .claude/scheduled_tasks.json(下周一 10:07 self-evolve cron)
```

## 🔄 5 阶段任务生命周期(沿用,所有阶段都加 🔴 强制 skill)

```
需求 → 计划 → 开发 → 测试 → 完成
 ↓      ↓      ↓      ↓      ↓
checkpoint × 5(每阶段必停等确认)
```

| 阶段 | 02_project 实例 | 必用 skill |
|------|--------|----------|
| 需求 | "这个理解对吗?同意后我写规格文档" | `superpowers:brainstorming`(复杂需求时) |
| 计划 | "计划这样实现,同意吗?" | `superpowers:writing-plans` 或 `planner` agent |
| **开发** | "代码写好了,跑一下看看?" | **`superpowers:test-driven-development` 或 `tdd-guide` agent** 🔴 |
| **测试** | "功能验证通过了吗?" | **`superpowers:verification-before-completion`** 🔴 |
| **完成** | "TaskUpdate completed 了吗?" | **`superpowers:verification-before-completion`** 🔴(关门卡) |

## 🐛 Bug Fixing 4 铁律(沿用 + 双门卡)

1. 复现 → 报错 → 根因 → 最小修复 → 验证
2. 禁止"无验证的已修复"
3. 一次只改一个问题
4. 2 次失败 → 停止,重新分析

**双门卡链**(2026-06-07 新增):
```
接到 bug → 调 systematic-debugging 🔴(改代码前关门卡)
       → 改代码 → 跑测试
       → 调 verification-before-completion 🔴(标 completed 前关门卡)
       → TaskUpdate completed
```

## 📊 工具使用基线(02_project 本地化,2026-06-07 audit)

| 工具 | 02_project 实际 | ideal-workflow 期望 | 02_project 本地期望 | 偏差原因 |
|------|------|------|------|------|
| Bash | 60.70 | 60±20 | 60±20 | ✅ 区间内 |
| Read | 27.65 | 15±5 | **25-30** | ⚠️ 单文件 game.html 1634 行,改前必读全 |
| codegraph | 12.80 | ≥ 10 | ≥ 10 | ✅ |
| Edit | 22.50 | 8±3 | **20-25** | ⚠️ 单文件架构,改一次动一片 |
| TaskCreate+Update | 12.85 | ≥ 3 | ≥ 3 | ✅ 超 4x |
| Agent | 2.15 | ≥ 1 | ≥ 1 | ✅ |
| Skill | 1.30 | ≥ 2 | ≥ 2 | ❌ -35% 偏低(已被 3 个硬规则盯住) |
| Write | 4.20 | 1-6 | 1-6 | ✅ 区间内 |

**关键偏差说明**:
- Edit 22.5 / Read 27.65 = 单文件架构的固有限制,**不应降到 8/15**
- ideal-workflow 的 8/15 期望是"多文件 + 模块化"架构的目标
- 02_project 用本文件本地化为 20-25 / 25-30

## 🧠 CodeGraph 5 个强制触发点(沿用)

| 场景 | 命令 | 02_project 实际 |
|------|------|------|
| 🔧 重构 | `codegraph_impact` | 19 次 ✅ |
| 🆕 新功能 | `codegraph_files` + `codegraph_search` | 18 + 85 次 ✅ |
| ✏️ 改签名 | `codegraph_callers` | 19 次 ✅ |
| 🐛 跨文件 bug | `codegraph_callees` | 19 次 ✅ |
| 📊 复杂度 | `codegraph_complexity` | **0 次** ❌(2026-06-07 audit 待补) |

**CodeGraph 索引状态**(2026-06-07): 27 files / 64 nodes / 64 edges / 0.22 MB
**排除规则**:`node_modules` / `dist` / `test-results`(从 01_project 复用)

## 🔴 02_project 4 个本地硬规则(2026-06-07 新增)

### 硬规则 #1:verification-before-completion 关门卡

**位置**:`~/.claude/rules/common/task-workflow.md`(已完成,2026-06-07 改)
**作用**:TaskUpdate 标 completed 的前置条件;不调 = 不允许标 completed
**期待数据**:下次 audit `verification-before-completion` 0 → ≥ 0.5/会话

### 硬规则 #2:systematic-debugging 关门卡

**位置**:`~/.claude/rules/common/bug-fixing-discipline.md`(已完成,2026-06-07 改)
**作用**:改 bug 代码前的关门卡;不调 = 不允许动 bug fix 代码
**期待数据**:下次 audit `systematic-debugging` 0.15 → ≥ 0.3/会话

### 硬规则 #3:Agent 选择决策表(避免 default general-purpose)

**位置**:`~/.claude/rules/common/agents.md`(已完成,2026-06-07 改)
**作用**:dispatch agent 前先查表;能选专门就别选 `general-purpose`
**期待数据**:下次 audit `general-purpose` 77/78 (99%) → ≤ 70/100 (70%)

### 硬规则 #4:双门卡链(bug fix 必须走 2 个 skill)

**位置**:本文件 + 上 2 个规则
**作用**:bug fix 流程 = systematic-debugging → 改代码 → verification-before-completion
**期待数据**:bug fix 相关会话里 2 个 skill 都必须出现

## 🚫 不做的事(沿用 + 02_project 补充)

- ❌ 追溯修复历史不合规代码(默认不碰)
- ❌ 凭记忆选 skill(每次用 `using-superpowers`)
- ❌ 无验证标 done
- ❌ 重构时 refactor working logic
- ❌ 1 次会话里同一 bug 修 2 次以上
- ❌ **把 game.html 拆成多文件**(项目级决策,单文件架构是项目特色,2026-06-07 决定不改)
- ❌ **追平 01_project 的 8/15 Edit/Read 基线**(单文件架构决定 02_project 基线是 20-25/25-30)

## 📅 跟踪机制

| 行动 | 状态 | 期待下次 audit |
|------|------|------|
| 改 `task-workflow.md` 加 verification 关门卡 | ✅ | `verification-before-completion` ≥ 0.5/会话 |
| 改 `bug-fixing-discipline.md` 加 systematic 关门卡 | ✅ | `systematic-debugging` ≥ 0.3/会话 |
| 改 `agents.md` 加 agent 决策表 | ✅ | `general-purpose` 占比 ≤ 70% |
| 写本文件(本地基线) | ✅ | 偏差说明覆盖单文件架构,audit 不再标"偏高" |
| 跑 `audit-skills.sh` 首次 | ✅ | 2026-06-07 audit-2026-06-07.md |

## 🔄 下次审计触发

- **时间**:下周一 2026-06-08 10:07(由 `.claude/scheduled_tasks.json` 配的 cron 触发)
- **命令**:`PROJ_DIR=~/.claude/projects/-Users-gordonwangmbp-Documents-02-project REPO_DIR=/Users/gordonwangmbp/Documents/02_project bash scripts/audit-skills.sh`
- **输出**:`docs/superpowers/audits/audit-2026-06-08.md`
- **本次对比**:看 3 个硬规则是否把对应数据拉起来

## 📝 本地术语表

| 术语 | 02_project 含义 |
|------|------|
| "单文件架构" | game.html 1634 行,所有 JS/Three.js 逻辑都在一个文件 |
| "中级关卡" | level 16-30,有 y=0,1,2 高度变化;level 1-15 是初级(2D) |
| "R135" | 2026-05-30 任务代号:优化中级关卡 16-20 立体感(已完成) |
| "黄色线团 bug" | 屏幕中心偶尔出现 1-2 秒的黄色线条/圈圈(2026-06-07 调查中) |
| "audit-skills.sh" | 复现 2026-06-07 自查的工具调用统计脚本 |
| "本地基线" | 本文件 — 标定 02_project 自己的理想工具使用值,区别于 ideal-workflow.md |
