# Superpowers-OpenSpec Team Skills CLI 改造设计

**日期**：2026-04-27
**版本**：1.0
**状态**：待审批

---

## 1. 背景与目标

当前项目是一套面向 AI 编程助手的工作流技能库，通过手写 bundle + Shell/PowerShell 安装脚本分发给 Claude Code、Cursor、Codex 三种工具。存在以下核心问题：

1. **无 CLI**：所有操作依赖手写脚本，agent 无法通过命令调用完成配置
2. **安全漏洞**：awk 命令注入（CRITICAL）、rm -rf 路径未验证（HIGH）、CI 配置不安全（HIGH）
3. **dist/ 与源码不一致**：手写 bundle 可能偏离源码定义，无确定性构建
4. **无完整性校验**：安装时不验证文件完整性
5. **平台覆盖不足**：不支持 Gemini CLI

### 改造目标

将项目改造为**独立 CLI 工具**（`sot`），基于 TypeScript + npm，参照 OpenSpec 的适配器架构，保留当前 5 个 workflow 核心逻辑并重构，支持 4 个 AI 开发工具，可选兼容 OMC。

### 关键决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 定位 | 独立 CLI 工具 | 用户明确选择，不依赖 OMC 运行 |
| Skill 来源 | 保留并重构当前 5 个 workflow | 保留已有资产，升级格式 |
| 技术栈 | TypeScript + npm | 类型安全、生态成熟、OpenSpec 验证可行 |
| 工具适配 | Claude Code / Cursor / Codex / Gemini CLI | 覆盖主流 AI 开发工具 |
| OMC 兼容 | 可选兼容 | 生成 OMC 格式 skill，但核心不依赖 OMC |

---

## 2. CLI 命令体系

命令前缀：`sot`（superpowers-openspec-team-skills 缩写）。

### 命令列表

| 命令 | 功能 | Agent 可调用 |
|------|------|:---:|
| `sot init [path]` | 交互式初始化，检测工具、生成 skills/commands/配置 | 是 |
| `sot update [path]` | 刷新已安装文件，保持与源定义同步 | 是 |
| `sot build` | 从 skills/ 确定性构建 dist/ | 是 |
| `sot validate [path]` | 校验安装完整性 + 安全检查 | 是 |
| `sot list` | 列出可用 skills、已安装工具、依赖状态 | 是 |
| `sot install-deps` | 安装运行时依赖（如 openspec-cli） | 是 |
| `sot config` | 查看/修改全局配置 | 是 |

### 通用参数

- `--json`：结构化输出，方便 agent 解析
- `--tool <name>`：跳过交互选择，直接指定工具（逗号分隔多个）
- `--dry-run`：预览变更不执行
- `--force`：跳过确认提示
- `--backup`：覆盖前备份
- 退出码：0 成功、1 一般错误、2 参数错误

---

## 3. 项目结构

```
superpowers-openspec-team-skills/
├── src/
│   ├── cli/                    # Commander.js 命令注册
│   │   └── index.ts
│   ├── commands/               # 各子命令实现
│   │   ├── init.ts
│   │   ├── update.ts
│   │   ├── build.ts
│   │   ├── validate.ts
│   │   ├── list.ts
│   │   ├── install-deps.ts
│   │   └── config.ts
│   ├── core/
│   │   ├── adapters/           # 工具适配器
│   │   │   ├── base.ts        # ToolAdapter 接口
│   │   │   ├── claude-code.ts
│   │   │   ├── cursor.ts
│   │   │   ├── codex.ts
│   │   │   ├── gemini.ts
│   │   │   └── omc.ts         # OMC 兼容适配器
│   │   ├── schema/            # workflow schema 解析与 DAG
│   │   │   ├── parser.ts
│   │   │   ├── resolver.ts
│   │   │   └── types.ts
│   │   ├── generator/          # 从 schema + skill 生成各平台文件
│   │   │   ├── skill-generator.ts
│   │   │   ├── command-generator.ts
│   │   │   └── config-generator.ts
│   │   ├── installer/          # 安装逻辑
│   │   │   ├── installer.ts
│   │   │   └── path-validator.ts
│   │   └── config.ts           # 工具注册表 + 全局配置
│   └── utils/                  # 校验、日志、路径工具
│       ├── checksum.ts
│       ├── logger.ts
│       └── path.ts
├── skills/                     # skill 源定义
│   ├── openspec-superpowers-workflow/
│   │   ├── SKILL.md
│   │   └── workflow.yaml
│   ├── superpowers-feature-workflow/
│   │   ├── SKILL.md
│   │   └── workflow.yaml
│   ├── superpowers-openspec-execution-workflow/
│   │   ├── SKILL.md
│   │   └── workflow.yaml
│   ├── superpowers-learning-workflow/
│   │   ├── SKILL.md
│   │   └── workflow.yaml
│   └── openspec-feature-workflow/
│       ├── SKILL.md
│       └── workflow.yaml
├── schemas/                    # workflow schema 模板
│   └── default/
│       ├── schema.yaml
│       └── templates/
├── templates/                  # .superpowers-memory 模板
│   └── superpowers-memory/
│       ├── PROJECT_CONTEXT.md
│       ├── CURRENT_STATE.md
│       └── ...
├── scripts/                   # 辅助脚本（agent 可调用）
│   ├── search-memory.sh       # 修复后的安全版本
│   ├── validate-memory.sh     # 修复后的安全版本
│   └── generate-promotion-drafts.sh
├── dist/                      # 构建输出（自动生成，git 忽略）
├── bin/
│   └── sot.js                 # CLI 入口
├── test/                      # 测试
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 4. 适配器体系与多平台文件生成

### 适配器接口

```typescript
interface ToolAdapter {
  readonly id: string;                    // 'claude-code' | 'cursor' | 'codex' | 'gemini' | 'omc'
  readonly name: string;
  readonly skillsDir: string;             // 技能文件目录（相对于项目根）
  readonly detectionPaths: string[];      // 检测项目是否使用该工具的路径

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[];
  detect(projectRoot: string): boolean;
}

interface GeneratedFile {
  path: string;           // 相对于项目根的路径
  content: string;        // 文件内容
  overwrite: boolean;     // 是否可覆盖（有 generatedBy 标记的文件可覆盖）
  generatedBy: string;   // 标记来源，格式：'sot@{version}'
}

interface SkillDefinition {
  name: string;
  description: string;
  content: string;         // SKILL.md 完整内容
  metadata: WorkflowMeta;  // workflow.yaml 解析结果
  type: 'orchestrator' | 'workflow';
  standalone: boolean;
  dependencies: string[];
}
```

### 四个适配器的文件映射

| 适配器 | skill 文件 | 命令/规则文件 | 配置/入口文件 |
|--------|-----------|-------------|-------------|
| **Claude Code** | `.claude/skills/{name}/SKILL.md` | `.claude/commands/{name}.md` | `CLAUDE.md`（追加 skill 引导段） |
| **Cursor** | `.cursor/skills/{name}/SKILL.md` | `.cursor/rules/{name}.mdc` | `AGENTS.md`（追加 skill 引导段） |
| **Codex** | `.codex/skills/{name}/SKILL.md` | — | `AGENTS.md`（Codex 项目级） |
| **Gemini** | — | `GEMINI.md`（内嵌 skill 指令） | `gemini-extension.json` |

### 关键规则

- 所有生成的文件在 frontmatter 或头部注释中添加 `generatedBy: sot@{version}` 标记
- `sot update` 只覆盖带此标记的文件，不碰用户手动修改的内容
- 适配器优先从 `skills/` 源定义生成文件，不再手写 dist/ bundle

---

## 5. Skill 重构方案

### SKILL.md 规范升级

当前 SKILL.md 只有 `name` 和 `description` 两个 frontmatter 字段。重构后增加更多元数据：

```yaml
---
name: openspec-superpowers-workflow
description: Use when you need a complete feature delivery flow from clarification through verification with OpenSpec artifacts
argument-hint: "<feature-description>"
type: orchestrator
standalone: false
triggers:
  - user-explicit-skill-name
  - user-explicit-workflow-request
dependencies:
  skills:
    - superpowers-feature-workflow
    - openspec-feature-workflow
  external:
    - openspec-cli
outputs:
  - docs/superpowers/specs/
  - openspec/changes/
  - .superpowers-memory/
---
```

### SKILL.md 正文结构（统一模板）

```markdown
# <标题>

## Overview
简要说明此 skill 做什么、解决什么问题。

## When to Use / When Not to Use
触发条件和反模式。

## Workflow
编号步骤列表，每个步骤说明：
- 输入（依赖什么）
- 动作（做什么）
- 输出（产生什么）
- 门控（下一步的前置条件）

## Guardrails
安全约束和红线。

## Outputs
交付物清单及路径。
```

### 5 个 workflow 的重构要点

| Workflow | 重构内容 |
|----------|---------|
| `openspec-superpowers` | 保持编排器角色，精简为组合调用子 workflow 的入口，不再内嵌步骤细节 |
| `superpowers-feature` | 增加门控设计（HARD-GATE：未获批准前不写代码），增加 TDD 步骤的红线说明 |
| `superpowers-openspec-execution` | 明确四阶段转换的输入/输出边界，增加回退条件 |
| `superpowers-learning` | 增加格式校验约束（日期字段必须 YYYY-MM-DD），堵住 awk 注入链 |
| `openspec-feature` | 增加 OpenSpec 产物的校验步骤，确保 schema 一致性 |

### workflow.yaml 升级

```yaml
name: openspec-superpowers-workflow
type: orchestrator
standalone: false
description: Full feature delivery flow...
version: 2.0.0           # 新增：schema 版本

tool_support:
  - claude-code
  - cursor
  - codex
  - gemini                # 新增

activation:
  mode: explicit-only
  triggers:
    - user-explicit-skill-name
    - user-explicit-workflow-request
    - repo-policy-explicit-requirement

dependencies:
  skills:
    - superpowers-feature-workflow
    - openspec-feature-workflow
  external:
    - name: openspec-cli
      version: ">=1.0.0"  # 新增：版本约束
      optional: false
      check_command: "openspec --version"

outputs:
  - path: docs/superpowers/specs/
    type: directory
  - path: openspec/changes/<change-name>/
    type: directory
  - path: .superpowers-memory/
    type: directory

security:                  # 新增：安全元数据
  writable_paths:         # 允许写入的路径（白名单）
    - docs/superpowers/
    - openspec/changes/
    - .superpowers-memory/
  requires_validation: true
```

---

## 6. 构建管线与确定性构建

### 核心原则

`dist/` 不再手写，由 `sot build` 从源码确定性生成。

### 构建流程

```
skills/*.yaml + skills/*/SKILL.md
        ↓  (schema parser)
   SkillDefinition[]
        ↓  (generator per adapter)
   GeneratedFile[]
        ↓  (writer)
   dist/
     ├── claude-code/bundles/openspec-superpowers/...
     ├── cursor/bundles/...
     ├── codex/bundles/...
     ├── gemini/bundles/...
     └── checksums.json
```

### manifest.json 升级

```json
{
  "tool": "claude-code",
  "version": "2.0.0",
  "generatedBy": "sot@2.0.0",
  "generatedAt": "2026-04-27T10:00:00Z",
  "installTarget": "project-root",
  "contents": [".claude/commands/openspec-superpowers-workflow.md", "CLAUDE.md"],
  "runtimeRequirements": [
    {"name": "openspec-cli", "version": ">=1.0.0", "optional": false}
  ],
  "checksums": {
    ".claude/commands/openspec-superpowers-workflow.md": "sha256:abc123..."
  }
}
```

### 构建脚本

```json
{
  "scripts": {
    "build": "tsc && node dist/cli/index.js build",
    "build:check": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/"
  }
}
```

### CI 中的构建校验

在 CI 中添加步骤：`sot build` 后检查 `dist/` 与提交的 `dist/` 是否一致，防止源码与分发物漂移。

---

## 7. 安装流程与 Agent 可调用脚本

### `sot init` 核心流程

1. 检测目标项目路径
2. 扫描已安装的 AI 工具（通过 detectionPaths）
3. 交互选择 / `--tool` 参数指定
4. 选择要安装的 skills（默认全部，可选子集）
5. 检查运行时依赖（openspec-cli 等）
6. 对每个选中的工具：
   - 调用对应适配器生成文件
   - 安全路径验证
   - 预览变更（`--dry-run` 支持）
   - 备份已有文件（`--backup` 支持）
   - 写入文件（带 generatedBy 标记）
   - 可选：安装 `.superpowers-memory/` 模板（`--with-memory` 参数）
7. 输出安装摘要

### `sot install-deps` 流程

1. 读取已安装 skills 的 workflow.yaml
2. 收集所有 external 依赖
3. 检测哪些已安装、哪些缺失
4. 交互确认 / `--force` 自动安装
5. 调用对应的安装命令：
   - openspec-cli → `npm install -g @fission-ai/openspec`
6. 输出安装结果（支持 `--json`）

### Agent 可调用的命令示例

```bash
# agent 检测到需要初始化
sot init /path/to/project --tool claude-code --force

# agent 检测到缺少运行时依赖
sot install-deps --json

# agent 验证安装完整性
sot validate /path/to/project --json

# agent 搜索记忆
sot search-memory --query "auth" --project-root /path/to/project
```

---

## 8. 安全修复方案

### CRITICAL — awk 命令注入

**位置**：`scripts/search-superpowers-memory.sh:198`、`scripts/validate-superpowers-memory.sh:143,303`

**修复**：替换 awk 中的 `date` 命令调用为纯 awk 日期计算：

```awk
# 修复前（危险）：
cmd = "date -d \"" d "\" +%s 2>/dev/null"
cmd | getline epoch

# 修复后（安全）：
function to_epoch(d,    parts, y, m, day) {
  if (d !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) return -1
  split(d, parts, "-")
  y = parts[1] + 0; m = parts[2] + 0; day = parts[3] + 0
  if (y < 1970 || m < 1 || m > 12 || day < 1 || day > 31) return -1
  return (y - 1970) * 365 + int((y - 1969) / 4) + (m - 1) * 30 + day
}
```

### HIGH — rm -rf 路径验证

**位置**：4 个 Shell 安装脚本

**修复**：在 `src/core/installer/path-validator.ts` 中集中实现路径验证逻辑：

```typescript
function validateTargetPath(targetPath: string, projectRoot: string): { valid: boolean; reason?: string } {
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(projectRoot);

  if (!resolved || resolved === '/') return { valid: false, reason: 'Path is empty or root' };
  if (!resolved.startsWith(resolvedRoot + path.sep)) {
    return { valid: false, reason: 'Target path is outside project root' };
  }
  if (resolved.includes('..')) return { valid: false, reason: 'Path traversal detected' };
  const forbidden = ['/usr', '/etc', '/System', process.env.HOME || ''];
  if (forbidden.some(p => resolved === p)) return { valid: false, reason: 'Refusing to modify system directory' };

  return { valid: true };
}
```

### HIGH — CI 工作流

**修复**：添加 `permissions: contents: read`，将 Action 固定到完整 SHA 哈希。

### MEDIUM — dist/ 完整性校验

**修复**：`sot build` 生成 `dist/checksums.json`，`sot validate` 安装时校验。

### MEDIUM — read 缺少 -r

**修复**：所有 Shell 脚本中的 `read ANSWER` 改为 `read -r ANSWER`。

---

## 9. OMC 兼容层

### OMC 适配器

```typescript
class OmcAdapter implements ToolAdapter {
  readonly id = 'omc';
  readonly name = 'oh-my-claudecode';
  readonly skillsDir = '.claude/skills';
  readonly detectionPaths = ['.omc/', '.claude/plugins/oh-my-claudecode/'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    return [{
      path: `.claude/skills/${skill.name}/SKILL.md`,
      content: skill.content,
      overwrite: true,
      generatedBy: `sot@${VERSION}`
    }];
  }

  // OMC 不需要 commands 和特殊配置
  generateCommands() { return []; }
  generateConfig() { return []; }
}
```

### 使用方式

```bash
sot init /path/to/project --tool omc
# 或同时安装到多个工具
sot init /path/to/project --tool claude-code,omc
```

---

## 10. 记忆系统增强

`.superpowers-memory/` 机制保持不变，增强以下方面：

1. **格式校验**：`sot validate` 检查记忆文件中日期字段的格式，拒绝非 YYYY-MM-DD 格式的值
2. **模板更新**：`templates/superpowers-memory/` 中所有模板的占位符增加格式约束说明
3. **搜索脚本升级**：`search-superpowers-memory.sh` 纳入 CLI 作为 `sot search-memory` 子命令，或保留为独立脚本但使用安全的日期解析
4. **安装集成**：`sot init` 通过 `--with-memory` 参数可选安装 `.superpowers-memory/` 骨架

---

## 11. 迁移策略

### 分阶段实施

| 阶段 | 内容 | 类型 |
|------|------|------|
| Phase 1 | 搭建 TypeScript 项目骨架 + CLI 入口 + 构建管线 | 新建 |
| Phase 2 | 实现 4 个适配器 + 生成器 + 安装器 | 新建 |
| Phase 3 | 重构 5 个 SKILL.md + workflow.yaml | 重构现有 |
| Phase 4 | 修复安全问题（awk 注入 + rm -rf + CI） | 修复现有 |
| Phase 5 | 实现记忆系统增强（格式校验 + CLI 集成） | 增强现有 |
| Phase 6 | 实现 OMC 兼容适配器 | 新建 |
| Phase 7 | 端到端测试 + 文档更新 + npm 发布 | 新建 |

### 向后兼容

- 保留 `scripts/install-*.sh` 和 `scripts/install-*.ps1` 作为过渡期备选安装方式，标记为 deprecated，内部改为调用 `sot init`
- `dist/` 手写 bundle 在 Phase 3 完成后标记为 deprecated，Phase 5 后移除
- `team-skills/` 目录已重命名为 `skills/`，保持源码可读

---

## 12. npm 包配置

```json
{
  "name": "@superpowers-openspec/cli",
  "version": "2.0.0",
  "description": "AI coding agent workflow skills with CLI-driven multi-tool adaptation",
  "bin": { "sot": "./bin/sot.js" },
  "files": ["dist/", "bin/", "skills/", "schemas/", "templates/", "scripts/"],
  "engines": { "node": ">=18.0.0" },
  "type": "module",
  "main": "./dist/cli/index.js",
  "dependencies": {
    "commander": "^12.0.0",
    "yaml": "^2.4.0",
    "zod": "^3.22.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "inquirer": "^9.2.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0"
  }
}
```

---

## 附录 A：与参考项目的架构对比

| 维度 | 当前项目 | OMC | OpenSpec | Superpowers | 改造后 |
|------|---------|-----|----------|-------------|--------|
| 分发方式 | 手写 bundle | npm + 插件 | npm CLI | 插件市场 | npm CLI |
| 多工具适配 | 手写 3 套 bundle | 不适配（仅 CC） | 28+ 适配器 | 7 个插件清单 | 4+ 适配器 |
| 构建管线 | 无 | tsc + bridge | tsc | 无 | tsc + sot build |
| 安全机制 | 无 | Agent 路径校验 | Schema 校验 | 无 | 路径验证 + 格式校验 + checksum |
| Agent 集成 | 无 | 19 agents | 无 | 1 agent | 无（保留 skill-only） |
| 状态管理 | .superpowers-memory | .omc/state | openspec/ | 无 | .superpowers-memory |