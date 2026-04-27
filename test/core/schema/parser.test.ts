import { describe, it, expect } from 'vitest';
import path from 'path';
import { parseFrontmatter, parseWorkflowYaml, parseSkill } from '../../../src/core/schema/parser.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../../fixtures/test-skill');

describe('parseFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
name: my-skill
description: My skill
---
# Content`;
    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('my-skill');
    expect(result.body.trim()).toBe('# Content');
  });

  it('should throw on missing frontmatter', () => {
    expect(() => parseFrontmatter('no frontmatter')).toThrow('No frontmatter found');
  });
});

describe('parseWorkflowYaml', () => {
  it('should parse valid yaml', () => {
    const yamlContent = `
name: test
type: workflow
standalone: true
description: Test`;
    const result = parseWorkflowYaml(yamlContent);
    expect(result.name).toBe('test');
    expect(result.type).toBe('workflow');
  });
});

describe('parseSkill', () => {
  it('should parse a complete skill directory', () => {
    const skill = parseSkill(fixturesDir);
    expect(skill.name).toBe('test-skill');
    expect(skill.description).toBe('A skill for testing');
    expect(skill.type).toBe('workflow');
    expect(skill.standalone).toBe(true);
  });
});
