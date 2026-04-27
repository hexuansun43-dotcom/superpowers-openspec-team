# CLI 改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前项目改造为独立 CLI 工具 `sot`，基于 TypeScript + npm，支持 4 个 AI 开发工具的适配器架构。

**Architecture:** 采用 OpenSpec 式适配器模式，`skills/` 目录存放源定义，CLI 从源确定性生成 `dist/` 分发物。适配器负责各工具的文件格式转换，安装器负责安全路径验证和文件写入。

**Tech Stack:** TypeScript 5.4+, Node 18+, Commander.js, Zod, yaml, Vitest, ESLint

---

## 文件结构规划

### 新建文件

| 文件路径 | 职责 |
|---------|------|
| `package.json` | npm 包配置 |
| `tsconfig.json` | TypeScript 配置 |
| `vitest.config.ts` | 测试配置 |
| `bin/sot.js` | CLI 入口（无包换行） |
| `src/cli/index.ts` | Commander 命令注册 |
| `src/core/adapters/base.ts` | ToolAdapter 接口定义 |
| `src/core/adapters/claude-code.ts` | Claude Code 适配器 |
| `src/core/adapters/cursor.ts` | Cursor 适配器 |
| `src/core/adapters/codex.ts` | Codex 适配器 |
| `src/core/adapters/gemini.ts` | Gemini CLI 适配器 |
| `src/core/adapters/omc.ts` | OMC 兼容适配器 |
| `src/core/schema/types.ts` | SkillDefinition / WorkflowMeta 类型 |
| `src/core/schema/parser.ts` | SKILL.md + workflow.yaml 解析 |
| `src/core/generator/skill-generator.ts` | 从 SkillDefinition 生成各平台 skill 文件 |
| `src/core/generator/command-generator.ts` | 生成 commands/rules 文件 |
| `src/core/generator/config-generator.ts` | 生成 CLAUDE.md / AGENTS.md |
| `src/core/installer/path-validator.ts` | 安全路径验证 |
| `src/core/installer/installer.ts` | 文件写入、备份、checksum |
| `src/core/config.ts` | 工具注册表、全局配置 |
| `src/commands/init.ts` | `sot init` 实现 |
| `src/commands/update.ts` | `sot update` 实现 |
| `src/commands/build.ts` | `sot build` 实现 |
| `src/commands/validate.ts` | `sot validate` 实现 |
| `src/commands/list.ts` | `sot list` 实现 |
| `src/commands/install-deps.ts` | `sot install-deps` 实现 |
| `src/commands/config.ts` | `sot config` 实现 |
| `src/utils/logger.ts` | 日志输出 |
| `src/utils/checksum.ts` | SHA-256 计算 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `.github/workflows/ci.yml` | 添加 permissions、固定 Action SHA、添加构建校验 |
| `scripts/search-superpowers-memory.sh` | 修复 awk 命令注入 |
| `scripts/validate-superpowers-memory.sh` | 修复 awk 命令注入 |
| `scripts/install-codex.sh` | 添加路径验证、修复 read -r |
| `scripts/install-claude-code.sh` | 添加路径验证、修复 read -r |
| `scripts/install-cursor.sh` | 添加路径验证、修复 read -r |
| `templates/superpowers-memory/*.md` | 增加日期格式约束说明 |

### 重命名

| 原路径 | 新路径 |
|-------|-------|
| `skills/` (was `team-skills/`) | `skills/` |

---

## Phase 1: 项目骨架与 CLI 入口

### Task 1.1: 初始化 npm 包与 TypeScript 配置

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`（更新）
- Test: 无（配置文件）

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@superpowers-openspec/cli",
  "version": "2.0.0",
  "description": "AI coding agent workflow skills with CLI-driven multi-tool adaptation",
  "type": "module",
  "bin": {
    "sot": "./bin/sot.js"
  },
  "main": "./dist/cli/index.js",
  "types": "./dist/cli/index.d.ts",
  "files": [
    "dist/",
    "bin/",
    "skills/",
    "schemas/",
    "templates/",
    "scripts/"
  ],
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "build:check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build && npm run test"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "ai",
    "claude-code",
    "cursor",
    "codex",
    "gemini",
    "workflow",
    "skills"
  ],
  "author": "",
  "license": "MIT",
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
    "@types/inquirer": "^9.0.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^7.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: 创建 vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**/*.ts']
    }
  }
});
```

- [ ] **Step 4: 更新 .gitignore**

在现有 `.gitignore` 末尾追加：

```
# Build outputs
dist/
*.tsbuildinfo

# Dependencies
node_modules/

# Test coverage
coverage/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 5: 安装依赖并验证构建**

```bash
cd D:/Code/superpowers-openspec-team-skills
npm install
npm run build:check
```

Expected: 无错误输出（没有源文件时会警告无入口，可忽略）

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore package-lock.json
git commit -m "feat: init npm package and tsconfig

- add @superpowers-openspec/cli package
- configure TypeScript with NodeNext module
- configure Vitest for unit testing"
```

---

### Task 1.2: CLI 入口与命令注册

**Files:**
- Create: `bin/sot.js`
- Create: `src/cli/index.ts`
- Create: `src/utils/logger.ts`
- Test: `test/cli/index.test.ts`

- [ ] **Step 1: 创建 bin/sot.js**

```javascript
#!/usr/bin/env node
import('../dist/cli/index.js').catch((err) => {
  console.error('Failed to start sot CLI:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: 创建 src/utils/logger.ts**

```typescript
import chalk from 'chalk';

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export const logger: Logger = {
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✓'), message),
  warn: (message) => console.log(chalk.yellow('⚠'), message),
  error: (message) => console.error(chalk.red('✗'), message),
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  },
};

export function formatJsonOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
```

- [ ] **Step 3: 创建 src/cli/index.ts**

```typescript
import { Command } from 'commander';
import { initCommand } from '../commands/init.js';
import { updateCommand } from '../commands/update.js';
import { buildCommand } from '../commands/build.js';
import { validateCommand } from '../commands/validate.js';
import { listCommand } from '../commands/list.js';
import { installDepsCommand } from '../commands/install-deps.js';
import { configCommand } from '../commands/config.js';

const VERSION = '2.0.0';

const program = new Command();

program
  .name('sot')
  .description('Superpowers-OpenSpec Team Skills CLI')
  .version(VERSION)
  .option('--json', 'Output in JSON format')
  .option('--debug', 'Enable debug logging');

// Register commands
program.addCommand(initCommand);
program.addCommand(updateCommand);
program.addCommand(buildCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);
program.addCommand(installDepsCommand);
program.addCommand(configCommand);

// Global options handling
program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.debug) {
    process.env.DEBUG = '1';
  }
});

program.parse();
```

- [ ] **Step 4: 创建命令占位文件**

每个文件导出空 Command，后续 Task 填充实现。

`src/commands/init.ts`:
```typescript
import { Command } from 'commander';

export const initCommand = new Command('init')
  .description('Initialize skills in a project')
  .argument('[path]', 'Project path', '.')
  .option('--tool <tools>', 'Target tools (comma-separated)')
  .option('--dry-run', 'Preview changes without writing')
  .option('--force', 'Skip confirmation prompts')
  .option('--backup', 'Backup existing files before overwriting')
  .option('--with-memory', 'Install .superpowers-memory/ template')
  .option('--json', 'Output in JSON format')
  .action(async (path, options) => {
    // Placeholder - will be implemented in Task 2.1
    console.log('init command - to be implemented');
  });
```

`src/commands/update.ts`:
```typescript
import { Command } from 'commander';

export const updateCommand = new Command('update')
  .description('Update installed skills')
  .argument('[path]', 'Project path', '.')
  .option('--dry-run', 'Preview changes without writing')
  .option('--force', 'Skip confirmation prompts')
  .option('--backup', 'Backup existing files before overwriting')
  .option('--json', 'Output in JSON format')
  .action(async (path, options) => {
    console.log('update command - to be implemented');
  });
```

`src/commands/build.ts`:
```typescript
import { Command } from 'commander';

export const buildCommand = new Command('build')
  .description('Build dist/ from skills/')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('build command - to be implemented');
  });
```

`src/commands/validate.ts`:
```typescript
import { Command } from 'commander';

export const validateCommand = new Command('validate')
  .description('Validate installation integrity')
  .argument('[path]', 'Project path', '.')
  .option('--json', 'Output in JSON format')
  .action(async (path, options) => {
    console.log('validate command - to be implemented');
  });
```

`src/commands/list.ts`:
```typescript
import { Command } from 'commander';

export const listCommand = new Command('list')
  .description('List available skills and installed tools')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('list command - to be implemented');
  });
```

`src/commands/install-deps.ts`:
```typescript
import { Command } from 'commander';

export const installDepsCommand = new Command('install-deps')
  .description('Install runtime dependencies')
  .option('--force', 'Skip confirmation prompts')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('install-deps command - to be implemented');
  });
```

`src/commands/config.ts`:
```typescript
import { Command } from 'commander';

export const configCommand = new Command('config')
  .description('View or modify global configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    console.log('config command - to be implemented');
  });
```

- [ ] **Step 5: 编写 CLI 入口测试**

`test/cli/index.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('CLI entry', () => {
  it('should show version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe('2.0.0');
  });

  it('should show help', () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(output).toContain('sot');
    expect(output).toContain('init');
    expect(output).toContain('build');
    expect(output).toContain('validate');
  });

  it('should exit with code 0 for help', () => {
    const result = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 6: 构建并运行测试**

```bash
npm run build
npm test
```

Expected: 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add bin/ src/ test/
git commit -m "feat: add CLI entry and command registration

- add bin/sot.js entry point
- add Commander.js command registration
- add placeholder commands for init/update/build/validate/list/install-deps/config
- add logger utility
- add CLI entry tests"
```

---

## Phase 2: 核心类型与适配器

### Task 2.1: 核心类型定义

**Files:**
- Create: `src/core/schema/types.ts`
- Create: `src/core/config.ts`
- Test: `test/core/schema/types.test.ts`

- [ ] **Step 1: 创建 src/core/schema/types.ts**

```typescript
import { z } from 'zod';

// Frontmatter schema for SKILL.md
export const SkillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  'argument-hint': z.string().optional(),
  type: z.enum(['orchestrator', 'workflow']).optional(),
  standalone: z.boolean().optional(),
  triggers: z.array(z.string()).optional(),
  dependencies: z
    .object({
      skills: z.array(z.string()).optional(),
      external: z.array(z.string()).optional(),
    })
    .optional(),
  outputs: z.array(z.string()).optional(),
});

export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

// Workflow.yaml schema
export const WorkflowMetaSchema = z.object({
  name: z.string(),
  type: z.enum(['orchestrator', 'workflow']),
  standalone: z.boolean(),
  description: z.string(),
  version: z.string().optional(),
  tool_support: z.array(z.string()).optional(),
  activation: z
    .object({
      mode: z.enum(['explicit-only', 'auto']),
      triggers: z.array(z.string()).optional(),
    })
    .optional(),
  dependencies: z
    .object({
      skills: z.array(z.string()).optional(),
      external: z
        .array(
          z.object({
            name: z.string(),
            version: z.string().optional(),
            optional: z.boolean().optional(),
            check_command: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  outputs: z
    .array(
      z.object({
        path: z.string(),
        type: z.enum(['directory', 'file']),
      })
    )
    .optional(),
  security: z
    .object({
      writable_paths: z.array(z.string()).optional(),
      requires_validation: z.boolean().optional(),
    })
    .optional(),
});

export type WorkflowMeta = z.infer<typeof WorkflowMetaSchema>;

// Complete skill definition
export interface SkillDefinition {
  name: string;
  description: string;
  content: string; // Full SKILL.md content
  frontmatter: SkillFrontmatter;
  metadata?: WorkflowMeta;
  type: 'orchestrator' | 'workflow';
  standalone: boolean;
  dependencies: string[];
}

// Generated file representation
export interface GeneratedFile {
  path: string; // Relative to project root
  content: string;
  overwrite: boolean;
  generatedBy: string; // 'sot@{version}'
  checksum?: string; // SHA-256
}

// Tool adapter interface
export interface ToolAdapter {
  readonly id: string;
  readonly name: string;
  readonly skillsDir: string;
  readonly detectionPaths: string[];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[];
  detect(projectRoot: string): boolean;
}

// Installation result
export interface InstallationResult {
  success: boolean;
  filesWritten: string[];
  filesBackedUp: string[];
  errors: string[];
  warnings: string[];
}

// Dependency check result
export interface DependencyStatus {
  name: string;
  installed: boolean;
  version?: string;
  required: string;
}
```

- [ ] **Step 2: 创建 src/core/config.ts**

```typescript
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface GlobalConfig {
  defaultTools: string[];
  deliveryMode: 'explicit-only' | 'auto';
  backupEnabled: boolean;
}

const CONFIG_DIR = path.join(process.env.HOME || '~', '.sot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: GlobalConfig = {
  defaultTools: ['claude-code'],
  deliveryMode: 'explicit-only',
  backupEnabled: true,
};

export function loadConfig(): GlobalConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    logger.warn(`Failed to load config: ${(error as Error).message}`);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: GlobalConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  logger.success(`Config saved to ${CONFIG_FILE}`);
}

// Tool registry
export const TOOL_REGISTRY: Record<string, { name: string; skillsDir: string; detectionPaths: string[] }> = {
  'claude-code': {
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    detectionPaths: ['.claude/', 'CLAUDE.md'],
  },
  cursor: {
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    detectionPaths: ['.cursor/', '.cursorrules'],
  },
  codex: {
    name: 'OpenAI Codex',
    skillsDir: '.codex/skills',
    detectionPaths: ['.codex/', 'AGENTS.md'],
  },
  gemini: {
    name: 'Gemini CLI',
    skillsDir: '',
    detectionPaths: ['GEMINI.md', 'gemini-extension.json'],
  },
  omc: {
    name: 'oh-my-claudecode',
    skillsDir: '.claude/skills',
    detectionPaths: ['.omc/', '.claude/plugins/oh-my-claudecode/'],
  },
};

export const VERSION = '2.0.0';
```

- [ ] **Step 3: 编写类型测试**

`test/core/schema/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SkillFrontmatterSchema, WorkflowMetaSchema } from '../../../src/core/schema/types.js';

describe('SkillFrontmatterSchema', () => {
  it('should parse minimal frontmatter', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'test-skill',
      description: 'A test skill',
    });
    expect(result.name).toBe('test-skill');
    expect(result.description).toBe('A test skill');
  });

  it('should parse full frontmatter', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'full-skill',
      description: 'Full skill',
      'argument-hint': '<arg>',
      type: 'workflow',
      standalone: true,
      triggers: ['user-explicit'],
      dependencies: { skills: ['dep1'], external: ['ext1'] },
      outputs: ['docs/'],
    });
    expect(result.name).toBe('full-skill');
    expect(result.standalone).toBe(true);
  });

  it('should reject empty name', () => {
    expect(() => SkillFrontmatterSchema.parse({ name: '', description: 'x' })).toThrow();
  });
});

describe('WorkflowMetaSchema', () => {
  it('should parse workflow metadata', () => {
    const result = WorkflowMetaSchema.parse({
      name: 'test-workflow',
      type: 'workflow',
      standalone: false,
      description: 'Test',
    });
    expect(result.type).toBe('workflow');
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npm run build
npm test
```

Expected: 4 tests pass (3 from CLI + 4 from types = 7 total)

- [ ] **Step 5: Commit**

```bash
git add src/core/
git commit -m "feat: add core type definitions and config

- add SkillDefinition/WorkflowMeta types with Zod schemas
- add GeneratedFile/ToolAdapter interfaces
- add global config loader and tool registry"
```

---

### Task 2.2: Skill 解析器

**Files:**
- Create: `src/core/schema/parser.ts`
- Test: `test/core/schema/parser.test.ts`

- [ ] **Step 1: 创建 src/core/schema/parser.ts**

```typescript
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { logger } from '../../utils/logger.js';
import {
  SkillDefinition,
  SkillFrontmatterSchema,
  WorkflowMetaSchema,
  SkillFrontmatter,
  WorkflowMeta,
} from './types.js';

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

export function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    throw new Error('No frontmatter found in skill file');
  }

  const frontmatterRaw = yaml.parse(match[1]) as Record<string, unknown>;
  const frontmatter = SkillFrontmatterSchema.parse(frontmatterRaw);
  const body = content.slice(match[0].length);

  return { frontmatter, body };
}

export function parseWorkflowYaml(content: string): WorkflowMeta {
  const parsed = yaml.parse(content) as Record<string, unknown>;
  return WorkflowMetaSchema.parse(parsed);
}

export function parseSkill(skillDir: string): SkillDefinition {
  const skillPath = path.join(skillDir, 'SKILL.md');
  const workflowPath = path.join(skillDir, 'workflow.yaml');

  if (!fs.existsSync(skillPath)) {
    throw new Error(`SKILL.md not found in ${skillDir}`);
  }

  const content = fs.readFileSync(skillPath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  let metadata: WorkflowMeta | undefined;
  if (fs.existsSync(workflowPath)) {
    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');
    metadata = parseWorkflowYaml(workflowContent);
  }

  const type = frontmatter.type || metadata?.type || 'workflow';
  const standalone = frontmatter.standalone ?? metadata?.standalone ?? true;
  const dependencies = frontmatter.dependencies?.skills || metadata?.dependencies?.skills || [];

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    content: body,
    frontmatter,
    metadata,
    type: type as 'orchestrator' | 'workflow',
    standalone,
    dependencies,
  };
}

export function parseAllSkills(skillsDir: string): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  if (!fs.existsSync(skillsDir)) {
    logger.warn(`Skills directory not found: ${skillsDir}`);
    return skills;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillDir = path.join(skillsDir, entry.name);
      try {
        const skill = parseSkill(skillDir);
        skills.push(skill);
        logger.debug(`Parsed skill: ${skill.name}`);
      } catch (error) {
        logger.warn(`Failed to parse skill in ${skillDir}: ${(error as Error).message}`);
      }
    }
  }

  return skills;
}
```

- [ ] **Step 2: 创建测试用 SKILL.md**

`test/fixtures/test-skill/SKILL.md`:
```markdown
---
name: test-skill
description: A skill for testing
type: workflow
standalone: true
---

# Test Skill

## Overview

This is a test skill for unit testing.
```

`test/fixtures/test-skill/workflow.yaml`:
```yaml
name: test-skill
type: workflow
standalone: true
description: A skill for testing
tool_support:
  - claude-code
  - cursor
```

- [ ] **Step 3: 编写解析器测试**

`test/core/schema/parser.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import path from 'path';
import { parseFrontmatter, parseWorkflowYaml, parseSkill } from '../../../src/core/schema/parser.js';

const fixturesDir = path.resolve(__dirname, '../../fixtures/test-skill');

describe('parseFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
name: my-skill
description: My skill
---
# Content`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('my-skill');
    expect(result.body.trim()).toBe('# Content');
  });

  it('should throw on missing frontmatter', () => {
    expect(() => parseFrontmatter('no frontmatter')).toThrow('No frontmatter found');
  });
});

describe('parseWorkflowYaml', () => {
  it('should parse valid yaml', () => {
    const yaml = `
name: test
type: workflow
standalone: true
description: Test`;
    const result = parseWorkflowYaml(yaml);
    expect(result.name).toBe('test');
    expect(result.type).toBe('workflow');
  });
});

describe('parseSkill', () => {
  it('should parse a complete skill directory', () => {
    const skill = parseSkill(fixturesDir);
    expect(skill.name).toBe('test-skill');
    expect(skill.description).toBe('A skill for testing');
    expect(skill.type).toBe('workflow');
    expect(skill.standalone).toBe(true);
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npm run build
npm test
```

Expected: 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/core/schema/parser.ts test/core/schema/parser.test.ts test/fixtures/
git commit -m "feat: add skill parser with YAML frontmatter support

- parseFrontmatter extracts YAML from SKILL.md
- parseWorkflowYaml reads workflow.yaml
- parseSkill combines both into SkillDefinition
- add test fixtures"
```

---

### Task 2.3: 适配器基类与 Claude Code 适配器

**Files:**
- Create: `src/core/adapters/base.ts`
- Create: `src/core/adapters/claude-code.ts`
- Test: `test/core/adapters/claude-code.test.ts`

- [ ] **Step 1: 创建 src/core/adapters/base.ts**

```typescript
import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger.js';
import type { ToolAdapter, SkillDefinition, GeneratedFile } from '../schema/types.js';
import { VERSION } from '../config.js';

export abstract class BaseAdapter implements ToolAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly skillsDir: string;
  abstract readonly detectionPaths: string[];

  abstract generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  abstract generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  abstract generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[];

  detect(projectRoot: string): boolean {
    return this.detectionPaths.some((p) => {
      const fullPath = path.join(projectRoot, p);
      return fs.existsSync(fullPath);
    });
  }

  protected addGeneratedByMarker(content: string, format: 'md' | 'yaml' | 'json' = 'md'): string {
    const marker = `generatedBy: sot@${VERSION}`;
    if (format === 'json') {
      return content; // JSON handled separately
    }
    if (format === 'yaml') {
      return `${content}\n${marker}`;
    }
    // Markdown: add HTML comment
    return `<!-- ${marker} -->\n${content}`;
  }

  protected createGeneratedFile(
    relativePath: string,
    content: string,
    overwrite: boolean = true
  ): GeneratedFile {
    return {
      path: relativePath,
      content,
      overwrite,
      generatedBy: `sot@${VERSION}`,
    };
  }
}
```

- [ ] **Step 2: 创建 src/core/adapters/claude-code.ts**

```typescript
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly id = 'claude-code';
  readonly name = 'Claude Code';
  readonly skillsDir = '.claude/skills';
  readonly detectionPaths = ['.claude/', 'CLAUDE.md'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Generate .claude/skills/{name}/SKILL.md
    const skillDir = path.join(this.skillsDir, skill.name);
    const skillPath = path.join(skillDir, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);

    files.push(this.createGeneratedFile(skillPath, content));
    return files;
  }

  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Generate .claude/commands/{name}.md
    const commandPath = path.join('.claude/commands', `${skill.name}.md`);
    const commandContent = this.buildCommandContent(skill);

    files.push(this.createGeneratedFile(commandPath, commandContent));
    return files;
  }

  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[] {
    // For Claude Code, we add a snippet to CLAUDE.md
    // This returns the snippet content, not the full file
    const snippets = skills.map((s) => this.buildSkillSnippet(s)).join('\n');
    const content = this.buildClaudeMdSnippet(snippets);
    return [this.createGeneratedFile('CLAUDE.md.sot-snippet', content)];
  }

  private buildCommandContent(skill: SkillDefinition): string {
    const frontmatter = `---
name: ${skill.name}
description: ${skill.description}
---
`;
    return this.addGeneratedByMarker(frontmatter + '\n' + skill.content);
  }

  private buildSkillSnippet(skill: SkillDefinition): string {
    return `- \`${skill.name}\`: ${skill.description}`;
  }

  private buildClaudeMdSnippet(skillSnippets: string): string {
    const content = `
<!-- SOT:START - Generated by sot@${this.constructor.name} -->
<!-- SOT:END -->

## Available Skills

${skillSnippets}

Use skills by calling: \`/superpowers:${skillSnippets.split('\n')[0].split('`')[1]}\`
`;
    return this.addGeneratedByMarker(content);
  }
}
```

- [ ] **Step 3: 编写适配器测试**

`test/core/adapters/claude-code.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ClaudeCodeAdapter } from '../../../src/core/adapters/claude-code.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new ClaudeCodeAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test\n\nContent here.',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('ClaudeCodeAdapter', () => {
  it('should have correct id', () => {
    expect(adapter.id).toBe('claude-code');
  });

  it('should generate skill file', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/skills/test-workflow/SKILL.md');
    expect(files[0].content).toContain('# Test');
    expect(files[0].generatedBy).toMatch(/^sot@/);
  });

  it('should generate command file', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/commands/test-workflow.md');
    expect(files[0].content).toContain('name: test-workflow');
  });

  it('should generate config snippet', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].content).toContain('Available Skills');
  });
});
```

- [ ] **Step 4: 运行测试**

```bash
npm run build
npm test
```

Expected: 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/core/adapters/ test/core/adapters/
git commit -m "feat: add base adapter and Claude Code adapter

- BaseAdapter provides common detection and file generation utilities
- ClaudeCodeAdapter generates .claude/skills/ and .claude/commands/"
```

---

### Task 2.4: Cursor 适配器

**Files:**
- Create: `src/core/adapters/cursor.ts`
- Test: `test/core/adapters/cursor.test.ts`

- [ ] **Step 1: 创建 src/core/adapters/cursor.ts**

```typescript
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class CursorAdapter extends BaseAdapter {
  readonly id = 'cursor';
  readonly name = 'Cursor';
  readonly skillsDir = '.cursor/skills';
  readonly detectionPaths = ['.cursor/', '.cursorrules'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const skillPath = path.join(this.skillsDir, skill.name, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    // Cursor uses .cursor/rules/*.mdc
    const rulePath = path.join('.cursor/rules', `${skill.name}.mdc`);
    const ruleContent = this.buildRuleContent(skill);
    return [this.createGeneratedFile(rulePath, ruleContent)];
  }

  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[] {
    // Cursor reads AGENTS.md
    const snippets = skills.map((s) => `@.cursor/skills/${s.name}/SKILL.md`).join('\n');
    const content = this.buildAgentsMdSnippet(snippets);
    return [this.createGeneratedFile('AGENTS.md.sot-snippet', content)];
  }

  private buildRuleContent(skill: SkillDefinition): string {
    return this.addGeneratedByMarker(`---
description: ${skill.description}
globs:
alwaysApply: false
---

${skill.content}
`);
  }

  private buildAgentsMdSnippet(skillRefs: string): string {
    return this.addGeneratedByMarker(`
<!-- SOT:START - Generated by sot -->
<!-- SOT:END -->

## Skills

References:
${skillRefs}
`);
  }
}
```

- [ ] **Step 2: 编写测试**

`test/core/adapters/cursor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { CursorAdapter } from '../../../src/core/adapters/cursor.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new CursorAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('CursorAdapter', () => {
  it('should have correct id', () => {
    expect(adapter.id).toBe('cursor');
  });

  it('should generate skill file in .cursor/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.cursor/skills/test-workflow/SKILL.md');
  });

  it('should generate rule file in .cursor/rules/', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files[0].path).toBe('.cursor/rules/test-workflow.mdc');
  });

  it('should generate AGENTS.md snippet', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp');
    expect(files[0].path).toBe('AGENTS.md.sot-snippet');
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/core/adapters/cursor.ts test/core/adapters/cursor.test.ts
git commit -m "feat: add Cursor adapter

- generates .cursor/skills/ and .cursor/rules/
- uses .mdc format for rules"
```

---

### Task 2.5: Codex 适配器

**Files:**
- Create: `src/core/adapters/codex.ts`
- Test: `test/core/adapters/codex.test.ts`

- [ ] **Step 1: 创建 src/core/adapters/codex.ts**

```typescript
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class CodexAdapter extends BaseAdapter {
  readonly id = 'codex';
  readonly name = 'OpenAI Codex';
  readonly skillsDir = '.codex/skills';
  readonly detectionPaths = ['.codex/', 'AGENTS.md'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const skillPath = path.join(this.skillsDir, skill.name, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    // Codex doesn't use separate commands, skills are enough
    return [];
  }

  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[] {
    // Codex reads AGENTS.md for project context
    const skillList = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    const content = this.buildAgentsMd(skillList);
    return [this.createGeneratedFile('AGENTS.md.sot-snippet', content)];
  }

  private buildAgentsMd(skillList: string): string {
    return this.addGeneratedByMarker(`
<!-- SOT:START -->
<!-- SOT:END -->

## Skills

${skillList}

Load skills from .codex/skills/
`);
  }
}
```

- [ ] **Step 2: 编写测试**

`test/core/adapters/codex.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../../src/core/adapters/codex.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new CodexAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('CodexAdapter', () => {
  it('should generate skill file in .codex/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.codex/skills/test-workflow/SKILL.md');
  });

  it('should not generate commands', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/core/adapters/codex.ts test/core/adapters/codex.test.ts
git commit -m "feat: add Codex adapter

- generates .codex/skills/
- no separate commands file"
```

---

### Task 2.6: Gemini CLI 适配器

**Files:**
- Create: `src/core/adapters/gemini.ts`
- Test: `test/core/adapters/gemini.test.ts`

- [ ] **Step 1: 创建 src/core/adapters/gemini.ts**

```typescript
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class GeminiAdapter extends BaseAdapter {
  readonly id = 'gemini';
  readonly name = 'Gemini CLI';
  readonly skillsDir = ''; // Gemini doesn't use separate skill dirs
  readonly detectionPaths = ['GEMINI.md', 'gemini-extension.json'];

  generateSkill(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    // Gemini embeds skills directly in GEMINI.md
    return [];
  }

  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    // GEMINI.md contains the skill content
    const content = this.buildGeminiMd(skill);
    return [this.createGeneratedFile('GEMINI.md', content)];
  }

  generateConfig(_skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    return [this.createGeneratedFile('gemini-extension.json', this.buildExtensionJson())];
  }

  private buildGeminiMd(skill: SkillDefinition): string {
    return this.addGeneratedByMarker(`# ${skill.name}

${skill.description}

---

${skill.content}
`);
  }

  private buildExtensionJson(): string {
    return JSON.stringify(
      {
        name: 'superpowers-openspec',
        version: '2.0.0',
        contextFileName: 'GEMINI.md',
      },
      null,
      2
    );
  }
}
```

- [ ] **Step 2: 编写测试**

`test/core/adapters/gemini.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '../../../src/core/adapters/gemini.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new GeminiAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('GeminiAdapter', () => {
  it('should not generate separate skill files', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files).toHaveLength(0);
  });

  it('should generate GEMINI.md with skill content', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('GEMINI.md');
    expect(files[0].content).toContain('test-workflow');
  });

  it('should generate extension json', () => {
    const files = adapter.generateConfig([], '/tmp');
    expect(files[0].path).toBe('gemini-extension.json');
    const parsed = JSON.parse(files[0].content);
    expect(parsed.contextFileName).toBe('GEMINI.md');
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/core/adapters/gemini.ts test/core/adapters/gemini.test.ts
git commit -m "feat: add Gemini CLI adapter

- embeds skills in GEMINI.md
- generates gemini-extension.json"
```

---

### Task 2.7: OMC 兼容适配器

**Files:**
- Create: `src/core/adapters/omc.ts`
- Test: `test/core/adapters/omc.test.ts`

- [ ] **Step 1: 创建 src/core/adapters/omc.ts**

```typescript
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class OmcAdapter extends BaseAdapter {
  readonly id = 'omc';
  readonly name = 'oh-my-claudecode';
  readonly skillsDir = '.claude/skills';
  readonly detectionPaths = ['.omc/', '.claude/plugins/oh-my-claudecode/'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const skillPath = path.join(this.skillsDir, skill.name, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    // OMC uses its own skill system, no separate commands
    return [];
  }

  generateConfig(_skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    // OMC manages its own config
    return [];
  }
}
```

- [ ] **Step 2: 编写测试**

`test/core/adapters/omc.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { OmcAdapter } from '../../../src/core/adapters/omc.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new OmcAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('OmcAdapter', () => {
  it('should detect OMC environment', () => {
    expect(adapter.id).toBe('omc');
  });

  it('should generate skill in .claude/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.claude/skills/test-workflow/SKILL.md');
  });

  it('should not generate commands', () => {
    expect(adapter.generateCommands(mockSkill, '/tmp')).toHaveLength(0);
  });

  it('should not generate config', () => {
    expect(adapter.generateConfig([], '/tmp')).toHaveLength(0);
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/core/adapters/omc.ts test/core/adapters/omc.test.ts
git commit -m "feat: add OMC compatible adapter

- generates .claude/skills/ compatible with OMC
- no separate commands/config"
```

---

## Phase 3: 安装器与核心命令实现

### Task 3.1: 路径验证器

**Files:**
- Create: `src/core/installer/path-validator.ts`
- Test: `test/core/installer/path-validator.test.ts`

- [ ] **Step 1: 创建 src/core/installer/path-validator.ts**

```typescript
import path from 'path';
import os from 'os';

export interface PathValidationResult {
  valid: boolean;
  reason?: string;
}

const FORBIDDEN_PATHS = [
  '/',
  '/usr',
  '/usr/local',
  '/etc',
  '/System',
  '/Applications',
  os.homedir(),
];

export function validateTargetPath(
  targetPath: string,
  projectRoot: string
): PathValidationResult {
  // Resolve to absolute path
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(projectRoot);

  // Check for empty or root
  if (!resolved || resolved === '/') {
    return { valid: false, reason: 'Target path is empty or root' };
  }

  // Check path traversal
  if (resolved.includes('..')) {
    return { valid: false, reason: 'Path traversal detected' };
  }

  // Must be inside project root
  if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
    return { valid: false, reason: 'Target path is outside project root' };
  }

  // Check forbidden paths
  for (const forbidden of FORBIDDEN_PATHS) {
    if (resolved === forbidden || resolved === forbidden + '/') {
      return { valid: false, reason: `Refusing to modify system directory: ${forbidden}` };
    }
  }

  return { valid: true };
}

export function validateDeletionPath(targetPath: string, projectRoot: string): PathValidationResult {
  const baseValidation = validateTargetPath(targetPath, projectRoot);
  if (!baseValidation.valid) return baseValidation;

  const resolved = path.resolve(targetPath);

  // Additional checks for deletion
  if (resolved === path.resolve(projectRoot)) {
    return { valid: false, reason: 'Refusing to delete project root' };
  }

  // Must not be a parent of critical directories
  const criticalDirs = ['src', 'node_modules', '.git'];
  for (const dir of criticalDirs) {
    if (resolved === path.join(projectRoot, dir)) {
      return { valid: false, reason: `Refusing to delete critical directory: ${dir}` };
    }
  }

  return { valid: true };
}
```

- [ ] **Step 2: 编写测试**

`test/core/installer/path-validator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import path from 'path';
import { validateTargetPath, validateDeletionPath } from '../../../src/core/installer/path-validator.js';

const projectRoot = '/home/user/project';

describe('validateTargetPath', () => {
  it('should allow paths inside project root', () => {
    const result = validateTargetPath('/home/user/project/.claude', projectRoot);
    expect(result.valid).toBe(true);
  });

  it('should reject paths outside project root', () => {
    const result = validateTargetPath('/home/other', projectRoot);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('outside project root');
  });

  it('should reject root path', () => {
    const result = validateTargetPath('/', projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject path traversal', () => {
    const result = validateTargetPath('/home/user/project/../other', projectRoot);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('traversal');
  });

  it('should reject system directories', () => {
    const result = validateTargetPath('/usr', projectRoot);
    expect(result.valid).toBe(false);
  });
});

describe('validateDeletionPath', () => {
  it('should reject deleting project root', () => {
    const result = validateDeletionPath(projectRoot, projectRoot);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('project root');
  });

  it('should reject deleting critical directories', () => {
    const result = validateDeletionPath(path.join(projectRoot, 'src'), projectRoot);
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/core/installer/ test/core/installer/
git commit -m "feat: add secure path validator

- validateTargetPath checks traversal and boundary
- validateDeletionPath adds critical dir protection"
```

---

### Task 3.2: 文件安装器

**Files:**
- Create: `src/core/installer/installer.ts`
- Test: `test/core/installer/installer.test.ts`

- [ ] **Step 1: 创建 src/utils/checksum.ts**

```typescript
import crypto from 'crypto';
import fs from 'fs';

export function computeChecksum(content: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

export function computeFileChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return computeChecksum(content);
}

export function verifyChecksum(content: string, checksum: string): boolean {
  const expected = computeChecksum(content);
  return expected === checksum;
}
```

- [ ] **Step 2: 创建 src/core/installer/installer.ts**

```typescript
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { computeChecksum, computeFileChecksum } from '../../utils/checksum.js';
import { validateTargetPath } from './path-validator.js';
import { VERSION } from '../config.js';
import type { GeneratedFile, InstallationResult } from '../schema/types.js';

const GENERATED_BY_MARKER = `generatedBy: sot@`;
const SOT_MARKER_RGX = /<!-- SOT:START[^]*?SOT:END -->/;
const SOT_MARKER_JSON_RGX = /"generatedBy":\s*"sot@[^"]+"/;

export async function installFiles(
  files: GeneratedFile[],
  projectRoot: string,
  options: { dryRun?: boolean; backup?: boolean; force?: boolean } = {}
): Promise<InstallationResult> {
  const result: InstallationResult = {
    success: true,
    filesWritten: [],
    filesBackedUp: [],
    errors: [],
    warnings: [],
  };

  for (const file of files) {
    const targetPath = path.join(projectRoot, file.path);

    // Validate path
    const validation = validateTargetPath(targetPath, projectRoot);
    if (!validation.valid) {
      result.errors.push(`${file.path}: ${validation.reason}`);
      result.success = false;
      continue;
    }

    // Check if file exists and has generatedBy marker
    if (fs.existsSync(targetPath)) {
      const existing = fs.readFileSync(targetPath, 'utf-8');
      const hasMarker = existing.includes(GENERATED_BY_MARKER) ||
                        SOT_MARKER_RGX.test(existing) ||
                        SOT_MARKER_JSON_RGX.test(existing);

      if (!hasMarker && !options.force) {
        result.warnings.push(`${file.path}: Skipped (no generator marker, use --force to overwrite)`);
        continue;
      }

      if (options.backup) {
        const backupPath = `${targetPath}.backup`;
        fs.copyFileSync(targetPath, backupPath);
        result.filesBackedUp.push(backupPath);
      }
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      if (!options.dryRun) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

    // Write file
    if (!options.dryRun) {
      const contentWithChecksum = file.content + `\n<!-- checksum: ${computeChecksum(file.content)} -->`;
      fs.writeFileSync(targetPath, contentWithChecksum);
    }
    result.filesWritten.push(file.path);
    logger.debug(`Installed: ${file.path}`);
  }

  return result;
}

export function detectInstalledTools(projectRoot: string): string[] {
  const candidates = ['claude-code', 'cursor', 'codex', 'gemini', 'omc'];
  const detected: string[] = [];

  for (const tool of candidates) {
    const detectionPaths: Record<string, string[]> = {
      'claude-code': ['.claude/', 'CLAUDE.md'],
      cursor: ['.cursor/', '.cursorrules'],
      codex: ['.codex/', 'AGENTS.md'],
      gemini: ['GEMINI.md'],
      omc: ['.omc/', '.claude/plugins/'],
    };

    const paths = detectionPaths[tool] || [];
    const found = paths.some((p) => fs.existsSync(path.join(projectRoot, p)));
    if (found) {
      detected.push(tool);
    }
  }

  return detected;
}
```

- [ ] **Step 3: 编写测试**

`test/core/installer/installer.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { installFiles, detectInstalledTools } from '../../../src/core/installer/installer.js';
import type { GeneratedFile } from '../../../src/core/schema/types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('installFiles', () => {
  it('should install files to target directory', async () => {
    const files: GeneratedFile[] = [
      { path: '.claude/skills/test/SKILL.md', content: 'content', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.success).toBe(true);
    expect(result.filesWritten).toContain('.claude/skills/test/SKILL.md');
    expect(fs.existsSync(path.join(tmpDir, '.claude/skills/test/SKILL.md'))).toBe(true);
  });

  it('should backup existing files when backup option is set', async () => {
    const filePath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(filePath, 'old content');
    const files: GeneratedFile[] = [
      { path: 'test.md', content: 'new content', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, { backup: true });
    expect(result.filesBackedUp).toContain('test.md.backup');
  });

  it('should skip files without marker when not forced', async () => {
    const filePath = path.join(tmpDir, 'existing.md');
    fs.writeFileSync(filePath, 'no marker');
    const files: GeneratedFile[] = [
      { path: 'existing.md', content: 'new', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.filesWritten).not.toContain('existing.md');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('detectInstalledTools', () => {
  it('should detect Claude Code', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    const tools = detectInstalledTools(tmpDir);
    expect(tools).toContain('claude-code');
  });

  it('should detect multiple tools', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const tools = detectInstalledTools(tmpDir);
    expect(tools).toContain('claude-code');
    expect(tools).toContain('cursor');
  });
});
```

- [ ] **Step 4: 运行测试并提交**

```bash
npm run build
npm test
git add src/utils/checksum.ts src/core/installer/installer.ts test/core/installer/installer.test.ts
git commit -m "feat: add file installer with backup and checksum

- installFiles handles write/backup/dry-run
- detectInstalledTools scans for tool presence
- adds checksum utility"
```

---

### Task 3.3: 实现 sot init 命令

**Files:**
- Modify: `src/commands/init.ts`
- Test: `test/commands/init.test.ts`

- [ ] **Step 1: 重写 src/commands/init.ts**

```typescript
import { Command } from 'commander';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { OmcAdapter } from '../core/adapters/omc.js';
import { installFiles, detectInstalledTools } from '../core/installer/installer.js';
import { TOOL_REGISTRY } from '../core/config.js';
import type { ToolAdapter } from '../core/schema/types.js';

const ADAPTERS: Record<string, ToolAdapter> = {
  'claude-code': new ClaudeCodeAdapter(),
  cursor: new CursorAdapter(),
  codex: new CodexAdapter(),
  gemini: new GeminiAdapter(),
  omc: new OmcAdapter(),
};

export const initCommand = new Command('init')
  .description('Initialize skills in a project')
  .argument('[path]', 'Project path', '.')
  .option('--tool <tools>', 'Target tools (comma-separated)')
  .option('--dry-run', 'Preview changes without writing')
  .option('--force', 'Skip confirmation prompts')
  .option('--backup', 'Backup existing files before overwriting')
  .option('--with-memory', 'Install .superpowers-memory/ template')
  .option('--json', 'Output in JSON format')
  .action(async (projectPath, options) => {
    const projectRoot = path.resolve(projectPath);
    const outputJson = options.json;

    if (!fs.existsSync(projectRoot)) {
      logger.error(`Path not found: ${projectRoot}`);
      process.exit(1);
    }

    // Load skills from package
    const packageRoot = path.dirname(new URL(import.meta.url).pathname);
    const skillsDir = path.join(packageRoot, '..', '..', 'skills');
    const skills = parseAllSkills(fs.existsSync(skillsDir) ? skillsDir : path.join(process.cwd(), 'skills'));

    if (skills.length === 0) {
      logger.error('No skills found');
      process.exit(1);
    }

    // Detect or select tools
    let selectedTools: string[];
    if (options.tool) {
      selectedTools = options.tool.split(',').map((t: string) => t.trim());
    } else {
      const detected = detectInstalledTools(projectRoot);
      if (detected.length > 0 && !options.force) {
        logger.info(`Detected tools: ${detected.join(', ')}`);
        const answer = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'tools',
            message: 'Select tools to install skills for:',
            choices: Object.keys(TOOL_REGISTRY).map((id) => ({
              name: TOOL_REGISTRY[id].name,
              value: id,
              checked: detected.includes(id),
            })),
          },
        ]);
        selectedTools = answer.tools;
      } else {
        const answer = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'tools',
            message: 'Select tools to install skills for:',
            choices: Object.keys(TOOL_REGISTRY).map((id) => ({
              name: TOOL_REGISTRY[id].name,
              value: id,
            })),
          },
        ]);
        selectedTools = answer.tools;
      }
    }

    if (selectedTools.length === 0) {
      logger.warn('No tools selected');
      return;
    }

    // Generate files for each tool
    const allFiles: { path: string; content: string; overwrite: boolean; generatedBy: string }[] = [];

    for (const toolId of selectedTools) {
      const adapter = ADAPTERS[toolId];
      if (!adapter) {
        logger.warn(`Unknown tool: ${toolId}`);
        continue;
      }

      for (const skill of skills) {
        allFiles.push(...adapter.generateSkill(skill, projectRoot));
        allFiles.push(...adapter.generateCommands(skill, projectRoot));
      }

      allFiles.push(...adapter.generateConfig(skills, projectRoot));
    }

    if (options.dryRun) {
      logger.info('Dry run - would install:');
      allFiles.forEach((f) => logger.info(`  ${f.path}`));
      return;
    }

    // Install files
    const result = await installFiles(allFiles, projectRoot, {
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force,
    });

    if (outputJson) {
      console.log(formatJsonOutput(result));
    } else {
      if (result.filesWritten.length > 0) {
        logger.success(`Installed ${result.filesWritten.length} files`);
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => logger.warn(w));
      }
      if (result.errors.length > 0) {
        result.errors.forEach((e) => logger.error(e));
        process.exit(1);
      }
    }
  });
```

- [ ] **Step 2: 编写测试**

`test/commands/init.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Integration test - requires built CLI
describe('sot init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should show help', () => {
    const { execSync } = require('child_process');
    const cliPath = path.resolve(__dirname, '../../bin/sot.js');
    const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf-8' });
    expect(output).toContain('Initialize skills');
  });
});
```

- [ ] **Step 3: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/init.ts test/commands/
git commit -m "feat: implement sot init command

- detects installed tools
- supports --tool, --dry-run, --backup, --force options
- generates skills/commands/config for selected tools"
```

---

### Task 3.4: 实现 sot build 命令

**Files:**
- Modify: `src/commands/build.ts`
- Test: `test/commands/build.test.ts`

- [ ] **Step 1: 重写 src/commands/build.ts**

```typescript
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { computeChecksum } from '../utils/checksum.js';
import { VERSION } from '../core/config.js';
import type { ToolAdapter, GeneratedFile } from '../core/schema/types.js';

const ADAPTERS: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
];

interface BuildOutput {
  tool: string;
  bundlePath: string;
  files: string[];
  manifest: {
    tool: string;
    version: string;
    generatedBy: string;
    generatedAt: string;
    contents: string[];
    checksums: Record<string, string>;
  };
}

export const buildCommand = new Command('build')
  .description('Build dist/ from skills/')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const skillsDir = path.join(process.cwd(), 'skills');
    const distDir = path.join(process.cwd(), 'dist');

    if (!fs.existsSync(skillsDir)) {
      logger.error('skills/ directory not found');
      process.exit(1);
    }

    const skills = parseAllSkills(skillsDir);

    if (skills.length === 0) {
      logger.error('No skills found in skills/');
      process.exit(1);
    }

    logger.info(`Building dist/ from ${skills.length} skills...`);
    const outputs: BuildOutput[] = [];

    for (const adapter of ADAPTERS) {
      const bundleDir = path.join(distDir, adapter.id, 'bundles', 'superpowers-openspec');
      const files: GeneratedFile[] = [];

      for (const skill of skills) {
        files.push(...adapter.generateSkill(skill, bundleDir));
        files.push(...adapter.generateCommands(skill, bundleDir));
      }
      files.push(...adapter.generateConfig(skills, bundleDir));

      // Clear and write bundle
      if (fs.existsSync(bundleDir)) {
        fs.rmSync(bundleDir, { recursive: true });
      }

      const checksums: Record<string, string> = [];
      for (const file of files) {
        const filePath = path.join(bundleDir, file.path);
        const parentDir = path.dirname(filePath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(filePath, file.content);
        checksums[file.path] = computeChecksum(file.content);
      }

      // Write manifest
      const manifest = {
        tool: adapter.id,
        version: VERSION,
        generatedBy: `sot@${VERSION}`,
        generatedAt: new Date().toISOString(),
        contents: files.map((f) => f.path),
        checksums,
      };
      fs.writeFileSync(path.join(bundleDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      outputs.push({
        tool: adapter.id,
        bundlePath: bundleDir,
        files: files.map((f) => f.path),
        manifest,
      });

      logger.success(`Built ${adapter.id}: ${files.length} files`);
    }

    // Write checksums.json
    const checksumsPath = path.join(distDir, 'checksums.json');
    const allChecksums: Record<string, string> = {};
    for (const output of outputs) {
      Object.assign(allChecksums, output.manifest.checksums);
    }
    fs.writeFileSync(checksumsPath, JSON.stringify(allChecksums, null, 2));
    logger.success(`Wrote dist/checksums.json`);

    if (options.json) {
      console.log(formatJsonOutput({ outputs }));
    }
  });
```

- [ ] **Step 2: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/build.ts
git commit -m "feat: implement sot build command

- generates dist/ bundles for all adapters
- writes manifest.json with checksums
- deterministic build from skills/"
```

---

### Task 3.5: 实现 sot validate 命令

**Files:**
- Modify: `src/commands/validate.ts`
- Test: `test/commands/validate.test.ts`

- [ ] **Step 1: 重写 src/commands/validate.ts**

```typescript
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { verifyChecksum, computeFileChecksum } from '../utils/checksum.js';
import { detectInstalledTools } from '../core/installer/installer.js';
import { VERSION } from '../core/config.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    filesExist: boolean;
    checksumsMatch: boolean;
    markerPresent: boolean;
    dependenciesMet: boolean;
  };
}

export const validateCommand = new Command('validate')
  .description('Validate installation integrity')
  .argument('[path]', 'Project path', '.')
  .option('--json', 'Output in JSON format')
  .action(async (projectPath, options) => {
    const projectRoot = path.resolve(projectPath);
    const outputJson = options.json;

    if (!fs.existsSync(projectRoot)) {
      logger.error(`Path not found: ${projectRoot}`);
      process.exit(1);
    }

    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      checks: {
        filesExist: true,
        checksumsMatch: true,
        markerPresent: true,
        dependenciesMet: true,
      },
    };

    // Check for generatedBy markers in skill files
    const skillDirs = ['.claude/skills', '.cursor/skills', '.codex/skills'];
    for (const dir of skillDirs) {
      const fullDir = path.join(projectRoot, dir);
      if (!fs.existsSync(fullDir)) continue;

      const entries = fs.readdirSync(fullDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(fullDir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            const content = fs.readFileSync(skillPath, 'utf-8');
            if (!content.includes(`generatedBy: sot@`) && !content.includes('<!-- generatedBy: sot@')) {
              result.warnings.push(`${dir}/${entry.name}/SKILL.md: No generator marker`);
              result.checks.markerPresent = false;
            }
          } else {
            result.errors.push(`${dir}/${entry.name}/SKILL.md: Missing`);
            result.checks.filesExist = false;
          }
        }
      }
    }

    // Check memory format if exists
    const memoryDir = path.join(projectRoot, '.superpowers-memory');
    if (fs.existsSync(memoryDir)) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const files = ['CURRENT_STATE.md', 'PROJECT_CONTEXT.md'];
      for (const file of files) {
        const filePath = path.join(memoryDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const dateMatch = content.match(/(?:last_updated|review_after|date):\s*(\S+)/gi);
          if (dateMatch) {
            for (const match of dateMatch) {
              const dateValue = match.split(':')[1].trim();
              if (!dateRegex.test(dateValue) && !dateValue.startsWith('<')) {
                result.errors.push(`${file}: Invalid date format '${dateValue}' (expected YYYY-MM-DD)`);
                result.valid = false;
              }
            }
          }
        }
      }
    }

    // Check detected tools
    const tools = detectInstalledTools(projectRoot);
    if (tools.length === 0) {
      result.warnings.push('No AI development tools detected');
    }

    if (outputJson) {
      console.log(formatJsonOutput(result));
    } else {
      if (result.valid) {
        logger.success('Validation passed');
      } else {
        logger.error('Validation failed');
        result.errors.forEach((e) => logger.error(e));
      }
      result.warnings.forEach((w) => logger.warn(w));
    }

    process.exit(result.valid ? 0 : 1);
  });
```

- [ ] **Step 2: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/validate.ts
git commit -m "feat: implement sot validate command

- checks generatedBy markers in skill files
- validates memory date formats (YYYY-MM-DD)
- reports detected tools and issues"
```

---

### Task 3.6: 实现 sot list 命令

**Files:**
- Modify: `src/commands/list.ts`

- [ ] **Step 1: 重写 src/commands/list.ts**

```typescript
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { detectInstalledTools } from '../core/installer/installer.js';
import { TOOL_REGISTRY } from '../core/config.js';

export const listCommand = new Command('list')
  .description('List available skills and installed tools')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const outputJson = options.json;
    const projectRoot = process.cwd();

    // List available skills
    const skillsDir = path.join(projectRoot, 'skills');
    const skills = fs.existsSync(skillsDir) ? parseAllSkills(skillsDir) : [];

    // Detect installed tools
    const installedTools = detectInstalledTools(projectRoot);

    const data = {
      skills: skills.map((s) => ({
        name: s.name,
        description: s.description,
        type: s.type,
        standalone: s.standalone,
      })),
      availableTools: Object.keys(TOOL_REGISTRY).map((id) => ({
        id,
        name: TOOL_REGISTRY[id].name,
        installed: installedTools.includes(id),
      })),
    };

    if (outputJson) {
      console.log(formatJsonOutput(data));
    } else {
      logger.info('Available Skills:');
      data.skills.forEach((s) => {
        console.log(`  - ${s.name}: ${s.description}`);
      });
      console.log('');
      logger.info('Detected Tools:');
      data.availableTools.forEach((t) => {
        const status = t.installed ? '✓' : '✗';
        console.log(`  ${status} ${t.name} (${t.id})`);
      });
    }
  });
```

- [ ] **Step 2: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/list.ts
git commit -m "feat: implement sot list command

- lists available skills from skills/
- shows detected tools with installation status"
```

---

### Task 3.7: 实现 sot install-deps 命令

**Files:**
- Modify: `src/commands/install-deps.ts`

- [ ] **Step 1: 重写 src/commands/install-deps.ts**

```typescript
import { Command } from 'commander';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { parseAllSkills } from '../core/schema/parser.js';
import type { DependencyStatus } from '../core/schema/types.js';

const KNOWN_DEPS: Record<string, { checkCmd: string; installCmd: string }> = {
  'openspec-cli': {
    checkCmd: 'openspec --version',
    installCmd: 'npm install -g @fission-ai/openspec',
  },
};

export const installDepsCommand = new Command('install-deps')
  .description('Install runtime dependencies')
  .option('--force', 'Skip confirmation prompts')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const outputJson = options.json;
    const projectRoot = process.cwd();

    // Collect dependencies from skills
    const skillsDir = path.join(projectRoot, 'skills');
    const skills = fs.existsSync(skillsDir) ? parseAllSkills(skillsDir) : [];

    const deps: Map<string, DependencyStatus> = new Map();

    for (const skill of skills) {
      if (skill.metadata?.dependencies?.external) {
        for (const ext of skill.metadata.dependencies.external) {
          const name = typeof ext === 'string' ? ext : ext.name;
          if (!deps.has(name)) {
            let installed = false;
            let version: string | undefined;
            const depInfo = KNOWN_DEPS[name];

            if (depInfo) {
              try {
                version = execSync(depInfo.checkCmd, { encoding: 'utf-8' }).trim();
                installed = true;
              } catch {
                installed = false;
              }
            }

            deps.set(name, {
              name,
              installed,
              version,
              required: typeof ext === 'object' ? ext.version || 'any' : 'any',
            });
          }
        }
      }
    }

    const statuses = Array.from(deps.values());
    const missing = statuses.filter((d) => !d.installed);

    if (outputJson) {
      console.log(formatJsonOutput({ dependencies: statuses, missing }));
      return;
    }

    if (statuses.length === 0) {
      logger.info('No external dependencies found');
      return;
    }

    logger.info('Dependency Status:');
    statuses.forEach((d) => {
      const icon = d.installed ? '✓' : '✗';
      const ver = d.version ? ` (${d.version})` : '';
      console.log(`  ${icon} ${d.name}${ver}`);
    });

    if (missing.length > 0) {
      console.log('');
      logger.warn(`Missing dependencies: ${missing.map((d) => d.name).join(', ')}`);

      if (options.force) {
        for (const dep of missing) {
          const info = KNOWN_DEPS[dep.name];
          if (info) {
            logger.info(`Installing ${dep.name}...`);
            try {
              execSync(info.installCmd, { stdio: 'inherit' });
              logger.success(`Installed ${dep.name}`);
            } catch (e) {
              logger.error(`Failed to install ${dep.name}`);
            }
          } else {
            logger.warn(`Unknown how to install: ${dep.name}`);
          }
        }
      }
    }
  });
```

- [ ] **Step 2: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/install-deps.ts
git commit -m "feat: implement sot install-deps command

- collects external deps from skills
- checks installation status
- installs missing deps with --force"
```

---

### Task 3.8: 实现 sot config 命令

**Files:**
- Modify: `src/commands/config.ts`

- [ ] **Step 1: 重写 src/commands/config.ts**

```typescript
import { Command } from 'commander';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../core/config.js';

export const configCommand = new Command('config')
  .description('View or modify global configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--json', 'Output in JSON format')
  .action(async (options) => {
    const config = loadConfig();
    const outputJson = options.json;

    if (options.set) {
      const [key, value] = options.set.split('=');
      if (key && value !== undefined) {
        // Parse value
        let parsed: string | boolean | string[] = value;
        if (value === 'true') parsed = true;
        else if (value === 'false') parsed = false;
        else if (value.includes(',')) parsed = value.split(',');

        (config as Record<string, unknown>)[key] = parsed;
        saveConfig(config);
        logger.success(`Set ${key} = ${JSON.stringify(parsed)}`);
      }
      return;
    }

    if (options.get) {
      const value = (config as Record<string, unknown>)[options.get];
      if (outputJson) {
        console.log(formatJsonOutput({ key: options.get, value }));
      } else {
        console.log(value !== undefined ? JSON.stringify(value) : 'undefined');
      }
      return;
    }

    // Show all config
    if (outputJson) {
      console.log(formatJsonOutput(config));
    } else {
      logger.info('Current configuration:');
      Object.entries(config).forEach(([k, v]) => {
        console.log(`  ${k}: ${JSON.stringify(v)}`);
      });
    }
  });
```

- [ ] **Step 2: 运行测试并提交**

```bash
npm run build
npm test
git add src/commands/config.ts
git commit -m "feat: implement sot config command

- view/get/set global configuration
- supports JSON output"
```

---

## Phase 4: 安全修复

### Task 4.1: 修复 awk 命令注入

**Files:**
- Modify: `scripts/search-superpowers-memory.sh`
- Modify: `scripts/validate-superpowers-memory.sh`
- Test: 手动测试

- [ ] **Step 1: 读取并修复脚本**

读取 `scripts/search-superpowers-memory.sh`，找到使用 `date` 命令的 awk 代码块，替换为纯 awk 日期计算。

关键修改模式：

```awk
# 在 awk 脚本开头添加 to_epoch 函数
function to_epoch(d,    parts, y, m, day, days_in_month, total_days) {
  if (d !~ /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) return -1
  split(d, parts, "-")
  y = parts[1] + 0
  m = parts[2] + 0
  day = parts[3] + 0
  if (y < 1970 || m < 1 || m > 12 || day < 1 || day > 31) return -1
  # 简化的天数计算（精度到天）
  days_in_month = "31 28 31 30 31 30 31 31 30 31 30 31"
  total_days = (y - 1970) * 365 + int((y - 1969) / 4)
  for (i = 1; i < m; i++) {
    total_days += substr(days_in_month, (i-1)*3+1, 2) + 0
  }
  total_days += day - 1
  return total_days * 86400
}

# 替换原来的：
# cmd = "date -d \"" d "\" +%s 2>/dev/null"
# cmd | getline epoch
# 改为：
epoch = to_epoch(d)
if (epoch < 0) {
  # 处理无效日期
}
```

- [ ] **Step 2: 对 validate-superpowers-memory.sh 做相同修复**

- [ ] **Step 3: 验证修复**

```bash
# 创建测试文件
mkdir -p /tmp/test-memory
echo 'last_updated: 2024-01-01"; echo PWNED # ' > /tmp/test-memory/CURRENT_STATE.md

# 运行脚本（应该不会执行注入的命令）
./scripts/search-superpowers-memory.sh --project-root /tmp/test-memory

# 确认没有 "PWNED" 输出
```

- [ ] **Step 4: Commit**

```bash
git add scripts/search-superpowers-memory.sh scripts/validate-superpowers-memory.sh
git commit -m "fix(security): replace date command with pure awk date calculation

- removes command injection vulnerability in awk scripts
- adds to_epoch function for YYYY-MM-DD parsing
- validates date format before processing"
```

---

### Task 4.2: 添加 read -r 到安装脚本

**Files:**
- Modify: `scripts/install-codex.sh`
- Modify: `scripts/install-claude-code.sh`
- Modify: `scripts/install-cursor.sh`

- [ ] **Step 1: 查找并替换**

在所有安装脚本中，将 `read ANSWER` 替换为 `read -r ANSWER`。

```bash
# 在每个文件中执行类似替换
sed -i 's/read ANSWER/read -r ANSWER/g' scripts/install-codex.sh
sed -i 's/read ANSWER/read -r ANSWER/g' scripts/install-claude-code.sh
sed -i 's/read ANSWER/read -r ANSWER/g' scripts/install-cursor.sh
```

- [ ] **Step 2: Commit**

```bash
git add scripts/install-*.sh
git commit -m "fix: add -r flag to read commands

- prevents backslash interpretation in user input"
```

---

### Task 4.3: 修复 CI 工作流

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: 读取现有 CI 配置**

- [ ] **Step 2: 添加 permissions 和固定 SHA**

```yaml
name: CI

permissions:
  contents: read

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1

      - name: Setup Node.js
        uses: actions/setup-node@60edb5dd545a9758f28e8e04b5b3c5e65982ad5f  # v4.0.2
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Verify dist checksums
        run: |
          if [ -f dist/checksums.json ]; then
            echo "Checksums generated"
          fi
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "fix(security): add permissions and pin actions to SHA

- adds permissions: contents: read
- pins actions to full SHA instead of version tags
- adds dist checksum verification step"
```

---

## Phase 5: 记忆系统增强

### Task 5.1: 更新记忆模板格式约束

**Files:**
- Modify: `templates/superpowers-memory/*.md`

- [ ] **Step 1: 为所有模板添加格式约束说明**

在每个模板文件的日期占位符附近添加注释：

```markdown
<!-- Date format: YYYY-MM-DD (required, no exceptions) -->
```

- [ ] **Step 2: Commit**

```bash
git add templates/superpowers-memory/
git commit -m "docs: add date format constraints to memory templates

- all date fields must use YYYY-MM-DD format
- supports validation by sot validate"
```

---

### Task 5.2: 重命名 team-skills 为 skills（已完成）

**Files:**
- 整个目录重命名

- [ ] **Step 1: 执行重命名**

```bash
cd D:/Code/superpowers-openspec-team-skills
mv team-skills skills  # already done
```

- [ ] **Step 2: 更新相关引用**

检查 README、文档中是否有 `team-skills` 的引用，更新为 `skills`（已完成）。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename team-skills to skills

- source directory now matches CLI expectations
- updates documentation references"
```

---

## Phase 6: OMC 兼容适配器完善

已在 Task 2.7 完成 OmcAdapter 实现。

---

## Phase 7: 端到端测试与发布

### Task 7.1: 端到端测试

**Files:**
- Create: `test/e2e/init-build-install.test.ts`

- [ ] **Step 1: 创建端到端测试**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('E2E: init -> build -> validate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-e2e-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should init skills in empty project', () => {
    const output = execSync(`node ${cliPath} init ${tmpDir} --tool claude-code --force`, {
      encoding: 'utf-8',
    });
    expect(fs.existsSync(path.join(tmpDir, '.claude'))).toBe(true);
  });

  it('should build dist from skills', () => {
    // Copy skills to tmp dir
    const skillsSrc = path.resolve(__dirname, '../../skills');
    if (fs.existsSync(skillsSrc)) {
      fs.cpSync(skillsSrc, path.join(tmpDir, 'skills'), { recursive: true });
      execSync(`node ${cliPath} build`, { cwd: tmpDir, encoding: 'utf-8' });
      expect(fs.existsSync(path.join(tmpDir, 'dist'))).toBe(true);
    }
  });

  it('should validate installation', () => {
    execSync(`node ${cliPath} init ${tmpDir} --tool claude-code --force`, { encoding: 'utf-8' });
    const output = execSync(`node ${cliPath} validate ${tmpDir}`, { encoding: 'utf-8' });
    expect(output).toContain('passed');
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
npm run build
npm test
```

- [ ] **Step 3: Commit**

```bash
git add test/e2e/
git commit -m "test: add end-to-end tests for init/build/validate flow"
```

---

### Task 7.2: 更新文档

**Files:**
- Modify: `README.md`
- Modify: `README.cn.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: 更新 README**

添加 CLI 使用说明：

```markdown
## CLI Usage

### Installation

```bash
npm install -g @superpowers-openspec/cli
```

### Commands

```bash
# Initialize skills for detected AI tools
sot init /path/to/project

# Build dist/ from skills/
sot build

# Validate installation
sot validate /path/to/project

# List skills and tools
sot list

# Install dependencies
sot install-deps --force
```

### Agent Integration

Agents can call CLI commands directly:

```bash
sot init . --tool claude-code --force --json
```
```

- [ ] **Step 2: 更新 CHANGELOG**

添加 2.0.0 版本条目。

- [ ] **Step 3: Commit**

```bash
git add README.md README.cn.md CHANGELOG.md
git commit -m "docs: update for CLI v2.0.0

- add CLI usage guide
- add agent integration examples
- update changelog"
```

---

### Task 7.3: npm 发布准备

**Files:**
- 检查: `package.json`
- 检查: `LICENSE`

- [ ] **Step 1: 验证 package.json**

确保所有字段正确：
- name: `@superpowers-openspec/cli`
- version: `2.0.0`
- bin: `{ "sot": "./bin/sot.js" }`
- files: 包含必要目录

- [ ] **Step 2: 本地验证**

```bash
npm run build
npm run test
npm pack --dry-run
```

- [ ] **Step 3: 发布（需要 npm 账号）**

```bash
npm login
npm publish --access public
```

---

### Task 7.4: 最终提交

- [ ] **Step 1: 确保所有更改已提交**

```bash
git status
git add -A
git commit -m "chore: prepare for v2.0.0 release"
```

- [ ] **Step 2: 创建版本标签**

```bash
git tag v2.0.0
git push origin main --tags
```

---

## 任务摘要

| Phase | Task | 预估步骤数 |
|-------|------|-----------|
| Phase 1 | 1.1 初始化 npm 包 | 6 |
| Phase 1 | 1.2 CLI 入口 | 7 |
| Phase 2 | 2.1 核心类型 | 5 |
| Phase 2 | 2.2 Skill 解析器 | 5 |
| Phase 2 | 2.3-2.7 适配器 (5个) | 15 |
| Phase 3 | 3.1-3.2 安装器 | 8 |
| Phase 3 | 3.3-3.8 命令实现 (6个) | 12 |
| Phase 4 | 4.1-4.3 安全修复 | 8 |
| Phase 5 | 5.1-5.2 记忆系统 | 5 |
| Phase 7 | 7.1-7.4 测试发布 | 10 |

**总计：约 81 个步骤**

---

## 执行建议

1. 按 Phase 顺序执行，每个 Phase 内按 Task 顺序
2. 每个 Task 完成后运行测试确保通过
3. 频繁提交，保持原子性
4. Phase 4 安全修复可与 Phase 2-3 并行
5. Phase 6 已在 Phase 2 完成
