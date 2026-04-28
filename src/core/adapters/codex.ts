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
    const hint = skill.frontmatter.model_hint || skill.metadata?.model_hint;
    const hintComment = hint ? `<!-- model_hint: ${hint} -->\n` : '';
    const content = this.addGeneratedByMarker(hintComment + skill.content);
    return [this.createGeneratedFile(skillPath, content)];
  }

  generateCommands(_skill: SkillDefinition, _targetRoot: string): GeneratedFile[] {
    return [];
  }

  generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[] {
    const skillList = skills.map((s) => `- ${s.name}: ${s.description}`).join('\n');
    const content = this.buildAgentsMd(skillList);
    const manifest = skills.map(s => ({
      name: s.name,
      model_hint: s.frontmatter.model_hint || s.metadata?.model_hint || 'sonnet',
    }));
    const manifestContent = JSON.stringify(manifest, null, 2);
    return [
      this.createGeneratedFile('AGENTS.md.sot-snippet', content, true),
      this.createGeneratedFile('manifest.json', manifestContent, true),
    ];
  }

  private buildAgentsMd(skillList: string): string {
    return this.addGeneratedByMarker(`\n<!-- SOT:START -->\n<!-- SOT:END -->\n\n## Skills\n\n${skillList}\n\nLoad skills from .codex/skills/\n`);
  }
}
