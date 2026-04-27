import { describe, it, expect } from 'vitest';
import { OmcAdapter } from '../../../src/core/adapters/omc.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new OmcAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('OmcAdapter', () => {
  it('should detect OMC environment', () => {
    expect(adapter.id).toBe('omc');
  });

  it('should generate skill in .claude/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.claude/skills/test-workflow/SKILL.md');
  });

  it('should not generate commands', () => {
    expect(adapter.generateCommands(mockSkill, '/tmp')).toHaveLength(0);
  });

  it('should not generate config', () => {
    expect(adapter.generateConfig([], '/tmp')).toHaveLength(0);
  });
});
