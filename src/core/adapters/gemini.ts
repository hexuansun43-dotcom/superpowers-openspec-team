import { BaseAdapter } from './base.js';
import type { SkillDefinition, GeneratedFile } from '../schema/types.js';

export class GeminiAdapter extends BaseAdapter {
  readonly id = 'gemini';
  readonly name = 'Gemini CLI';
  readonly skillsDir = '';
  readonly detectionPaths = ['GEMINI.md', 'gemini-extension.json'];

  generateSkill(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[] {
    const content = this.buildGeminiMd(skill);
    return [this.createGeneratedFile('GEMINI.md', content)];
  }

  generateConfig(_skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    return [this.createGeneratedFile('gemini-extension.json', this.buildExtensionJson())];
  }

  private buildGeminiMd(skill: SkillDefinition): string {
    return this.addGeneratedByMarker(`# ${skill.name}\n\n${skill.description}\n\n---\n\n${skill.content}\n`);
  }

  private buildExtensionJson(): string {
    return JSON.stringify(
      {
        name: 'superpowers-openspec',
        version: '2.0.0',
        contextFileName: 'GEMINI.md',
      },
      null,
      2
    );
  }
}
