import { describe, it, expect } from 'vitest';
import { OmcAdapter } from '../../../src/core/adapters/omc.js';
import type { SkillDefinition } from '../../../src/core/schema/types.js';

const adapter = new OmcAdapter();

const mockSkill: SkillDefinition = {
  name: 'test-workflow',
  description: 'Test workflow',
  content: '# Test\n\nContent here.',
  frontmatter: { name: 'test-workflow', description: 'Test workflow' },
  type: 'workflow',
  standalone: true,
  dependencies: [],
};

describe('OmcAdapter', () => {
  it('should have correct id and skillsDir', () => {
    expect(adapter.id).toBe('omc');
    expect(adapter.skillsDir).toBe('.omc/skills');
  });

  it('should generate SKILL.md with YAML frontmatter', () => {
    const files = adapter.generateSkill(mockSkill, '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.omc/skills/test-workflow/SKILL.md');
    expect(files[0].content).toContain('---');
    expect(files[0].content).toContain('name: test-workflow');
    expect(files[0].content).toContain('# Test');
    expect(files[0].generatedBy).toMatch(/^sot@/);
  });

  it('should return empty commands', () => {
    const files = adapter.generateCommands(mockSkill, '/tmp/test');
    expect(files).toHaveLength(0);
  });

  it('should generate sot-registry.json', () => {
    const files = adapter.generateConfig([mockSkill], '/tmp/test');
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.omc/skills/sot-registry.json');
    const parsed = JSON.parse(files[0].content);
    expect(parsed.source).toBe('sot');
    expect(parsed.version).toBeDefined();
    expect(parsed.skills).toHaveLength(1);
    expect(parsed.skills[0].name).toBe('test-workflow');
  });

  it('should have correct detectionPaths', () => {
    expect(adapter.detectionPaths).toEqual(['.omc/', '.omc/state/', '.omc/notepad.md']);
  });
});
