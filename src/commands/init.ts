import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { OmcAdapter } from '../core/adapters/omc.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { installFiles, detectInstalledTools } from '../core/installer/installer.js';
import { TOOL_REGISTRY } from '../core/config.js';
import { detectOmc } from '../core/omc-detector.js';
import { injectSotBlock } from '../core/claude-md-injector.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolveSkillsDir, resolvePackageRoot } from '../utils/paths.js';
import { interactiveToolSelect } from '../utils/interactive.js';
import type { ToolAdapter, GeneratedFile } from '../core/schema/types.js';

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

async function installMemoryTemplate(projectRoot: string, options: { dryRun?: boolean; backup?: boolean; force?: boolean }) {
  const packageRoot = resolvePackageRoot();
  const templateDir = path.join(packageRoot, 'templates/superpowers-memory');
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
      generatedBy: 'sot@2.0.1',
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

function showWelcome(skillsCount: number) {
  console.log('');
  console.log(chalk.cyan.bold('  Welcome to Superpowers-OpenSpec'));
  console.log(chalk.dim('  A CLI-driven workflow skills framework for AI coding agents'));
  console.log('');
  console.log(chalk.white('  This setup will configure:'));
  console.log(chalk.dim(`    • ${skillsCount} workflow skill(s) for your AI tools`));
  console.log(chalk.dim('    • Tool-specific command files and skill directories'));
  console.log(chalk.dim('    • Optional .superpowers-memory/ for cross-session memory'));
  console.log('');
}

function showQuickStart(selectedToolIds: string[]) {
  console.log('');
  console.log(chalk.cyan.bold('  Quick start after setup:'));
  console.log('');
  console.log(chalk.dim('    sot list              # List available skills'));
  console.log(chalk.dim('    sot update             # Update installed skills'));
  console.log(chalk.dim('    sot validate           # Validate installation'));
  console.log('');
  if (selectedToolIds.includes('claude-code')) {
    console.log(chalk.dim('    /superpowers:superpowers-openspec-execution-workflow'));
    console.log(chalk.dim('                          # Start execution workflow in Claude Code'));
  }
  console.log('');
}

export const initCommand = new Command('init')
  .description('Initialize skills in a project')
  .argument('[path]', 'Project path', '.')
  .option('--tool <tools>', 'Target tools (comma-separated, skip interactive)')
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

    // Skip interactive UI if --json, --tool, or --force
    const isInteractive = !options.json && !options.tool && !options.force;

    if (isInteractive) {
      showWelcome(skills.length);
    }

    // Detect or select tools
    let selectedToolIds: string[];
    if (options.tool) {
      selectedToolIds = options.tool.split(',').map((t) => t.trim()).filter(Boolean);
    } else {
      const detected = detectInstalledTools(projectRoot);

      if (options.force) {
        selectedToolIds = detected.length > 0 ? detected : Object.keys(TOOL_REGISTRY);
      } else if (isInteractive) {
        // Interactive tool selection with search and pre-selection
        selectedToolIds = await interactiveToolSelect(detected);
        if (selectedToolIds.length === 0) {
          logger.error('No tools selected');
          process.exit(1);
        }
      } else {
        // --json mode without --tool: auto-detect
        selectedToolIds = detected.length > 0 ? detected : Object.keys(TOOL_REGISTRY);
      }
    }

    if (!isInteractive) {
      logger.info(`Found ${skills.length} skill(s)`);
      logger.info(`Target tools: ${selectedToolIds.join(', ')}`);
    }

    // OMC auto-detection: add omc tool when OMC is installed
    const omcResult = detectOmc(projectRoot);
    if (omcResult.available && !selectedToolIds.includes('omc')) {
      selectedToolIds.push('omc');
      logger.info('OMC detected — skills will also be installed to .omc/skills/');
    }

    // Generate files for each selected tool
    const spinner = isInteractive ? ora('Generating skill files...').start() : null;
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
      if (spinner) spinner.text = 'Installing memory template...';
      memoryResult = await installMemoryTemplate(projectRoot, {
        dryRun: options.dryRun,
        backup: options.backup,
        force: options.force,
      });
    }

    // Install all generated files
    if (spinner) spinner.text = 'Installing files...';
    const result = await installFiles(allFiles, projectRoot, {
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force,
    });

    // Inject SOT block into CLAUDE.md when OMC is detected
    if (omcResult.available && !options.dryRun) {
      const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
      let claudeMdContent = '';
      if (fs.existsSync(claudeMdPath)) {
        claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8');
      }
      const updated = injectSotBlock(claudeMdContent, skills);
      fs.writeFileSync(claudeMdPath, updated);
      logger.info('Injected SOT skill reference into CLAUDE.md');
    }

    if (spinner) {
      if (result.success) {
        spinner.succeed(chalk.green(`Installed ${result.filesWritten.length} file(s) for ${selectedToolIds.length} tool(s)`));
      } else {
        spinner.fail('Installation completed with errors');
      }
    }

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

    // Show errors/warnings
    for (const err of result.errors) {
      logger.error(`  ${err}`);
    }
    for (const w of result.warnings) {
      logger.warn(`  ${w}`);
    }

    // Interactive: show quick start guide
    if (isInteractive && result.success) {
      showQuickStart(selectedToolIds);
    }

    if (!result.success) {
      process.exit(1);
    }
  });
