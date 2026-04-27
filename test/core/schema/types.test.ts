import { describe, it, expect } from 'vitest';
import { SkillFrontmatterSchema, WorkflowMetaSchema } from '../../../src/core/schema/types.js';

describe('SkillFrontmatterSchema', () => {
  it('should parse minimal frontmatter', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'test-skill',
      description: 'A test skill',
    });
    expect(result.name).toBe('test-skill');
    expect(result.description).toBe('A test skill');
  });

  it('should parse full frontmatter', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'full-skill',
      description: 'Full skill',
      'argument-hint': '<arg>',
      type: 'workflow',
      standalone: true,
      triggers: ['user-explicit'],
      dependencies: { skills: ['dep1'], external: ['ext1'] },
      outputs: ['docs/'],
    });
    expect(result.name).toBe('full-skill');
    expect(result.standalone).toBe(true);
  });

  it('should reject empty name', () => {
    expect(() => SkillFrontmatterSchema.parse({ name: '', description: 'x' })).toThrow();
  });
});

describe('WorkflowMetaSchema', () => {
  it('should parse workflow metadata', () => {
    const result = WorkflowMetaSchema.parse({
      name: 'test-workflow',
      type: 'workflow',
      standalone: false,
      description: 'Test',
    });
    expect(result.type).toBe('workflow');
  });
});
