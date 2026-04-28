# Superpowers + OpenSpec Team Skills

CLI-driven workflow skills for AI coding agents. Install structured delivery processes into Claude Code (including oh-my-claudecode), Cursor, Codex, or Gemini CLI with a single command.

## Quick Start

```bash
npm install -g superpowers-openspec-team

# Interactive setup — auto-detects installed AI tools
sot init /path/to/your/project

# Target a specific tool (skip interactive)
sot init /path/to/your/project --tool claude-code

# Include project memory template
sot init /path/to/your/project --with-memory
```

Running `sot init` without `--tool` launches an interactive setup:

1. **Welcome screen** — shows how many skills will be installed
2. **Tool detection** — scans for Claude Code, Cursor, Codex, and Gemini CLI; pre-selects detected tools
3. **Tool selection** — use arrow keys and space to add/remove tools
4. **Installation** — generates and installs skill files with a spinner
5. **Quick start guide** — shows next-step commands

```text
$ sot init ./my-project

  Welcome to Superpowers-OpenSpec
  A CLI-driven workflow skills framework for AI coding agents

  This setup will configure:
    • 5 workflow skill(s) for your AI tools
    • Tool-specific command files and skill directories
    • Optional .superpowers-memory/ for cross-session memory

? Select AI tools to install skills for: (Space to toggle, Enter to confirm)
  ◉ claude-code   (detected)
  ◯ cursor
  ◯ codex
  ◉ gemini        (detected)

✔ Installed 12 file(s) for 2 tool(s)

  Quick start after setup:

    sot list              # List available skills
    sot update             # Update installed skills
    sot validate           # Validate installation
```

For CI or agent-friendly use, add `--json` or `--force`:

```bash
sot init . --tool claude-code --force --json
```

After initialization, invoke a workflow explicitly in your AI tool:

```text
Use the openspec-superpowers workflow for this feature.
```

## CLI Commands

The `sot` CLI (v2.0.0) is the primary way to install, build, validate, and manage workflow skills.

### sot init

Initialize skills into a project for one or more AI tools. When OMC (oh-my-claudecode) is detected, skills are also installed to `.omc/skills/`, a SOT reference block is injected into `CLAUDE.md`, and the `sot` MCP server is registered in `~/.claude.json`.

```bash
sot init /path/to/project                 # auto-detect tools
sot init . --tool claude-code,cursor       # target specific tools
sot init . --tool codex --force            # skip prompts
sot init . --with-memory                   # install .superpowers-memory/ template
sot init . --dry-run                       # preview without writing
sot init . --backup                        # backup before overwriting
sot init . --tool claude-code --force --json  # agent-friendly JSON output
```

### sot update

Update previously installed skills. Only overwrites files that carry the `generatedBy: sot@` marker; manually edited files are left intact.

```bash
sot update /path/to/project
sot update . --dry-run
sot update . --backup
```

### sot build

Build `dist/` bundles from `skills/` source definitions. Used by maintainers after changing source workflows.

```bash
sot build
sot build --json
```

### sot validate

Validate installation integrity. Checks generatedBy markers, checksums, and memory date formats.

```bash
sot validate /path/to/project
sot validate . --json
```

### sot doctor

Check OMC integration health and installation status. Runs five diagnostics:

1. **OMC Installation** — detects project-local `.omc/` or global OMC install
2. **Skill Sync** — compares sot-generated skill count across `.claude/skills/` and `.omc/skills/` (ignores third-party skills)
3. **CLAUDE.md SOT Block** — verifies `<!-- SOT:START -->` reference block is present
4. **Registry Version** — checks `.omc/skills/sot-registry.json` matches CLI version
5. **MCP Registration** — checks `sot` MCP server is registered in `~/.claude.json`

```bash
sot doctor              # text output with colored icons
sot doctor --json       # machine-readable JSON
```

### sot serve

Start an MCP server (stdio transport) exposing skill metadata and project memory queries. Complements OMC's built-in tools when both are available.

```bash
sot serve               # start MCP server for current directory
sot serve --project-root /path/to/project
```

### sot list

List available skills and detected installed tools.

```bash
sot list
sot list --json
```

### sot install-deps

Check and install runtime dependencies declared in `workflow.yaml` files.

```bash
sot install-deps              # check only
sot install-deps --force      # install missing deps
sot install-deps --json
```

### sot config

View or modify global configuration.

```bash
sot config                    # show all settings
sot config --get defaultTools
sot config --set defaultTools=claude-code,cursor
sot config --set backupEnabled=true
```

Valid config keys: `defaultTools`, `deliveryMode`, `backupEnabled`.

### Global Options

All commands support `--json` for machine-readable output and `--debug` for verbose logging.

## Supported Tools

Five adapters are included:

| Adapter | ID | Writes to |
|---------|----|-----------|
| Claude Code | `claude-code` | `.claude/commands/`, `CLAUDE.md` (also detects oh-my-claudecode) |
| Cursor | `cursor` | `.cursor/rules/`, `AGENTS.md` |
| Codex | `codex` | Codex home skills directory |
| Gemini CLI | `gemini` | `GEMINI.md`, `gemini-extension.json` |
| OMC | `omc` | `.omc/skills/` (auto-detected, enables OMC skill discovery) |

## Project Memory (.superpowers-memory/)

When `sot init --with-memory` is used, the project receives a `.superpowers-memory/` directory that gives AI agents a lightweight cross-session memory:

- `PROJECT_CONTEXT.md` -- stable project facts and architecture
- `CURRENT_STATE.md` -- latest working context and next steps
- `DECISIONS.md` -- cross-session design and process decisions
- `KNOWN_FAILURES.md` -- recurring failure patterns and pitfalls
- `VERIFICATION_BASELINE.md` -- trusted verification methods
- `TEAM_PREFERENCES.md` -- durable collaboration preferences
- `USER_PROFILE.md` -- user communication and output preferences
- `AGENT_NOTES.md` -- execution reminders and quality notes
- `LEARNING_BACKLOG.md` -- reusable lessons pending promotion
- `SESSION_CLOSE_CHECKLIST.md` -- session-close reminder
- `memory-index.yaml` -- health metadata and freshness tracking
- `session-journal/` -- one short note per meaningful session

Memory is opt-in. It only activates when `.superpowers-memory/` exists and a Superpowers workflow reads it.

## Recommended Workflows

| Workflow | Purpose |
|----------|---------|
| `openspec-superpowers` | End-to-end: clarification through verification |
| `superpowers-openspec-execution` | Four-step: explore, lock spec, implement, archive |
| `superpowers-feature` | Design, plan, TDD, verify -- no OpenSpec artifacts |
| `superpowers-learning` | Reflective capture of lessons and project memory |
| `openspec-feature` | OpenSpec proposal, design, specs, tasks only |

For long-running projects, a good pattern is: deliver with a feature workflow, then close with `superpowers-learning` to preserve durable lessons.

## Repository Layout

```text
skills/        source workflow definitions (maintainer-facing)
dist/          tool-adapted bundles (generated by sot build)
src/           CLI source code (TypeScript)
templates/     memory template scaffold
bin/           CLI entry point
test/          test suite (vitest)
```

`skills/` contains the source definitions. `dist/` is deterministically generated from `skills/` via `sot build` -- do not edit `dist/` directly.

## Explicit Activation

These workflows should only activate when:

- the user explicitly names the workflow
- the user explicitly asks for the workflow style
- the repository policy explicitly requires the workflow

They should not be treated as default background behavior. Install the bundle, keep normal prompts unchanged, and explicitly invoke the workflow only when you want it.

## Development & Contributing

```bash
# Build CLI
npm run build

# Type check
npx tsc --noEmit

# Run tests
npm test

# Watch tests
npm run test:watch
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Documentation Index

- [Chinese README](README.cn.md)
- [Source workflow overview](skills/README.md)
- [Source workflow installation notes](skills/INSTALL.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Code of conduct](CODE_OF_CONDUCT.md)
