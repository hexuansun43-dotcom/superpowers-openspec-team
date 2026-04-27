import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class CodexAdapter extends BaseAdapter {
  readonly id = 'codex';
  readonly name = 'OpenAI Codex';
  readonly skillsDir = '.codex/skills';
  readonly detectionPaths = ['.codex/', 'AGENTS.md'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const skillPath = path.join(this.skillsDir, skill.name, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[] {
    const skillList = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    const content = this.buildAgentsMd(skillList);
    return [this.createGeneratedFile('AGENTS.md.sot-snippet', content)];
  }

  private buildAgentsMd(skillList: string): string {
    return this.addGeneratedByMarker(`\n<!-- SOT:START -->\n<!-- SOT:END -->\n\n## Skills\n\n${skillList}\n\nLoad skills from .codex/skills/\n`);
  }
}
