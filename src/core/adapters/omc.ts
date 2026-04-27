import path from 'path';
import { BaseAdapter } from './base.js';
import { VERSION } from '../config.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class OmcAdapter extends BaseAdapter {
  readonly id = 'omc';
  readonly name = 'OMC (oh-my-claudecode)';
  readonly skillsDir = '.omc/skills';
  readonly detectionPaths = ['.omc/', '.omc/state/', '.omc/notepad.md'];

  generateSkill(skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    const skillDir = path.join(this.skillsDir, skill.name);
    const skillPath = path.join(skillDir, 'SKILL.md');
    const hint = skill.frontmatter.model_hint || skill.metadata?.model_hint;
    const fmLines = [`---`, `name: ${skill.name}`, `description: "${skill.description}"`];
    if (hint) fmLines.push(`model_hint: ${hint}`);
    if (skill.frontmatter.tags?.length) fmLines.push(`tags:\n${skill.frontmatter.tags.map(t => `  - ${t}`).join('\n')}`);
    if (skill.frontmatter.category) fmLines.push(`category: ${skill.frontmatter.category}`);
    fmLines.push(`---`);
    const content = this.addGeneratedByMarker(fmLines.join('\n') + '\n\n' + skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateConfig(skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    const registry = {
      source: 'sot',
      version: VERSION,
      skills: skills.map((s) => ({
        name: s.name,
        description: s.description,
      })),
    };
    const registryPath = path.join(this.skillsDir, 'sot-registry.json');
    return [this.createGeneratedFile(registryPath, JSON.stringify(registry, null, 2))];
  }
}
