# Changelog

All notable changes to `superpowers-openspec-team-skills` should be documented in this file.

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
