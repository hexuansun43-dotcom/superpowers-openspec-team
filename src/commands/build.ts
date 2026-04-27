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
import { computeChecksum } from '../utils/checksum.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolvePackageRoot } from '../utils/paths.js';
import type { ToolAdapter, SkillDefinition, SkillIndexEntry } from '../core/schema/types.js';
import { mapToAgentskills } from '../core/agentskills.js';
import { VERSION } from '../core/config.js';

const ADAPTERS: ToolAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new CodexAdapter(),
  new GeminiAdapter(),
  new OmcAdapter(),
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
  .option('--format <format>', 'Output format: bundle (default), agentskills, all', 'bundle')
  .action(async (options: { json?: boolean; format?: string }) => {
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
      // Degradation gate: skip OMC adapter when OMC is not installed
      if (adapter.id === 'omc' && !detectOmc(projectRoot).available) {
        logger.debug(`Skipping ${adapter.name} — OMC not detected`);
        continue;
      }

      const bundleDir = path.join(distDir, adapter.id, 'bundles', 'superpowers-openspec');
      const manifest: BundleManifest = {
        adapter: adapter.id,
        version: VERSION,
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

      // Generate skill-index.json
      const skillIndex: SkillIndexEntry[] = skills.map((skill) => {
        const skillRelPath = adapter.skillsDir
          ? path.join(adapter.skillsDir, skill.name, 'SKILL.md').replace(/\\/g, '/')
          : '';
        return {
          name: skill.name,
          description: skill.description,
          'argument-hint': skill.frontmatter['argument-hint'],
          type: skill.type,
          triggers: skill.frontmatter.triggers || skill.metadata?.activation?.triggers,
          model_hint: skill.frontmatter.model_hint || skill.metadata?.model_hint,
          tags: skill.frontmatter.tags || skill.metadata?.tags,
          category: skill.frontmatter.category || skill.metadata?.category,
          phases: skill.metadata?.phases,
          skill_path: skillRelPath,
        };
      });

      const indexPath = path.join(distDir, adapter.id, 'skill-index.json');
      if (!fs.existsSync(path.dirname(indexPath))) {
        fs.mkdirSync(path.dirname(indexPath), { recursive: true });
      }
      fs.writeFileSync(indexPath, JSON.stringify(skillIndex, null, 2));
      totalFiles++;
      logger.debug(`Wrote skill-index.json for ${adapter.name}`);
    }

    // Generate agentskills manifests if requested
    if (options.format === 'agentskills' || options.format === 'all') {
      const agentskillsDir = path.join(distDir, 'agentskills');
      if (!fs.existsSync(agentskillsDir)) {
        fs.mkdirSync(agentskillsDir, { recursive: true });
      }

      for (const skill of skills) {
        const manifest = mapToAgentskills(skill, VERSION);
        const manifestPath = path.join(agentskillsDir, `${skill.name}.json`);
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        totalFiles++;
      }
      logger.success(`Built ${skills.length} agentskills manifest(s)`);
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
