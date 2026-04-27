import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { OmcAdapter } from '../core/adapters/omc.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { installFiles, detectInstalledTools } from '../core/installer/installer.js';
import { TOOL_REGISTRY } from '../core/config.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import type { ToolAdapter } from '../core/schema/types.js';
import type { GeneratedFile } from '../core/schema/types.js';

const ADAPTERS: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
  new OmcAdapter(),
];

function getAdapterById(id: string): ToolAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}

function resolveSkillsDir(projectRoot: string): string {
  // Look for skills/ in project root, then fall back to package's own skills/
  const localSkills = path.join(projectRoot, 'skills');
  if (fs.existsSync(localSkills)) return localSkills;

  // Walk up to find skills/ directory
  let current = projectRoot;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(current, 'skills');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Fall back to package's own skills directory
  const packageSkills = path.resolve(process.cwd(), 'skills');
  return packageSkills;
}

async function installMemoryTemplate(projectRoot: string, options: { dryRun?: boolean; backup?: boolean; force?: boolean }) {
  const templateDir = path.resolve(process.cwd(), 'templates/superpowers-memory');
  if (!fs.existsSync(templateDir)) {
    logger.warn('Memory template directory not found, skipping memory installation');
    return { filesWritten: [] as string[], errors: [] as string[] };
  }

  const memoryFiles: GeneratedFile[] = [];
  const entries = walkDir(templateDir);
  for (const entry of entries) {
    const relativePath = path.relative(templateDir, entry).replace(/\\/g, '/');
    const content = fs.readFileSync(entry, 'utf-8');
    const targetRelPath = `.superpowers-memory/${relativePath}`;
    memoryFiles.push({
      path: targetRelPath,
      content,
      overwrite: true,
      generatedBy: 'sot@2.0.0',
    });
  }

  return installFiles(memoryFiles, projectRoot, options);
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

export const initCommand = new Command('init')
  .description('Initialize skills in a project')
  .argument('[path]', 'Project path', '.')
  .option('--tool <tools>', 'Target tools (comma-separated)')
  .option('--dry-run', 'Preview changes without writing')
  .option('--force', 'Skip confirmation prompts')
  .option('--backup', 'Backup existing files before overwriting')
  .option('--with-memory', 'Install .superpowers-memory/ template')
  .option('--json', 'Output in JSON format')
  .action(async (projectPath: string, options: {
    tool?: string;
    dryRun?: boolean;
    force?: boolean;
    backup?: boolean;
    withMemory?: boolean;
    json?: boolean;
  }) => {
    const projectRoot = path.resolve(projectPath);
    const skillsDir = resolveSkillsDir(projectRoot);

    // Parse all skills
    const skills = parseAllSkills(skillsDir);
    if (skills.length === 0) {
      logger.error(`No skills found in ${skillsDir}`);
      process.exit(1);
    }

    logger.info(`Found ${skills.length} skill(s) in ${skillsDir}`);

    // Detect or select tools
    let selectedToolIds: string[];
    if (options.tool) {
      selectedToolIds = options.tool.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      const detected = detectInstalledTools(projectRoot);
      if (detected.length > 0) {
        logger.info(`Detected tools: ${detected.join(', ')}`);
      }

      if (options.force || detected.length === 0) {
        // If no tools detected or --force, prompt for selection
        const available = Object.keys(TOOL_REGISTRY);
        if (options.force) {
          // Auto-select all detected when --force is used
          selectedToolIds = detected.length > 0 ? detected : available;
        } else {
          const answers = await inquirer.prompt([{
            type: 'checkbox',
            name: 'tools',
            message: 'Select target tools:',
            choices: available.map((id) => ({
              name: `${TOOL_REGISTRY[id].name} (${id})`,
              value: id,
              checked: detected.includes(id),
            })),
          }]);
          selectedToolIds = answers.tools;
        }
      } else {
        selectedToolIds = detected;
      }
    }

    if (selectedToolIds.length === 0) {
      logger.error('No tools selected');
      process.exit(1);
    }

    logger.info(`Target tools: ${selectedToolIds.join(', ')}`);

    // Generate files for each selected tool
    const allFiles: GeneratedFile[] = [];
    for (const toolId of selectedToolIds) {
      const adapter = getAdapterById(toolId);
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

    // Install memory template if requested
    let memoryResult = { filesWritten: [] as string[], errors: [] as string[] };
    if (options.withMemory) {
      memoryResult = await installMemoryTemplate(projectRoot, {
        dryRun: options.dryRun,
        backup: options.backup,
        force: options.force,
      });
    }

    // Install all generated files
    const result = await installFiles(allFiles, projectRoot, {
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force,
    });

    if (options.json) {
      console.log(formatJsonOutput({
        success: result.success,
        tools: selectedToolIds,
        skillsCount: skills.length,
        filesWritten: [...result.filesWritten, ...memoryResult.filesWritten],
        filesBackedUp: result.filesBackedUp,
        errors: [...result.errors, ...memoryResult.errors],
        warnings: result.warnings,
        dryRun: options.dryRun,
      }));
      return;
    }

    if (result.success) {
      logger.success(`Initialized ${result.filesWritten.length} file(s) for ${selectedToolIds.length} tool(s)`);
    } else {
      logger.error(`Initialization completed with ${result.errors.length} error(s)`);
      for (const err of result.errors) {
        logger.error(`  ${err}`);
      }
    }

    for (const w of result.warnings) {
      logger.warn(`  ${w}`);
    }

    if (options.dryRun) {
      logger.info('(dry-run: no files were written)');
    }
  });
