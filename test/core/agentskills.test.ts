import { describe, it, expect } from 'vitest';
import { mapToAgentskills } from '../../src/core/agentskills.js';
import type { SkillDefinition } from '../../src/core/schema/types.js';

describe('mapToAgentskills', () => {
  const mockSkill: SkillDefinition = {
    name: 'test-workflow',
    description: 'A test workflow',
    content: '# Test Workflow\n\nThis is the body.',
    frontmatter: {
      name: 'test-workflow',
      description: 'A test workflow',
      model_hint: 'sonnet',
      tags: ['test', 'demo'],
      category: 'engineering',
      triggers: ['user-explicit'],
    },
    type: 'workflow',
    standalone: false,
    dependencies: [],
    metadata: {
      name: 'test-workflow',
      type: 'workflow',
      standalone: false,
      description: 'A test workflow',
      phases: [
        { name: 'brainstorming', model_hint: 'haiku' },
        { name: 'design', model_hint: 'sonnet' },
      ],
      dependencies: { external_skills: ['brainstorming'] },
      outputs: ['docs/specs/'],
    },
  };

  it('should map skill definition to agentskills manifest', () => {
    const result = mapToAgentskills(mockSkill, '2.4.0');
    expect(result.id).toBe('test-workflow');
    expect(result.description).toBe('A test workflow');
    expect(result.type).toBe('workflow');
    expect(result.tags).toEqual(['test', 'demo']);
    expect(result.category).toBe('engineering');
    expect(result.phases).toHaveLength(2);
    expect(result.phases![0].modelHint).toBe('haiku');
    expect(result.dependencies).toEqual(['brainstorming']);
    expect(result.outputs).toEqual(['docs/specs/']);
    expect(result.instructions).toContain('# Test Workflow');
  });

  it('should handle skill without metadata', () => {
    const minimalSkill: SkillDefinition = {
      name: 'minimal',
      description: 'Minimal skill',
      content: 'Body',
      frontmatter: { name: 'minimal', description: 'Minimal skill' },
      type: 'workflow',
      standalone: true,
      dependencies: [],
    };
    const result = mapToAgentskills(minimalSkill, '2.4.0');
    expect(result.id).toBe('minimal');
    expect(result.phases).toBeUndefined();
    expect(result.dependencies).toEqual([]);
  });
});
