import type { SkillDefinition, AgentskillsManifest } from './schema/types.js';

export function mapToAgentskills(skill: SkillDefinition, version: string): AgentskillsManifest {
  const extDeps = skill.metadata?.dependencies?.external_skills || [];
  const phases = skill.metadata?.phases?.map((p) => ({
    name: p.name,
    modelHint: p.model_hint || 'sonnet',
  }));

  return {
    id: skill.name,
    version,
    type: skill.type,
    description: skill.description,
    triggers: skill.frontmatter.triggers || skill.metadata?.activation?.triggers,
    tags: skill.frontmatter.tags || skill.metadata?.tags,
    category: skill.frontmatter.category || skill.metadata?.category,
    phases,
    dependencies: extDeps,
    outputs: skill.metadata?.outputs || skill.frontmatter.outputs,
    instructions: skill.content,
  };
}
