import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import yaml from 'yaml';
import { parseAllSkills } from '../core/schema/parser.js';
import { detectInstalledTools } from '../core/installer/installer.js';
import { TOOL_REGISTRY } from '../core/config.js';
import { logger, formatJsonOutput } from '../utils/logger.js';

function resolveSkillsDir(projectRoot: string): string {
  const localSkills = path.join(projectRoot, 'skills');
  if (fs.existsSync(localSkills)) return localSkills;

  let current = projectRoot;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(current, 'skills');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return path.resolve(process.cwd(), 'skills');
}

export const listCommand = new Command('list')
  .description('List available skills and installed tools')
  .option('--json', 'Output in JSON format')
  .action(async (options: { json?: boolean }) => {
    const projectRoot = process.cwd();
    const skillsDir = resolveSkillsDir(projectRoot);

    // Parse all skills
    const skills = parseAllSkills(skillsDir);

    // Detect installed tools
    const detectedTools = detectInstalledTools(projectRoot);

    if (options.json) {
      console.log(formatJsonOutput({
        skills: skills.map((s) => ({
          name: s.name,
          description: s.description,
          type: s.type,
          standalone: s.standalone,
          dependencies: s.dependencies,
        })),
        installedTools: detectedTools.map((id) => ({
          id,
          name: TOOL_REGISTRY[id]?.name ?? id,
          skillsDir: TOOL_REGISTRY[id]?.skillsDir ?? '',
        })),
      }));
      return;
    }

    // List skills
    if (skills.length > 0) {
      logger.info(`Available skills (${skills.length}):`);
      for (const skill of skills) {
        const deps = skill.dependencies.length > 0 ? ` [deps: ${skill.dependencies.join(', ')}]` : '';
        const type = skill.type === 'orchestrator' ? ' (orchestrator)' : '';
        console.log(`  ${skill.name}${type}: ${skill.description}${deps}`);
      }
    } else {
      logger.warn('No skills found');
    }

    console.log('');

    // List installed tools
    if (detectedTools.length > 0) {
      logger.info(`Installed tools (${detectedTools.length}):`);
      for (const toolId of detectedTools) {
        const info = TOOL_REGISTRY[toolId];
        if (info) {
          console.log(`  ${info.name} (${toolId}) - skills dir: ${info.skillsDir || '(none)'}`);
        } else {
          console.log(`  ${toolId}`);
        }
      }
    } else {
      logger.info('No installed tools detected. Run `sot init` to set up.');
    }
  });
