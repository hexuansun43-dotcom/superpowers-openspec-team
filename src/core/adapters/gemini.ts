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

  generateConfig(skills: SkillDefinition[], _targetRoot: string): GeneratedFile[] {
    const firstHint = skills[0]?.frontmatter.model_hint || skills[0]?.metadata?.model_hint;
    return [this.createGeneratedFile('gemini-extension.json', this.buildExtensionJson(firstHint))];
  }

  private buildGeminiMd(skill: SkillDefinition): string {
    const hint = skill.frontmatter.model_hint || skill.metadata?.model_hint;
    const hintComment = hint ? `<!-- model_hint: ${hint} -->\n` : '';
    return this.addGeneratedByMarker(`${hintComment}# ${skill.name}\n\n${skill.description}\n\n---\n\n${skill.content}\n`);
  }

  private buildExtensionJson(modelHint?: string): string {
    return JSON.stringify(
      {
        name: 'superpowers-openspec',
        version: '2.4.0',
        contextFileName: 'GEMINI.md',
        ...(modelHint ? { model_hint: modelHint } : {}),
      },
      null,
      2
    );
  }
}
