import path from 'path';
import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class OmcAdapter extends BaseAdapter {
  readonly id = 'omc';
  readonly name = 'oh-my-claudecode';
  readonly skillsDir = '.claude/skills';
  readonly detectionPaths = ['.omc/', '.claude/plugins/oh-my-claudecode/'];

  generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const skillPath = path.join(this.skillsDir, skill.name, 'SKILL.md');
    const content = this.addGeneratedByMarker(skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateConfig(_skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    return [];
  }
}
