import { describe, it, expect } from 'vitest';
import { ClaudeCodeAdapter } from '../../../src/core/adapters/claude-code.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new ClaudeCodeAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test\n\nContent here.',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('ClaudeCodeAdapter', () => {
  it('should have correct id', () => {
    expect(adapter.id).toBe('claude-code');
  });

  it('should generate skill file', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/skills/test-workflow/SKILL.md');
    expect(files[0].content).toContain('# Test');
    expect(files[0].generatedBy).toMatch(/^sot@/);
  });

  it('should generate command file', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.claude/commands/test-workflow.md');
    expect(files[0].content).toContain('name: test-workflow');
  });

  it('should generate config snippet', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].content).toContain('Available Skills');
  });
});
