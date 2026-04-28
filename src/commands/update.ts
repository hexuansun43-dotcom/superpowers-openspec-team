import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { OmcAdapter } from '../core/adapters/omc.js';
import { detectOmc } from '../core/omc-detector.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { installFiles, detectInstalledTools } from '../core/installer/installer.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolveSkillsDir } from '../utils/paths.js';
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

const GENERATED_BY_MARKER = 'generatedBy: sot@';
const SOT_MARKER_RGX = /<!-- SOT:START[\s\S]*?SOT:END -->/;
const SOT_MARKER_JSON_RGX = /"generatedBy":\s*"sot@[^"]+"/;

function hasGeneratedByMarker(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes(GENERATED_BY_MARKER) ||
    SOT_MARKER_RGX.test(content) ||
    SOT_MARKER_JSON_RGX.test(content);
}

export const updateCommand = new Command('update')
  .description('Update installed skills')
  .argument('[path]', 'Project path', '.')
  .option('--dry-run', 'Preview changes without writing')
  .option('--force', 'Skip confirmation prompts')
  .option('--backup', 'Backup existing files before overwriting')
  .option('--json', 'Output in JSON format')
  .action(async (projectPath: string, options: {
    dryRun?: boolean;
    force?: boolean;
    backup?: boolean;
    json?: boolean;
  }) => {
    const projectRoot = path.resolve(projectPath);
    const skillsDir = resolveSkillsDir(projectRoot);

    const skills = parseAllSkills(skillsDir);
    if (skills.length === 0) {
      logger.error(`No skills found in ${skillsDir}`);
      process.exit(1);
    }

    logger.info(`Found ${skills.length} skill(s) in ${skillsDir}`);

    // Only update tools that are already detected as installed
    const detectedTools = detectInstalledTools(projectRoot);
    if (detectedTools.length === 0) {
      logger.warn('No installed tools detected. Run `sot init` first.');
      return;
    }

    logger.info(`Detected installed tools: ${detectedTools.join(', ')}`);

    // OMC auto-detection: add omc tool when OMC is installed
    const omcResult = detectOmc(projectRoot);
    if (omcResult.available && !detectedTools.includes('omc')) {
      detectedTools.push('omc');
      logger.info('OMC detected — skills will also be updated in .omc/skills/');
    }

    // Generate files for detected tools
    const allFiles: GeneratedFile[] = [];
    for (const toolId of detectedTools) {
      const adapter = getAdapterById(toolId);
      if (!adapter) {
        logger.warn(`Unknown tool: ${toolId}`);
        continue;
      }

      for (const skill of skills) {
        const skillFiles = adapter.generateSkill(skill, projectRoot);
        const commandFiles = adapter.generateCommands(skill, projectRoot);
        allFiles.push(...skillFiles, ...commandFiles);
      }
      allFiles.push(...adapter.generateConfig(skills, projectRoot));
    }

    // Filter: only update files that have the generatedBy marker
    // (files without the marker were manually edited and should not be overwritten)
    const updatableFiles = allFiles.filter((file) => {
      if (file.overwrite) return true; // Config/metadata files always update
      const targetPath = path.join(projectRoot, file.path);
      if (!fs.existsSync(targetPath)) return true; // New file, safe to create
      return hasGeneratedByMarker(targetPath);
    });

    const skippedCount = allFiles.length - updatableFiles.length;
    if (skippedCount > 0) {
      logger.info(`Skipping ${skippedCount} file(s) without generatedBy marker (manually modified)`);
    }

    const result = await installFiles(updatableFiles, projectRoot, {
      dryRun: options.dryRun,
      backup: options.backup,
      force: options.force,
    });

    if (options.json) {
      console.log(formatJsonOutput({
        success: result.success,
        tools: detectedTools,
        skillsCount: skills.length,
        filesWritten: result.filesWritten,
        filesBackedUp: result.filesBackedUp,
        filesSkipped: skippedCount,
        errors: result.errors,
        warnings: result.warnings,
        dryRun: options.dryRun,
      }));
      return;
    }

    if (result.success) {
      logger.success(`Updated ${result.filesWritten.length} file(s)`);
    } else {
      logger.error(`Update completed with ${result.errors.length} error(s)`);
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
