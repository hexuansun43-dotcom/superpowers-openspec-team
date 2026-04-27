import { describe, it, expect } from 'vitest';
import { GeminiAdapter } from '../../../src/core/adapters/gemini.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new GeminiAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('GeminiAdapter', () => {
  it('should not generate separate skill files', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files).toHaveLength(0);
  });

  it('should generate GEMINI.md with skill content', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('GEMINI.md');
    expect(files[0].content).toContain('test-workflow');
  });

  it('should generate extension json', () => {
    const files = adapter.generateConfig([], '/tmp');
    expect(files[0].path).toBe('gemini-extension.json');
    const parsed = JSON.parse(files[0].content);
    expect(parsed.contextFileName).toBe('GEMINI.md');
  });
});
