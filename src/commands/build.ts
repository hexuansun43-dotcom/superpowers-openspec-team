import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { ClaudeCodeAdapter } from '../core/adapters/claude-code.js';
import { CursorAdapter } from '../core/adapters/cursor.js';
import { CodexAdapter } from '../core/adapters/codex.js';
import { GeminiAdapter } from '../core/adapters/gemini.js';
import { parseAllSkills } from '../core/schema/parser.js';
import { computeChecksum } from '../utils/checksum.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolvePackageRoot } from '../utils/paths.js';
import type { ToolAdapter, SkillDefinition } from '../core/schema/types.js';

const ADAPTERS: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
];

interface BundleManifest {
  adapter: string;
  version: string;
  generatedAt: string;
  skills: Array<{
    name: string;
    files: Array<{
      path: string;
      checksum: string;
    }>;
  }>;
}

export const buildCommand = new Command('build')
  .description('Build dist/ from skills/')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    const projectRoot = resolvePackageRoot();
    const skillsDir = path.join(projectRoot, 'skills');
    const distDir = path.join(projectRoot, 'dist');

    // Parse all skills
    const skills = parseAllSkills(skillsDir);
    if (skills.length === 0) {
      logger.error(`No skills found in ${skillsDir}`);
      process.exit(1);
    }

    logger.info(`Found ${skills.length} skill(s) in ${skillsDir}`);

    // Build bundles for each adapter
    const allChecksums: Record<string, string> = {};
    let totalFiles = 0;

    for (const adapter of ADAPTERS) {
      const bundleDir = path.join(distDir, adapter.id, 'bundles', 'superpowers-openspec');
      const manifest: BundleManifest = {
        adapter: adapter.id,
        version: '2.0.9',
        generatedAt: new Date().toISOString(),
        skills: [],
      };

      for (const skill of skills) {
        const skillFiles = adapter.generateSkill(skill, projectRoot);
        const commandFiles = adapter.generateCommands(skill, projectRoot);
        const configFiles = adapter.generateConfig(skills, projectRoot);
        const allGenFiles = [...skillFiles, ...commandFiles, ...configFiles];

        const skillEntry: BundleManifest['skills'][number] = {
          name: skill.name,
          files: [],
        };

        for (const file of allGenFiles) {
          const checksum = computeChecksum(file.content);
          skillEntry.files.push({ path: file.path, checksum });
          allChecksums[file.path] = checksum;

          // Write the file to bundle dir
          const filePath = path.join(bundleDir, file.path);
          const parentDir = path.dirname(filePath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          fs.writeFileSync(filePath, file.content);
          totalFiles++;
        }

        if (skillEntry.files.length > 0) {
          manifest.skills.push(skillEntry);
        }
      }

      // Write manifest.json for this adapter
      if (manifest.skills.length > 0) {
        if (!fs.existsSync(bundleDir)) {
          fs.mkdirSync(bundleDir, { recursive: true });
        }
        const manifestPath = path.join(bundleDir, 'manifest.json');
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        allChecksums[`${adapter.id}/bundles/superpowers-openspec/manifest.json`] = computeChecksum(JSON.stringify(manifest, null, 2));
        totalFiles++;
        logger.success(`Built bundle for ${adapter.name} (${manifest.skills.length} skill(s))`);
      }
    }

    // Write global checksums.json
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    const checksumsPath = path.join(distDir, 'checksums.json');
    fs.writeFileSync(checksumsPath, JSON.stringify(allChecksums, null, 2));
    totalFiles++;

    if (options.json) {
      console.log(formatJsonOutput({
        success: true,
        adapters: ADAPTERS.map((a) => a.id),
        skillsCount: skills.length,
        totalFiles,
        checksumsFile: 'dist/checksums.json',
      }));
      return;
    }

    logger.success(`Built ${totalFiles} file(s) across ${ADAPTERS.length} adapter(s)`);
    logger.info(`Checksums written to dist/checksums.json`);
  });
