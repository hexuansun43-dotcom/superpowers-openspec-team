import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { computeChecksum } from '../../utils/checksum.js';
import { validateTargetPath } from './path-validator.js';
import type { GeneratedFile, InstallationResult } from '../schema/types.js';

const GENERATED_BY_MARKER = `generatedBy: sot@`;
const SOT_MARKER_RGX = /<!-- SOT:START[\s\S]*?SOT:END -->/;
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

    const validation = validateTargetPath(targetPath, projectRoot);
    if (!validation.valid) {
      result.errors.push(`${file.path}: ${validation.reason}`);
      result.success = false;
      continue;
    }

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

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      if (!options.dryRun) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
    }

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
  const candidates = ['claude-code', 'cursor', 'codex', 'gemini'];
  const detected: string[] = [];

  for (const tool of candidates) {
    const detectionPaths: Record<string, string[]> = {
      'claude-code': ['.claude/', 'CLAUDE.md', '.omc/', '.claude/plugins/oh-my-claudecode/'],
      cursor: ['.cursor/', '.cursorrules'],
      codex: ['.codex/'],
      gemini: ['GEMINI.md'],
    };

    const paths = detectionPaths[tool] || [];
    const found = paths.some((p) => fs.existsSync(path.join(projectRoot, p)));
    if (found) {
      detected.push(tool);
    }
  }

  return detected;
}
