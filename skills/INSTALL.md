# Source Workflow Installation Notes

`skills/` contains the source workflow definitions maintained by this repository.

These folders are not the primary end-user installation target. Use the `sot` CLI instead.

## When To Use `skills/` Directly

Use `skills/` directly only when you are:

- maintaining the source workflows
- adapting the workflows to a new tool (by writing a new adapter in `src/core/adapters/`)
- reading the original workflow definitions

## End User Installation

The recommended way to install workflows into a project is via the CLI:

```bash
# Auto-detect tools and install all skills
sot init /path/to/project

# Target a specific tool
sot init /path/to/project --tool claude-code

# Include project memory template
sot init /path/to/project --with-memory
```

After initialization, invoke a workflow explicitly in your AI tool:

```text
Use the openspec-superpowers workflow for this feature.
```

### Legacy Script Installers

If you cannot use the CLI, legacy install scripts remain available:

- Codex: `sot init` or `sot init`
- Cursor: `sot init` or `sot init`
- Claude Code: `scripts/install-claude-code.ps1` or `scripts/install-claude-code.sh`

Optional memory scaffold:

- `scripts/install-superpowers-memory.ps1 -ProjectRoot <project-root>`

## Why Not Copy Source Workflows Directly

Some source workflows are orchestrators that depend on other workflows or external skills.

That modular design is useful for maintainers, but it can confuse users who expect a single copied folder to be immediately usable.

The CLI and `dist/` bundles are the supported installation paths for real usage.
