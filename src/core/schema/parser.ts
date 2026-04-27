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
  const dependencies = frontmatter.dependencies?.workflows || metadata?.dependencies?.workflows || [];

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
