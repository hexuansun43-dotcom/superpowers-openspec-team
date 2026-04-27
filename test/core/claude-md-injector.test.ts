import { describe, it, expect } from 'vitest';
import { injectSotBlock, removeSotBlock } from '../../src/core/claude-md-injector.js';
import type { SkillDefinition } from '../../src/core/schema/types.js';

const mockSkills: SkillDefinition[] = [
  {
    name: 'superpowers-openspec-execution-workflow',
    description: 'Main execution workflow',
    content: 'skill content',
    frontmatter: { name: 'superpowers-openspec-execution-workflow', description: 'Main execution workflow', type: 'orchestrator' },
    type: 'orchestrator',
    standalone: true,
    dependencies: [],
  },
];

describe('claude-md-injector', () => {
  it('should append SOT block when no markers exist', () => {
    const content = '# My Project\n\nSome content.\n';
    const result = injectSotBlock(content, mockSkills);
    expect(result).toContain('<!-- SOT:START -->');
    expect(result).toContain('<!-- SOT:END -->');
    expect(result).toContain('superpowers-openspec-execution-workflow');
    expect(result).toContain('# My Project');
  });

  it('should replace existing SOT block', () => {
    const content = '# My Project\n\n<!-- SOT:START -->\nOld content\n<!-- SOT:END -->\n\nOther stuff\n';
    const result = injectSotBlock(content, mockSkills);
    expect(result).toContain('<!-- SOT:START -->');
    expect(result).toContain('superpowers-openspec-execution-workflow');
    expect(result).not.toContain('Old content');
    expect(result).toContain('Other stuff');
  });

  it('should insert after OMC:END marker', () => {
    const content = '# My Project\n\n<!-- OMC:END -->\n\nSome content\n';
    const result = injectSotBlock(content, mockSkills);
    const omcEndIdx = result.indexOf('<!-- OMC:END -->');
    const sotStartIdx = result.indexOf('<!-- SOT:START -->');
    expect(sotStartIdx).toBeGreaterThan(omcEndIdx);
  });

  it('should remove SOT block cleanly', () => {
    const content = '# My Project\n\n<!-- SOT:START -->\n<!-- generatedBy: sot@2.5.0 -->\n## Skills\n\n- test\n\n<!-- SOT:END -->\n\nFooter\n';
    const result = removeSotBlock(content);
    expect(result).not.toContain('<!-- SOT:START -->');
    expect(result).not.toContain('<!-- SOT:END -->');
    expect(result).toContain('Footer');
  });

  it('should return content unchanged when no SOT block exists', () => {
    const content = '# My Project\n\nNo markers here.\n';
    const result = removeSotBlock(content);
    expect(result.trim()).toBe(content.trim());
  });
});
