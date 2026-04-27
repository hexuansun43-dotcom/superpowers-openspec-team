# Changelog

All notable changes to `superpowers-openspec-team-skills` should be documented in this file.

## [2.5.0] - 2026-04-27

### Added

- OMC integration: auto-detect oh-my-claudecode and install skills to .omc/skills/
- `sot doctor` command — health check for OMC installation, skill sync, CLAUDE.md SOT block, registry version, MCP registration
- CLAUDE.md SOT block injector (`injectSotBlock` / `removeSotBlock`) with OMC:END-aware insertion
- MCP server enhanced with OMC complement hints when oh-my-claudecode is detected
- Degradation gate in `sot build`: OMC adapter skipped when OMC not installed
- OMC auto-detection in `sot init`: adds omc tool when OMC is available

## [2.4.0] - 2026-04-27

### Added

- agentskills compatibility layer: `sot build --format agentskills` generates cross-platform manifests
- `AgentskillsManifest` type and `mapToAgentskills()` mapping function
- `--format` option on `sot build` (bundle | agentskills | all)

## [2.3.0] - 2026-04-27

### Added

- `sot serve` MCP server command (stdio mode)
- 6 MCP tools: sot_list_skills, sot_skill_detail, sot_skill_phases, sot_check_dependencies, sot_query_memory, sot_workflow_status
- `@modelcontextprotocol/sdk` dependency

## [2.1.0] - 2026-04-27

### Added

- Progressive skill loading: model_hint, tags, and category fields in SKILL.md frontmatter and workflow.yaml
- SkillIndexEntry type for adapter-specific skill-index.json generation
- skill-index.json now includes model_hint, tags, and category per skill
- Expanded category enum: added orchestration and learning categories

## [2.0.10] - 2026-04-27

### Fixed

- Set executable bit on bin/sot.js so npm correctly links the `sot` command

## [2.0.9] - 2026-04-27

### Fixed

- Sync VERSION constant with package.json (was stuck at 2.0.0)
- Remove stale powershell-smoke and shell-smoke CI jobs that referenced deleted scripts/ directory

## [2.0.0] - 2026-04-27

### Added

- CLI tool `sot` with 7 commands (init, update, build, validate, list, install-deps, config)
- Adapter system for Claude Code, Cursor, Codex, Gemini CLI, OMC
- Secure file installer with path validation and checksums
- Skill parser with YAML frontmatter and workflow.yaml support
- Global configuration system
- Repo-persisted Superpowers memory scaffold under `.superpowers-memory/`
- Expanded memory surfaces: `DECISIONS.md`, `KNOWN_FAILURES.md`, `VERIFICATION_BASELINE.md`, `TEAM_PREFERENCES.md`, `USER_PROFILE.md`, `AGENT_NOTES.md`, `LEARNING_BACKLOG.md`, `SESSION_CLOSE_CHECKLIST.md`, `memory-index.yaml`
- Memory validation, search, update suggestion, closeout, and promotion draft scripts
- Cross-platform testing documentation
- Memory learning and reference documentation
- Open-source governance files: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.github/` templates, CI workflow

### Changed

- Renamed `team-skills/` to `skills/` for CLI compatibility
- Replaced vulnerable `date` command in awk with pure awk date calculation
- Added `read -r` to install scripts for backslash safety
- Pinned GitHub Actions to SHA hashes, added permissions
- Aligned workflow docs, memory docs, and verification docs around the enhanced memory model
- Upgraded validator behavior from basic structure checks to broader governance checks
- Added grouped session-close suggestions and closeout summary output
- Improved shell and PowerShell feature parity for memory search and closeout flows

### Security

- Fixed CRITICAL awk command injection in search/validate scripts
- Fixed HIGH missing path validation in install scripts
- Fixed HIGH insecure CI workflow configuration
