# Tasks: OMC Integration

## Task 1: OMC 检测器

**Files**:
- Create: `src/core/omc-detector.ts`
- Test: `test/core/omc-detector.test.ts`

- [ ] **Step 1: 写 OmcDetectionResult 接口和 detectOmc 函数**

```typescript
// src/core/omc-detector.ts
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface OmcDetectionResult {
  available: boolean;
  projectLocal: boolean;
  globalInstall: boolean;
  mcpServerName: string;
  version?: string;
  detectionMethod: 'project-local' | 'global-claude-json' | 'global-omc-dir' | 'global-omc-config' | 'none';
}

export function detectOmc(projectRoot: string): OmcDetectionResult {
  // 1. 检查项目本地 .omc/ 目录
  if (fs.existsSync(path.join(projectRoot, '.omc'))) {
    return {
      available: true,
      projectLocal: true,
      globalInstall: false,
      mcpServerName: 't',
      version: tryReadVersion(projectRoot),
      detectionMethod: 'project-local',
    };
  }

  // 2. 检查 ~/.claude.json 是否有 MCP server 't'
  const claudeJsonPath = path.join(os.homedir(), '.claude.json');
  if (fs.existsSync(claudeJsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
      if (content?.mcpServers?.t) {
        return {
          available: true,
          projectLocal: false,
          globalInstall: true,
          mcpServerName: 't',
          version: undefined,
          detectionMethod: 'global-claude-json',
        };
      }
    } catch { /* ignore parse errors */ }
  }

  // 3. 检查 ~/.omc/ 目录
  const omcDir = path.join(os.homedir(), '.omc');
  if (fs.existsSync(omcDir)) {
    return {
      available: true,
      projectLocal: false,
      globalInstall: true,
      mcpServerName: 't',
      version: undefined,
      detectionMethod: 'global-omc-dir',
    };
  }

  // 4. 检查 ~/.claude/.omc-config.json
  const omcConfigPath = path.join(os.homedir(), '.claude', '.omc-config.json');
  if (fs.existsSync(omcConfigPath)) {
    return {
      available: true,
      projectLocal: false,
      globalInstall: true,
      mcpServerName: 't',
      version: tryReadOmcConfigVersion(omcConfigPath),
      detectionMethod: 'global-omc-config',
    };
  }

  return {
    available: false,
    projectLocal: false,
    globalInstall: false,
    mcpServerName: '',
    version: undefined,
    detectionMethod: 'none',
  };
}

function tryReadVersion(projectRoot: string): string | undefined {
  // 从 .omc/ 内部无法直接获取 OMC 版本，返回 undefined
  return undefined;
}

function tryReadOmcConfigVersion(configPath: string): string | undefined {
  try {
    const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return content.version;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 2: 写检测器测试**

```typescript
// test/core/omc-detector.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { detectOmc } from '../../src/core/omc-detector.js';

describe('detectOmc', () => {
  const mockRoot = '/tmp/test-project';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('detects project-local .omc/ directory', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: string) => {
      if (p === path.join(mockRoot, '.omc')) return true;
      return false;
    });
    const result = detectOmc(mockRoot);
    expect(result.available).toBe(true);
    expect(result.projectLocal).toBe(true);
    expect(result.detectionMethod).toBe('project-local');
  });

  it('detects global OMC via ~/.claude.json', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: string) => {
      if (p.includes('.claude.json')) return true;
      return false;
    });
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      mcpServers: { t: { command: 'node', args: ['bridge/mcp-server.cjs'] } },
    }));
    const result = detectOmc(mockRoot);
    expect(result.available).toBe(true);
    expect(result.globalInstall).toBe(true);
    expect(result.detectionMethod).toBe('global-claude-json');
  });

  it('returns available=false when no OMC found', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const result = detectOmc(mockRoot);
    expect(result.available).toBe(false);
    expect(result.detectionMethod).toBe('none');
  });

  it('prioritizes project-local over global', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const result = detectOmc(mockRoot);
    expect(result.projectLocal).toBe(true);
    expect(result.detectionMethod).toBe('project-local');
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run test/core/omc-detector.test.ts`
Expected: 4 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/core/omc-detector.ts test/core/omc-detector.test.ts
git commit -m "feat: add OMC detection module"
```

---

## Task 2: OmcAdapter 实现

**Files**:
- Create: `src/core/adapters/omc.ts`
- Test: `test/core/adapters/omc.test.ts`

- [ ] **Step 1: 实现 OmcAdapter**

```typescript
// src/core/adapters/omc.ts
import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class OmcAdapter extends BaseAdapter {
  readonly id = 'omc';
  readonly name = 'OMC (oh-my-claudecode)';
  readonly skillsDir = '.omc/skills';
  readonly detectionPaths = ['.omc/', '.omc/state/', '.omc/notepad.md'];

  generateSkill(skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    const skillDir = path.join(this.skillsDir, skill.name);
    const skillPath = path.join(skillDir, 'SKILL.md');
    const hint = skill.frontmatter.model_hint || skill.metadata?.model_hint;
    const fmLines = [`---`, `name: ${skill.name}`, `description: "${skill.description}"`];
    if (hint) fmLines.push(`model_hint: ${hint}`);
    if (skill.frontmatter.tags?.length) {
      fmLines.push(`tags:\n${skill.frontmatter.tags.map(t => `  - ${t}`).join('\n')}`);
    }
    if (skill.frontmatter.category) fmLines.push(`category: ${skill.frontmatter.category}`);
    fmLines.push(`---`);
    const content = this.addGeneratedByMarker(fmLines.join('\n') + '\n\n' + skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateConfig(skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    const registry = {
      source: 'superpowers-openspec-team-skills',
      version: VERSION,
      skills: skills.map(s => ({
        name: s.name,
        description: s.description,
        model_hint: s.frontmatter.model_hint || s.metadata?.model_hint,
        tags: s.frontmatter.tags || s.metadata?.tags,
        category: s.frontmatter.category || s.metadata?.category,
      })),
    };
    return [this.createGeneratedFile(
      '.omc/skills/sot-registry.json',
      JSON.stringify(registry, null, 2)
    )];
  }
}
```

注意：generateConfig 中的 version 需从 `../config.js` 导入 `VERSION`。

- [ ] **Step 2: 写 OmcAdapter 测试**

```typescript
// test/core/adapters/omc.test.ts
import { describe, it, expect } from 'vitest';
import { OmcAdapter } from '../../../src/core/adapters/omc.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'A test workflow skill',
  content: 'This is the skill content.',
  frontmatter: {
    name: 'test-workflow',
    description: 'A test workflow skill',
    model_hint: 'opus',
    tags: ['planning', 'design'],
    category: 'orchestration',
  },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('OmcAdapter', () => {
  const adapter = new OmcAdapter();

  it('has correct id and skillsDir', () => {
    expect(adapter.id).toBe('omc');
    expect(adapter.skillsDir).toBe('.omc/skills');
  });

  it('generates SKILL.md in .omc/skills/{name}/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp/project');
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('.omc/skills/test-workflow/SKILL.md');
    expect(files[0].content).toContain('model_hint: opus');
    expect(files[0].content).toContain('category: orchestration');
  });

  it('generateCommands returns empty array', () => {
    expect(adapter.generateCommands(mockSkill, '/tmp/project')).toEqual([]);
  });

  it('generateConfig creates sot-registry.json', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp/project');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.omc/skills/sot-registry.json');
    const parsed = JSON.parse(files[0].content);
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].name).toBe('test-workflow');
  });

  it('detects .omc/ directory', () => {
    // detect() 继承自 BaseAdapter，依赖 detectionPaths
    expect(adapter.detectionPaths).toContain('.omc/');
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run test/core/adapters/omc.test.ts`
Expected: 5 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/core/adapters/omc.ts test/core/adapters/omc.test.ts
git commit -m "feat: add OmcAdapter for .omc/skills installation"
```

---

## Task 3: 注册 OmcAdapter 到构建和安装流程

**Files**:
- Modify: `src/commands/build.ts`
- Modify: `src/commands/init.ts`
- Modify: `src/core/config.ts`

- [ ] **Step 1: 将 OmcAdapter 加入 ADAPTERS 数组**

在 `src/commands/build.ts` 和 `src/commands/init.ts` 中：

```typescript
import { OmcAdapter } from '../core/adapters/omc.js';

const ADAPTERS: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
  new OmcAdapter(),  // NEW
];
```

- [ ] **Step 2: 在 TOOL_REGISTRY 添加 omc 条目**

在 `src/core/config.ts`：

```typescript
omc: {
  name: 'OMC (oh-my-claudecode)',
  skillsDir: '.omc/skills',
  detectionPaths: ['.omc/', '.omc/state/', '.omc/notepad.md'],
},
```

- [ ] **Step 3: 在 init.ts 添加 OMC 自动检测双写逻辑（含降级）**

在 `detectInstalledTools` 返回结果后，额外调用 `detectOmc()`：

```typescript
import { detectOmc } from '../core/omc-detector.js';

// 在 init 命令 action 中，tool 选择后：
const omcResult = detectOmc(projectRoot);
if (omcResult.available && !selectedToolIds.includes('omc')) {
  selectedToolIds.push('omc');
  logger.info('OMC detected — skills will also be installed to .omc/skills/');
}
// 降级：OMC 未安装时 selectedToolIds 不含 'omc'，行为与 v2.4.0 完全一致
```

- [ ] **Step 3b: build.ts 降级门控**

在 `src/commands/build.ts` 中，OmcAdapter 加入 ADAPTERS 数组，但在构建循环中加 `detect()` 门控：

```typescript
for (const adapter of ADAPTERS) {
  // OmcAdapter 只在检测到 OMC 时构建，除非用户显式 --tool omc
  if (adapter.id === 'omc' && !adapter.detect(projectRoot) && !selectedToolIds?.includes('omc')) {
    logger.debug(`Skipping ${adapter.name} — OMC not detected`);
    continue;
  }
  // ... rest of build loop
}
```

当 OMC 不存在时，build 输出与 v2.4.0 一致（4 个适配器），不会生成 dist/omc/ 目录。

- [ ] **Step 4: 运行构建和测试**

Run: `npm run build && npx vitest run`
Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add src/commands/build.ts src/commands/init.ts src/core/config.ts
git commit -m "feat: register OmcAdapter in build and init flows"
```

---

## Task 4: CLAUDE.md Skill 引用注入

**Files**:
- Create: `src/core/claude-md-injector.ts`
- Test: `test/core/claude-md-injector.test.ts`

- [ ] **Step 1: 实现 SOT 块注入器**

```typescript
// src/core/claude-md-injector.ts
import type { SkillDefinition } from './schema/types.js';
import { VERSION } from './config.js';

const SOT_START = '<!-- SOT:START -->';
const SOT_END = '<!-- SOT:END -->';

export function injectSotBlock(claudeMdContent: string, skills: SkillDefinition[]): string {
  const sotBlock = buildSotBlock(skills);

  // 如果已有 SOT 块，替换
  if (claudeMdContent.includes(SOT_START) && claudeMdContent.includes(SOT_END)) {
    const startIdx = claudeMdContent.indexOf(SOT_START);
    const endIdx = claudeMdContent.indexOf(SOT_END) + SOT_END.length;
    return claudeMdContent.slice(0, startIdx) + sotBlock + claudeMdContent.slice(endIdx);
  }

  // 如果有 OMC:END 标记，在其后插入
  const omcEnd = '<!-- OMC:END -->';
  if (claudeMdContent.includes(omcEnd)) {
    const insertIdx = claudeMdContent.indexOf(omcEnd) + omcEnd.length;
    return claudeMdContent.slice(0, insertIdx) + '\n\n' + sotBlock + '\n' + claudeMdContent.slice(insertIdx);
  }

  // 否则追加到末尾
  return claudeMdContent + '\n\n' + sotBlock + '\n';
}

export function removeSotBlock(claudeMdContent: string): string {
  if (!claudeMdContent.includes(SOT_START)) return claudeMdContent;
  const startIdx = claudeMdContent.indexOf(SOT_START);
  const endIdx = claudeMdContent.indexOf(SOT_END) + SOT_END.length;
  let result = claudeMdContent.slice(0, startIdx) + claudeMdContent.slice(endIdx);
  // 清理多余空行
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trimEnd() + '\n';
}

function buildSotBlock(skills: SkillDefinition[]): string {
  const skillLines = skills.map(s => `- \`${s.name}\`: ${s.description}`).join('\n');
  return `${SOT_START}\n<!-- generatedBy: sot@${VERSION} -->\n## Superpowers-OpenSpec Skills\n\n${skillLines}\n\nInvoke: \`/openspec-feature-workflow\` or \`/superpowers-feature-workflow\`\n${SOT_END}`;
}
```

- [ ] **Step 2: 写注入器测试**

```typescript
// test/core/claude-md-injector.test.ts
import { describe, it, expect } from 'vitest';
import { injectSotBlock, removeSotBlock } from '../../src/core/claude-md-injector.js';

const mockSkills = [
  { name: 'wf-1', description: 'First workflow' },
  { name: 'wf-2', description: 'Second workflow' },
] as any;

describe('injectSotBlock', () => {
  it('inserts SOT block after OMC:END', () => {
    const input = '# Project\n<!-- OMC:START -->\nOMC content\n<!-- OMC:END -->\n';
    const result = injectSotBlock(input, mockSkills);
    expect(result).toContain('<!-- SOT:START -->');
    expect(result).toContain('<!-- SOT:END -->');
    expect(result).toContain('wf-1');
    const sotIdx = result.indexOf('<!-- SOT:START -->');
    const omcEndIdx = result.indexOf('<!-- OMC:END -->');
    expect(sotIdx).toBeGreaterThan(omcEndIdx);
  });

  it('replaces existing SOT block (idempotent)', () => {
    const input = '# Project\n<!-- OMC:END -->\n\n<!-- SOT:START -->\nold\n<!-- SOT:END -->\n';
    const result = injectSotBlock(input, mockSkills);
    expect(result).toContain('wf-1');
    expect(result).not.toContain('old');
    const count = (result.match(/<!-- SOT:START -->/g) || []).length;
    expect(count).toBe(1);
  });

  it('appends to end when no OMC block', () => {
    const input = '# Project\nNo OMC here.\n';
    const result = injectSotBlock(input, mockSkills);
    expect(result).toContain('<!-- SOT:START -->');
  });
});

describe('removeSotBlock', () => {
  it('removes SOT block cleanly', () => {
    const input = '# Project\n<!-- SOT:START -->\ncontent\n<!-- SOT:END -->\nMore text\n';
    const result = removeSotBlock(input);
    expect(result).not.toContain('<!-- SOT:START -->');
    expect(result).toContain('More text');
  });

  it('returns unchanged content when no SOT block', () => {
    const input = '# Project\nNo SOT here.\n';
    const result = removeSotBlock(input);
    expect(result).toBe(input);
  });
});
```

- [ ] **Step 3: 运行测试**

Run: `npx vitest run test/core/claude-md-injector.test.ts`
Expected: 5 tests PASS

- [ ] **Step 4: 提交**

```bash
git add src/core/claude-md-injector.ts test/core/claude-md-injector.test.ts
git commit -m "feat: add CLAUDE.md SOT block injector for OMC"
```

---

## Task 5: `sot doctor` 子命令

**Files**:
- Create: `src/commands/doctor.ts`
- Test: `test/commands/doctor.test.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: 实现 doctor 命令**

```typescript
// src/commands/doctor.ts
import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { detectOmc } from '../core/omc-detector.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { VERSION } from '../core/config.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolvePackageRoot } from '../utils/paths.js';

interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

export const doctorCommand = new Command('doctor')
  .description('Check OMC integration health')
  .option('--json', 'Output in JSON format')
  .action((options: { json?: boolean }) => {
    const projectRoot = resolvePackageRoot();
    const skillsDir = path.join(projectRoot, 'skills');
    const checks: DoctorCheck[] = [];

    // Check 1: OMC installation
    const omcResult = detectOmc(projectRoot);
    if (omcResult.available) {
      checks.push({
        name: 'OMC Installation',
        status: 'ok',
        message: `Detected via ${omcResult.detectionMethod}${omcResult.version ? ` (v${omcResult.version})` : ''}`,
      });
    } else {
      checks.push({
        name: 'OMC Installation',
        status: 'fail',
        message: 'OMC not detected. Install: https://github.com/user/oh-my-claudecode',
      });
    }

    // Check 2: .omc/skills/ skill count
    const sourceSkills = parseAllSkills(skillsDir);
    const omcSkillsDir = path.join(projectRoot, '.omc', 'skills');
    let installedCount = 0;
    if (fs.existsSync(omcSkillsDir)) {
      installedCount = fs.readdirSync(omcSkillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && fs.existsSync(path.join(omcSkillsDir, d.name, 'SKILL.md')))
        .length;
    }
    if (installedCount === sourceSkills.length && installedCount > 0) {
      checks.push({ name: 'Skill Sync', status: 'ok', message: `${installedCount}/${sourceSkills.length} skills installed` });
    } else if (installedCount > 0) {
      checks.push({ name: 'Skill Sync', status: 'warn', message: `${installedCount}/${sourceSkills.length} skills installed, run sot init to sync` });
    } else {
      checks.push({ name: 'Skill Sync', status: 'fail', message: 'No sot skills in .omc/skills/, run sot init' });
    }

    // Check 3: CLAUDE.md SOT block
    const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      if (content.includes('<!-- SOT:START -->')) {
        checks.push({ name: 'CLAUDE.md SOT Block', status: 'ok', message: 'SOT block present' });
      } else {
        checks.push({ name: 'CLAUDE.md SOT Block', status: 'warn', message: 'No SOT block, run sot init with OMC' });
      }
    } else {
      checks.push({ name: 'CLAUDE.md SOT Block', status: 'fail', message: 'CLAUDE.md not found' });
    }

    // Check 4: sot-registry.json
    const registryPath = path.join(projectRoot, '.omc', 'skills', 'sot-registry.json');
    if (fs.existsSync(registryPath)) {
      try {
        const reg = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
        if (reg.version === VERSION) {
          checks.push({ name: 'Registry Version', status: 'ok', message: `v${reg.version} matches sot@${VERSION}` });
        } else {
          checks.push({ name: 'Registry Version', status: 'warn', message: `v${reg.version} vs sot@${VERSION}, run sot init` });
        }
      } catch {
        checks.push({ name: 'Registry Version', status: 'fail', message: 'sot-registry.json is invalid JSON' });
      }
    } else {
      checks.push({ name: 'Registry Version', status: 'fail', message: 'sot-registry.json not found, run sot init' });
    }

    // Check 5: MCP server registration (global)
    if (omcResult.globalInstall) {
      checks.push({ name: 'MCP Registration', status: 'ok', message: `OMC MCP server '${omcResult.mcpServerName}' registered` });
    } else if (omcResult.projectLocal) {
      checks.push({ name: 'MCP Registration', status: 'warn', message: 'Project-local OMC, no global MCP registration' });
    } else {
      checks.push({ name: 'MCP Registration', status: 'fail', message: 'No OMC MCP server registered globally' });
    }

    // Output
    if (options.json) {
      console.log(formatJsonOutput({
        omcDetected: omcResult.available,
        checks,
        summary: {
          ok: checks.filter(c => c.status === 'ok').length,
          warn: checks.filter(c => c.status === 'warn').length,
          fail: checks.filter(c => c.status === 'fail').length,
        },
      }));
      return;
    }

    for (const check of checks) {
      const icon = check.status === 'ok' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
      console.log(`  ${icon} ${chalk.bold(check.name)}: ${check.message}`);
    }
    console.log('');
  });
```

- [ ] **Step 2: 注册 doctor 命令**

在 `src/cli/index.ts` 添加：

```typescript
import { doctorCommand } from '../commands/doctor.js';
program.addCommand(doctorCommand);
```

- [ ] **Step 3: 写 doctor 测试**

```typescript
// test/commands/doctor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('sot doctor', () => {
  it('should show doctor output', () => {
    const output = execSync(`node ${cliPath} doctor`, { encoding: 'utf-8' });
    expect(output).toContain('OMC Installation');
    expect(output).toContain('Skill Sync');
  });

  it('should support --json output', () => {
    const output = execSync(`node ${cliPath} doctor --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('checks');
    expect(parsed).toHaveProperty('summary');
  });
});
```

- [ ] **Step 4: 运行构建和测试**

Run: `npm run build && npx vitest run test/commands/doctor.test.ts`
Expected: 2 tests PASS

- [ ] **Step 5: 提交**

```bash
git add src/commands/doctor.ts src/cli/index.ts test/commands/doctor.test.ts
git commit -m "feat: add sot doctor command for OMC diagnostics"
```

---

## Task 6: MCP 工具描述增强

**Files**:
- Modify: `src/mcp/server.ts`

- [ ] **Step 1: 在 MCP server 中检测 OMC 并增强工具描述**

在 `createSotServer` 函数中：

```typescript
import { detectOmc } from '../core/omc-detector.js';

export function createSotServer(projectRoot: string) {
  const omcResult = detectOmc(projectRoot);
  const omcHint = omcResult.available;

  // 在工具定义中条件性添加互补提示
  const tools = {
    sot_list_skills: {
      description: `List all available skills with metadata.${omcHint ? ' Complements OMC\'s list_omc_skills with sot-specific metadata (phases, model_hint).' : ''}`,
      // ... rest of tool definition
    },
    sot_query_memory: {
      description: `Query .superpowers-memory/ files.${omcHint ? ' Complements OMC\'s project_memory_read by reading the sot memory format.' : ''}`,
      // ...
    },
    sot_workflow_status: {
      description: `Get workflow execution status.${omcHint ? ' Complements OMC\'s state_read with workflow-specific status tracking.' : ''}`,
      // ...
    },
  };
  // ... rest of server creation
}
```

- [ ] **Step 2: 运行构建和 MCP 测试**

Run: `npm run build && npx vitest run test/mcp/server.test.ts`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/mcp/server.ts
git commit -m "feat: enhance MCP tool descriptions with OMC complement hints"
```

---

## Task 7: 版本更新和集成测试

**Files**:
- Modify: `package.json`
- Modify: `src/core/config.ts`
- Modify: `src/cli/index.ts`
- Modify: `CHANGELOG.md`
- Modify: `test/cli/index.test.ts`

- [ ] **Step 1: 更新版本号到 2.5.0**

在 `package.json`、`src/core/config.ts`、`src/cli/index.ts` 中更新 VERSION。

- [ ] **Step 2: 更新 CHANGELOG**

```markdown
## [2.5.0] - 2026-04-27

### Added

- OmcAdapter: install skills to .omc/skills/ for OMC discovery
- OMC detection module (project-local and global)
- `sot init` auto-detects OMC and dual-installs to .omc/skills/
- CLAUDE.md SOT block injection after OMC block
- `sot doctor` command for OMC integration health check
- MCP tool descriptions enhanced with OMC complement hints
```

- [ ] **Step 3: 更新 CLI 版本测试**

`test/cli/index.test.ts` 期望版本改为 `'2.5.0'`。

- [ ] **Step 4: 运行完整测试套件**

Run: `npm run build && npx vitest run`
Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add package.json src/core/config.ts src/cli/index.ts CHANGELOG.md test/cli/index.test.ts
git commit -m "chore: bump version to 2.5.0 with OMC integration"
```
