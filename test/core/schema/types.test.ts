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
      dependencies: { workflows: ['dep1'], external_skills: ['ext1'] },
      outputs: ['docs/'],
    });
    expect(result.name).toBe('full-skill');
    expect(result.standalone).toBe(true);
  });

  it('should reject empty name', () => {
    expect(() => SkillFrontmatterSchema.parse({ name: '', description: 'x' })).toThrow();
  });

  it('should parse frontmatter with new optional fields', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'test-skill',
      description: 'A test skill',
      'argument-hint': 'do the thing',
      model_hint: 'sonnet',
      tags: ['test', 'demo'],
      category: 'engineering',
    });
    expect(result.model_hint).toBe('sonnet');
    expect(result.tags).toEqual(['test', 'demo']);
    expect(result.category).toBe('engineering');
  });

  it('should parse frontmatter without new fields (backward compat)', () => {
    const result = SkillFrontmatterSchema.parse({
      name: 'old-skill',
      description: 'An old skill',
    });
    expect(result.model_hint).toBeUndefined();
    expect(result.tags).toBeUndefined();
    expect(result.category).toBeUndefined();
  });

  it('should reject invalid model_hint', () => {
    expect(() =>
      SkillFrontmatterSchema.parse({
        name: 'bad-skill',
        description: 'Bad',
        model_hint: 'turbo',
      })
    ).toThrow();
  });

  it('should reject invalid category', () => {
    expect(() =>
      SkillFrontmatterSchema.parse({
        name: 'bad-skill',
        description: 'Bad',
        category: 'kitchen',
      })
    ).toThrow();
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
