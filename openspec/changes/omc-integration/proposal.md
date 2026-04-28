# Proposal: OMC Integration

## Why

当前 `sot` 工具已有 `ClaudeCodeAdapter` 的 `detectionPaths` 包含 `.omc/`，但检测到 OMC 存在后没有产生任何差异化行为。安装路径仍然只写 `.claude/skills/`，完全忽略了 OMC 的 `.omc/skills/` 目录、wiki、notepad、project-memory、state 管理和 agent delegation 体系。

用户安装了 OMC 后，sot 生成的 skill 无法被 OMC 的 `list_omc_skills` 发现，也无法利用 OMC 的持久化能力（wiki 追溯、notepad 跨 session、shared memory 跨 agent）。

## What

1. **OMC Adapter** — 新增 `OmcAdapter`，将 skill 安装到 `.omc/skills/`（OMC 的项目本地 skill 目录），使 OMC 的 `list_omc_skills` 能发现 sot 的 skill
2. **`sot init` OMC 检测** — init 命令检测到 `.omc/` 或全局 OMC 安装时，自动选择 OMC 适配器，同时保留 `.claude/skills/` 的安装（双写）
3. **CLAUDE.md 增强注入** — OMC 存在时，在 CLAUDE.md 的 `<!-- OMC:START -->` 块之后追加 sot skill 引用片段，让 OMC 编排器感知可用 skill
4. **MCP 工具桥接** — `sot serve` 的 MCP server 在 OMC 环境下暴露 `sot_query_memory` / `sot_workflow_status` 等工具，补充 OMC 原生不具备的工作流状态查询能力
5. **`sot doctor` 子命令** — 检查 OMC 安装状态、skill 可发现性、MCP 注册是否一致，输出诊断报告

## Scope

- 仅涉及 `sot` CLI 端的集成，不修改 OMC 源码
- 不引入新的 npm 运行时依赖（OMC 检测靠文件系统探针）
- 向后兼容：未安装 OMC 的用户行为不变
