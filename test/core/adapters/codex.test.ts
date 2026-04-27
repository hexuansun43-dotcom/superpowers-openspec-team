import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../../src/core/adapters/codex.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new CodexAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('CodexAdapter', () => {
  it('should generate skill file in .codex/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.codex/skills/test-workflow/SKILL.md');
  });

  it('should not generate commands', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files).toHaveLength(0);
  });
});
