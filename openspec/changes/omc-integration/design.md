# Design: OMC Integration

## 架构概述

在现有适配器体系（ClaudeCode / Cursor / Codex / Gemini）之上新增 `OmcAdapter`，不替代任何现有适配器。OMC 被视为 **编排层**而非编码工具——它运行在 Claude Code 之上，提供 skill 发现、持久化状态、wiki 和 agent delegation。

集成遵循"检测即增强"原则：发现 OMC → 追加能力，不影响原有路径。

## 组件设计

### 1. OmcAdapter（`src/core/adapters/omc.ts`）

**职责**：将 skill 安装到 `.omc/skills/` 目录，使 OMC 原生 skill 加载器能发现。

```
.omc/skills/
  superpowers-feature-workflow/SKILL.md
  openspec-feature-workflow/SKILL.md
  ...
```

**关键属性**：
- `id = 'omc'`
- `name = 'OMC (oh-my-claudecode)'`
- `skillsDir = '.omc/skills'`
- `detectionPaths = ['.omc/', '.omc/state/', '.omc/notepad.md']`

**generateSkill**：写入 `.omc/skills/{skill-name}/SKILL.md`，frontmatter 保留 `name`、`description`、`model_hint`、`tags`、`category`（OMC skill 加载器读取这些字段）。

**generateCommands**：空实现——OMC 不使用 `.claude/commands` 式的 slash command 文件，skill 本身即 command。

**generateConfig**：生成 `.omc/skills/sot-registry.json`——一个 skill 清单文件，供 `sot doctor` 和 MCP 工具快速索引。

### 2. OMC 检测器（`src/core/omc-detector.ts`）

**职责**：纯函数，检测当前项目和全局环境是否安装了 OMC。

**检测策略**（按优先级）：
1. 项目根目录存在 `.omc/` 目录
2. `~/.claude.json` 包含 MCP server `t`（OMC 的 MCP server 名称）
3. `~/.omc/mcp-registry.json` 存在且非空
4. `~/.claude/.omc-config.json` 存在
5. npm global 有 `oh-my-claude-sisyphus` 包（最后兜底）

```typescript
export interface OmcDetectionResult {
  available: boolean;
  projectLocal: boolean;     // .omc/ in project
  globalInstall: boolean;    // ~/.claude.json has 't' MCP server
  mcpServerName: string;     // 't' (OMC's fixed MCP server name)
  version?: string;          // from ~/.claude/.omc-config.json or plugin
  detectionMethod: string;   // which check succeeded
}
```

### 3. `sot init` 双写增强

**行为变更**：当 OmcDetector 检测到 OMC 时：
- 在已有适配器（如 ClaudeCode）的文件之外，**额外**安装一份到 `.omc/skills/`
- 控制台提示：`OMC detected — skills also installed to .omc/skills/ for OMC discovery`
- `--tool omc` 可显式指定只装 OMC 适配器

**不变**：不安装 OMC 时，行为完全不变。

### 4. CLAUDE.md Skill 引用注入

**行为**：OMC 存在时，在 CLAUDE.md 的 `<!-- OMC:START -->` 块之后、`<!-- OMC:END -->` 之前，插入 sot skill 引用块：

```markdown
<!-- SOT:START -->
## Superpowers-OpenSpec Skills

- `superpowers-feature-workflow`: Full-stack feature delivery with proposal → design → specs → tasks
- `openspec-feature-workflow`: Change artifact workflow (proposal, design, specs, tasks)
- `superpowers-openspec-execution-workflow`: Plan execution with checkpoints
- ...

Invoke: `/openspec-feature-workflow` or `/superpowers-feature-workflow`
<!-- SOT:END -->
```

**幂等性**：用 `SOT:START/END` 标记定位，更新时替换整个块。

### 5. `sot doctor` 子命令（`src/commands/doctor.ts`）

**职责**：诊断 OMC 集成健康度。

**检查项**：
1. OMC 安装状态（项目本地 + 全局）
2. `.omc/skills/` 中的 sot skill 数量 vs `skills/` 源数量
3. CLAUDE.md 中 `SOT:START/END` 块是否存在且与当前 skill 集一致
4. MCP server `t` 是否在 `~/.claude.json` 注册
5. `.omc/skills/sot-registry.json` 是否存在且版本匹配

**输出格式**：表格 + 状态图标，支持 `--json`。

### 6. MCP 工具桥接增强

**现有**：`sot serve` 已有 6 个 MCP 工具。

**增强**：当 `sot serve` 检测到 OMC MCP server `t` 已注册时，在工具描述中标注与 OMC 工具的关系：

- `sot_query_memory` — "Complements OMC's `project_memory_read` by reading `.superpowers-memory/` format"
- `sot_workflow_status` — "Complements OMC's `state_read` by providing workflow-specific status"
- `sot_list_skills` — "Complements OMC's `list_omc_skills` with sot-specific metadata (phases, model_hint)"

不做运行时耦合——只是文档级提示，让 Agent 知道何时用哪个。

## 文件结构

```
src/
  core/
    adapters/
      omc.ts                  # NEW: OmcAdapter
    omc-detector.ts           # NEW: OMC detection logic
    config.ts                 # MODIFY: add OMC to TOOL_REGISTRY
  commands/
    doctor.ts                 # NEW: sot doctor command
  cli/
    index.ts                  # MODIFY: register doctor command
test/
  core/
    adapters/
      omc.test.ts             # NEW: OmcAdapter tests
    omc-detector.test.ts      # NEW: detector tests
  commands/
    doctor.test.ts            # NEW: doctor command tests
```

## 边界

- **不修改 OMC 源码**——所有集成在 sot 侧完成
- **不引入运行时依赖**——OMC 检测靠 fs.existsSync + JSON.parse
- **可选增强**——OMC 不存在时所有新代码路径不执行
- **MCP 不自动注册**——sot serve 的 MCP server 需要用户手动注册到 OMC（`omc mcp add`），不做静默注册

## 风险

1. `.omc/skills/` 目录冲突——如果用户也在该目录放了自定义 skill，文件名冲突会覆盖。缓解：sot 用子目录 `.omc/skills/{skill-name}/SKILL.md`，OMC loader 也用子目录结构，只要 skill name 不重复就不会冲突。
2. CLAUDE.md 注入位置——`OMC:START/END` 块内容可能在 OMC 更新时被覆盖。缓解：sot 的 `SOT:START/END` 块放在 OMC 块之外或之内明确标记，OMC 更新时保留非 OMC 内容。
