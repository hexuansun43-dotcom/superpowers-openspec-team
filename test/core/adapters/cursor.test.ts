import { describe, it, expect } from 'vitest';
import { CursorAdapter } from '../../../src/core/adapters/cursor.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new CursorAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('CursorAdapter', () => {
  it('should have correct id', () => {
    expect(adapter.id).toBe('cursor');
  });

  it('should generate skill file in .cursor/skills/', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp');
    expect(files[0].path).toBe('.cursor/skills/test-workflow/SKILL.md');
  });

  it('should generate rule file in .cursor/rules/', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp');
    expect(files[0].path).toBe('.cursor/rules/test-workflow.mdc');
  });

  it('should generate AGENTS.md snippet', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp');
    expect(files[0].path).toBe('AGENTS.md.sot-snippet');
  });
});
