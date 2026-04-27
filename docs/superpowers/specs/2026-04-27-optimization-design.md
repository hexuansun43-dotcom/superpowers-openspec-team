# Optimization Design: Progressive Loading, Model Routing, MCP Server, agentskills Compatibility

**Date**: 2026-04-27
**Version**: 2.0.10+
**Strategy**: Incremental evolution (P0 → P1 → P2 → P3, each phase independently verified and released)

---

## P0: Progressive Skill Loading

### Problem

SKILL.md files load entirely when activated (~22KB across 5 skills). Orchestrators (OMC, Claude Code) cannot decide whether to activate a skill without reading the full content.

### Solution

Surface key metadata from `workflow.yaml` into SKILL.md frontmatter and generate a lightweight `skill-index.json` per adapter during build.

### Schema Changes

**`SkillFrontmatterSchema`** — add optional fields:

```yaml
---
name: superpowers-feature-workflow
description: "Design, plan, TDD implement, verify — no OpenSpec artifacts"
argument-hint: "feature work needing brainstorming, planning, TDD"
type: workflow
standalone: false
triggers:
  - user-explicit-skill-name
  - user-explicit-workflow-request
  - repo-policy-explicit-requirement
model_hint: sonnet
tags:
  - feature
  - tdd
  - workflow
category: engineering
---
```

New fields: `model_hint`, `tags`, `category`. All optional. Valid values:
- `model_hint`: `haiku` | `sonnet` | `opus` (default: `sonnet`)
- `tags`: array of strings (max 10, each max 30 chars)
- `category`: `engineering` | `orchestration` | `learning`

### Build Changes

`sot build` generates `dist/{adapter}/skill-index.json`:

```json
[
  {
    "name": "superpowers-feature-workflow",
    "description": "Design, plan, TDD implement, verify...",
    "argument-hint": "feature work needing brainstorming, planning, TDD",
    "type": "workflow",
    "triggers": ["user-explicit-skill-name", "..."],
    "model_hint": "sonnet",
    "tags": ["feature", "tdd", "workflow"],
    "category": "engineering",
    "skill_path": ".claude/skills/superpowers-feature-workflow/SKILL.md"
  }
]
```

Orchestrators read `skill-index.json` (a few hundred bytes) first, load full SKILL.md only when needed.

### Backward Compatibility

New fields are all optional. Existing SKILL.md files work unchanged. `skill-index.json` is a new output file; existing manifest.json and bundles are unaffected.

### Files Changed

- `src/core/schema/types.ts` — extend `SkillFrontmatterSchema`
- `src/core/schema/parser.ts` — no change (YAML parser handles new fields)
- `src/commands/build.ts` — generate `skill-index.json`
- `skills/*/SKILL.md` — add new frontmatter fields to all 5 skills
- `skills/*/workflow.yaml` — add `tags`, `category`, `model_hint`

### Tests

- Unit: frontmatter parsing with new fields
- Unit: `skill-index.json` generation and content
- E2E: `sot build` produces `skill-index.json` in adapter dirs

---

## P1: Model Routing Hints

### Problem

Skills do not specify which model tier is appropriate for each phase. Orchestrators with model routing support (OMC) have no signal to optimize cost.

### Solution

Add `phases` array to `workflow.yaml` with per-phase `model_hint`.

### Schema Changes

**`WorkflowMetaSchema`** — add optional `phases` field:

```yaml
phases:
  - name: brainstorming
    model_hint: haiku
  - name: design
    model_hint: sonnet
  - name: planning
    model_hint: sonnet
  - name: implementation
    model_hint: sonnet
  - name: verification
    model_hint: opus
```

`PhaseSchema`:
```typescript
z.object({
  name: z.string(),
  model_hint: z.enum(['haiku', 'sonnet', 'opus']).optional().default('sonnet'),
})
```

### Build Changes

1. `skill-index.json` includes top-level `model_hint` and `phases` array
2. Adapter output includes `model_hint`:
   - Claude Code: SKILL.md frontmatter `model_hint` field
   - Cursor: `.mdc` file `modelHint` metadata
   - Codex: manifest.json `model_hint` field
   - Gemini: `gemini-extension.json` `model_hint` field

### Backward Compatibility

`phases` is optional. Existing workflow.yaml files work unchanged. Missing `model_hint` defaults to `sonnet`.

### Files Changed

- `src/core/schema/types.ts` — add `PhaseSchema`, extend `WorkflowMetaSchema`
- `src/core/adapters/*.ts` — write `model_hint` to adapter-specific configs
- `skills/*/workflow.yaml` — add `phases` to all 5 skills

### Tests

- Unit: workflow.yaml parsing with `phases`
- Unit: adapter output includes `model_hint`
- Snapshot: `skill-index.json` contains phases

---

## P2: Embedded MCP Server (`sot serve`)

### Problem

No MCP interface exists. External orchestration tools cannot query skill metadata, dependencies, memory, or workflow status programmatically.

### Solution

Add `sot serve` subcommand that starts a stdio-mode MCP server exposing project state.

### CLI Command

```
sot serve [--project-root .]
```

Default: stdio mode (for Claude Code `.mcp.json` configuration).
Future: optional `--port` for HTTP SSE mode.

### MCP Tools

| Tool | Purpose | Parameters |
|------|---------|-----------|
| `sot_list_skills` | List all skills with metadata | none |
| `sot_skill_detail` | Get full skill content | `name: string` |
| `sot_skill_phases` | Get phases and model routing for a skill | `name: string` |
| `sot_check_dependencies` | Check if skill dependencies are met | `name: string` |
| `sot_query_memory` | Search project memory | `type?: string, query?: string` |
| `sot_workflow_status` | Check which deliverables exist | `skill: string, change?: string` |

### Architecture

```
sot serve
  └── McpServer (stdio)
       ├── SkillRegistry      ← reads skill-index.json + SKILL.md
       ├── DependencyChecker   ← reuses install-deps logic
       ├── MemoryQuerier      ← reads .superpowers-memory/
       └── WorkflowStatus      ← checks file existence
```

### New Dependency

`@modelcontextprotocol/sdk` — official MCP SDK for TypeScript.

### Configuration

Users add to project `.mcp.json`:
```json
{
  "mcpServers": {
    "sot": {
      "command": "sot",
      "args": ["serve"]
    }
  }
}
```

### Backward Compatibility

New subcommand. No impact on existing functionality.

### Files Changed

- `src/commands/serve.ts` — new MCP server command
- `src/cli/index.ts` — register `serve` command
- `src/mcp/server.ts` — MCP server implementation
- `src/mcp/tools/*.ts` — individual tool implementations
- `package.json` — add `@modelcontextprotocol/sdk` dependency

### Tests

- Unit: each MCP tool returns expected data
- Integration: stdio communication works end-to-end
- E2E: `sot serve` starts and responds to tool calls

---

## P3: agentskills Compatibility Layer

### Problem

`agentskills/agentskills` is emerging as an open standard for cross-platform skills. The project uses custom `workflow.yaml` + `SKILL.md` format, creating format lock-in risk.

### Solution

Add an agentskills manifest generator to `sot build` that maps existing data to the agentskills schema.

### Field Mapping

| Project Field | agentskills Field | Notes |
|--------------|-----------------|-------|
| `name` | `id` | direct |
| `description` | `description` | direct |
| `type` | `type` | workflow/orchestrator |
| `triggers` | `triggers` | direct |
| `phases[].model_hint` | `phases[].modelHint` | camelCase |
| `tags` | `tags` | from P0 |
| `category` | `category` | from P0 |
| `dependencies.external_skills` | `dependencies` | structure conversion |
| `outputs` | `outputs` | direct |
| SKILL.md body | `instructions` | full content |

### Output Example

`dist/agentskills/superpowers-feature-workflow.json`:
```json
{
  "id": "superpowers-feature-workflow",
  "version": "2.0.10",
  "type": "workflow",
  "description": "Design, plan, TDD implement, verify — no OpenSpec artifacts",
  "triggers": ["user-explicit-skill-name", "..."],
  "tags": ["feature", "tdd", "workflow"],
  "category": "engineering",
  "phases": [
    { "name": "brainstorming", "modelHint": "haiku" },
    { "name": "design", "modelHint": "sonnet" }
  ],
  "dependencies": ["brainstorming", "writing-plans", "tdd"],
  "outputs": ["docs/superpowers/specs/", "..."],
  "instructions": "Use this skill for the Superpowers half..."
}
```

### Build Changes

- `sot build --format agentskills` — generate agentskills manifests only
- `sot build --format all` — generate existing bundles + agentskills manifests
- Default (no `--format`) remains existing behavior for backward compatibility

### Backward Compatibility

New output directory `dist/agentskills/`. Existing `dist/` structure unchanged.

### Files Changed

- `src/commands/build.ts` — add `--format` option, agentskills generator
- `src/core/agentskills.ts` — mapping logic
- `src/core/schema/types.ts` — `AgentskillsManifest` type

### Tests

- Unit: field mapping correctness
- Unit: generated manifest validates against agentskills schema
- E2E: `sot build --format agentskills` produces expected output

---

## Implementation Order

| Phase | Version | Effort | Dependencies |
|-------|---------|--------|-------------|
| P0 | 2.1.0 | Low | None |
| P1 | 2.2.0 | Low | P0 (frontmatter model_hint field) |
| P2 | 2.3.0 | Medium | P0 (skill-index.json), P1 (phases) |
| P3 | 2.4.0 | Medium | P0 (tags/category), P1 (phases) |
