import path from 'path';
import fs from 'fs';
import { logger } from '../../utils/logger.js';
import type { ToolAdapter, SkillDefinition, GeneratedFile } from '../schema/types.js';
import { VERSION } from '../config.js';

export abstract class BaseAdapter implements ToolAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly skillsDir: string;
  abstract readonly detectionPaths: string[];

  abstract generateSkill(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  abstract generateCommands(skill: SkillDefinition, targetRoot: string): GeneratedFile[];
  abstract generateConfig(skills: SkillDefinition[], targetRoot: string): GeneratedFile[];

  detect(projectRoot: string): boolean {
    return this.detectionPaths.some((p) => {
      const fullPath = path.join(projectRoot, p);
      return fs.existsSync(fullPath);
    });
  }

  protected addGeneratedByMarker(content: string, format: 'md' | 'yaml' | 'json' = 'md'): string {
    const marker = `generatedBy: sot@${VERSION}`;
    if (format === 'json') {
      return content;
    }
    if (format === 'yaml') {
      return `${content}\n${marker}`;
    }
    return `<!-- ${marker} -->\n${content}`;
  }

  protected createGeneratedFile(
    relativePath: string,
    content: string,
    overwrite: boolean = false
  ): GeneratedFile {
    return {
      path: relativePath.replace(/\\/g, '/'),
      content,
      overwrite,
      generatedBy: `sot@${VERSION}`,
    };
  }
}
