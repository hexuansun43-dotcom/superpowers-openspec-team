import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { parseAllSkills } from '../core/schema/parser.js';
import { detectOmc } from '../core/omc-detector.js';
import { logger } from '../utils/logger.js';
import type { SkillDefinition, SkillIndexEntry } from '../core/schema/types.js';

export function createSotServer(projectRoot: string): McpServer {
  const server = new McpServer({
    name: 'sot',
    version: '2.5.0',
  });

  const skillsDir = path.join(projectRoot, 'skills');
  const skills = fs.existsSync(skillsDir) ? parseAllSkills(skillsDir) : [];

  // OMC detection for complement hints
  const omcDetected = detectOmc(projectRoot).available;
  const omcHint = omcDetected ? ' (OMC detected: skills also available via .omc/skills/)' : '';

  // Tool: sot_list_skills
  server.tool('sot_list_skills', `List all available skills with metadata${omcHint}`, {}, async () => {
    const entries: SkillIndexEntry[] = skills.map(buildIndexEntry);
    return { content: [{ type: 'text', text: JSON.stringify(entries, null, 2) }] };
  });

  // Tool: sot_skill_detail
  server.tool(
    'sot_skill_detail',
    'Get full skill content by name',
    { name: z.string().describe('Skill name') },
    async ({ name }) => {
      const skill = skills.find((s) => s.name === name);
      if (!skill) return { content: [{ type: 'text', text: `Skill not found: ${name}` }], isError: true };
      return { content: [{ type: 'text', text: skill.content }] };
    }
  );

  // Tool: sot_skill_phases
  server.tool(
    'sot_skill_phases',
    'Get phases and model routing for a skill',
    { name: z.string().describe('Skill name') },
    async ({ name }) => {
      const skill = skills.find((s) => s.name === name);
      if (!skill) return { content: [{ type: 'text', text: `Skill not found: ${name}` }], isError: true };
      const phases = (skill.metadata as any)?.phases || [];
      return { content: [{ type: 'text', text: JSON.stringify(phases, null, 2) }] };
    }
  );

  // Tool: sot_check_dependencies
  server.tool(
    'sot_check_dependencies',
    'Check if skill dependencies are satisfied',
    { name: z.string().describe('Skill name') },
    async ({ name }) => {
      const skill = skills.find((s) => s.name === name);
      if (!skill) return { content: [{ type: 'text', text: `Skill not found: ${name}` }], isError: true };
      const deps = skill.dependencies || [];
      const external = skill.metadata?.dependencies?.external_skills || [];
      const result = {
        skill: name,
        skill_dependencies: deps,
        external_dependencies: external,
      };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Tool: sot_query_memory
  server.tool(
    'sot_query_memory',
    'Search project memory files' + omcHint,
    { type: z.string().optional().describe('Memory file type (e.g. decisions, known-failures)'), query: z.string().optional().describe('Search query') },
    async ({ type, query }) => {
      const memDir = path.join(projectRoot, '.superpowers-memory');
      if (!fs.existsSync(memDir)) {
        return { content: [{ type: 'text', text: 'No .superpowers-memory/ directory found' }] };
      }
      const files = walkDir(memDir);
      let matches = files;
      if (type) {
        const typeLower = type.toLowerCase().replace(/[-_]/g, '-');
        matches = matches.filter((f) => path.basename(f).toLowerCase().includes(typeLower));
      }
      if (query) {
        const qLower = query.toLowerCase();
        matches = matches.filter((f) => {
          const content = fs.readFileSync(f, 'utf-8').toLowerCase();
          return content.includes(qLower);
        });
      }
      const result = matches.map((f) => path.relative(memDir, f).replace(/\\/g, '/'));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  // Tool: sot_workflow_status
  server.tool(
    'sot_workflow_status',
    'Check which workflow deliverables exist' + omcHint,
    { skill: z.string().describe('Skill name'), change: z.string().optional().describe('OpenSpec change name') },
    async ({ skill, change }) => {
      const skillDef = skills.find((s) => s.name === skill);
      if (!skillDef) return { content: [{ type: 'text', text: `Skill not found: ${skill}` }], isError: true };
      const outputs = skillDef.metadata?.outputs || skillDef.frontmatter.outputs || [];
      const status: Record<string, boolean> = {};
      for (const output of outputs) {
        let resolved = output.replace('<change-name>', change || 'unknown');
        const fullPath = path.join(projectRoot, resolved);
        status[resolved] = fs.existsSync(fullPath);
      }
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
    }
  );

  return server;
}

function buildIndexEntry(skill: SkillDefinition): SkillIndexEntry {
  return {
    name: skill.name,
    description: skill.description,
    'argument-hint': skill.frontmatter['argument-hint'],
    type: skill.type,
    triggers: skill.frontmatter.triggers || skill.metadata?.activation?.triggers,
    model_hint: skill.frontmatter.model_hint || (skill.metadata as any)?.model_hint,
    tags: skill.frontmatter.tags || (skill.metadata as any)?.tags,
    category: skill.frontmatter.category || (skill.metadata as any)?.category,
    skill_path: `.claude/skills/${skill.name}/SKILL.md`,
  };
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
