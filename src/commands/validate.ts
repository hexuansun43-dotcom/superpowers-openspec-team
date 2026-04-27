import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { detectInstalledTools } from '../core/installer/installer.js';
import { computeChecksum, verifyChecksum } from '../utils/checksum.js';
import { logger, formatJsonOutput } from '../utils/logger.js';

const GENERATED_BY_MARKER = 'generatedBy: sot@';
const SOT_MARKER_RGX = /<!-- SOT:START[\s\S]*?SOT:END -->/;
const SOT_MARKER_JSON_RGX = /"generatedBy":\s*"sot@[^"]+"/;
const DATE_FORMAT_RGX = /\d{4}-\d{2}-\d{2}/;
const CHECKSUM_RGX = /<!-- checksum: (sha256:[a-f0-9]+) -->/;

function hasGeneratedByMarker(content: string): boolean {
  return content.includes(GENERATED_BY_MARKER) ||
    SOT_MARKER_RGX.test(content) ||
    SOT_MARKER_JSON_RGX.test(content);
}

function extractChecksum(content: string): string | null {
  const match = content.match(CHECKSUM_RGX);
  return match ? match[1] : null;
}

function stripChecksumLine(content: string): string {
  return content.replace(/\n?<!-- checksum: sha256:[a-f0-9]+ -->$/, '');
}

function validateMemoryDates(projectRoot: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const memoryDir = path.join(projectRoot, '.superpowers-memory');

  if (!fs.existsSync(memoryDir)) {
    return { valid: true, issues: [] };
  }

  const entries = fs.readdirSync(memoryDir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(entry.parentPath ?? path.dirname(entry.name), entry.name);
    if (!fullPath.endsWith('.md') && !fullPath.endsWith('.yaml')) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const dateMatches = content.match(new RegExp(DATE_FORMAT_RGX.source, 'g'));
      if (dateMatches) {
        for (const dateStr of dateMatches) {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            issues.push(`${path.relative(projectRoot, fullPath)}: invalid date "${dateStr}"`);
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return { valid: issues.length === 0, issues };
}

interface ValidationResult {
  generatedByOk: boolean;
  checksumOk: boolean;
  toolsDetected: string[];
  memoryValid: boolean;
  memoryIssues: string[];
  fileIssues: string[];
}

function validateProject(projectRoot: string): ValidationResult {
  const result: ValidationResult = {
    generatedByOk: true,
    checksumOk: true,
    toolsDetected: detectInstalledTools(projectRoot),
    memoryValid: true,
    memoryIssues: [],
    fileIssues: [],
  };

  // Check all installed files for generatedBy markers and checksums
  const dirsToCheck = ['.claude', '.cursor', '.codex', '.omc'];
  for (const dir of dirsToCheck) {
    const dirPath = path.join(projectRoot, dir);
    if (!fs.existsSync(dirPath)) continue;

    const entries = walkDir(dirPath);
    for (const entry of entries) {
      try {
        const content = fs.readFileSync(entry, 'utf-8');

        // Check generatedBy marker
        if (!hasGeneratedByMarker(content)) {
          result.generatedByOk = false;
          result.fileIssues.push(`${path.relative(projectRoot, entry)}: missing generatedBy marker`);
        }

        // Verify checksum
        const storedChecksum = extractChecksum(content);
        if (storedChecksum) {
          const contentWithoutChecksum = stripChecksumLine(content);
          if (!verifyChecksum(contentWithoutChecksum, storedChecksum)) {
            result.checksumOk = false;
            result.fileIssues.push(`${path.relative(projectRoot, entry)}: checksum mismatch`);
          }
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  // Check GEMINI.md and AGENTS.md at root level
  const rootFiles = ['GEMINI.md', 'AGENTS.md', 'CLAUDE.md', 'gemini-extension.json'];
  for (const file of rootFiles) {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (!hasGeneratedByMarker(content)) {
        result.generatedByOk = false;
        result.fileIssues.push(`${file}: missing generatedBy marker`);
      }

      const storedChecksum = extractChecksum(content);
      if (storedChecksum) {
        const contentWithoutChecksum = stripChecksumLine(content);
        if (!verifyChecksum(contentWithoutChecksum, storedChecksum)) {
          result.checksumOk = false;
          result.fileIssues.push(`${file}: checksum mismatch`);
        }
      }
    } catch {
      // Skip
    }
  }

  // Validate memory dates
  const memResult = validateMemoryDates(projectRoot);
  result.memoryValid = memResult.valid;
  result.memoryIssues = memResult.issues;

  return result;
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

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

export const validateCommand = new Command('validate')
  .description('Validate installation integrity')
  .argument('[path]', 'Project path', '.')
  .option('--json', 'Output in JSON format')
  .action(async (projectPath: string, options: { json?: boolean }) => {
    const projectRoot = path.resolve(projectPath);
    const result = validateProject(projectRoot);

    if (options.json) {
      console.log(formatJsonOutput({
        valid: result.generatedByOk && result.checksumOk && result.memoryValid,
        generatedByOk: result.generatedByOk,
        checksumOk: result.checksumOk,
        toolsDetected: result.toolsDetected,
        memoryValid: result.memoryValid,
        memoryIssues: result.memoryIssues,
        fileIssues: result.fileIssues,
      }));
      return;
    }

    logger.info(`Detected tools: ${result.toolsDetected.length > 0 ? result.toolsDetected.join(', ') : 'none'}`);

    if (result.generatedByOk) {
      logger.success('All files have generatedBy markers');
    } else {
      logger.error('Some files are missing generatedBy markers');
      for (const issue of result.fileIssues.filter((i) => i.includes('generatedBy'))) {
        logger.error(`  ${issue}`);
      }
    }

    if (result.checksumOk) {
      logger.success('All checksums verified');
    } else {
      logger.error('Checksum mismatches detected');
      for (const issue of result.fileIssues.filter((i) => i.includes('checksum'))) {
        logger.error(`  ${issue}`);
      }
    }

    if (result.memoryValid) {
      logger.success('Memory date format valid');
    } else {
      logger.error('Invalid date format in memory files (expected YYYY-MM-DD)');
      for (const issue of result.memoryIssues) {
        logger.error(`  ${issue}`);
      }
    }

    const allValid = result.generatedByOk && result.checksumOk && result.memoryValid;
    if (!allValid) {
      process.exit(1);
    }
  });
