import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('sot build skill-index.json', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-build-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should generate skill-index.json for each adapter', () => {
    const distDir = path.resolve(__dirname, '../../dist');
    const claudeIndex = path.join(distDir, 'claude-code', 'skill-index.json');
    const cursorIndex = path.join(distDir, 'cursor', 'skill-index.json');

    execSync(`node ${cliPath} build`, { encoding: 'utf-8', cwd: path.resolve(__dirname, '../..') });

    expect(fs.existsSync(claudeIndex)).toBe(true);
    expect(fs.existsSync(cursorIndex)).toBe(true);

    const index = JSON.parse(fs.readFileSync(claudeIndex, 'utf-8'));
    expect(Array.isArray(index)).toBe(true);
    expect(index.length).toBeGreaterThan(0);

    const entry = index[0];
    expect(entry).toHaveProperty('name');
    expect(entry).toHaveProperty('description');
    expect(entry).toHaveProperty('type');
    expect(entry).toHaveProperty('skill_path');
  });

  it('should include model_hint, tags, category in index entries', () => {
    const distDir = path.resolve(__dirname, '../../dist');
    const claudeIndex = path.join(distDir, 'claude-code', 'skill-index.json');

    execSync(`node ${cliPath} build`, { encoding: 'utf-8', cwd: path.resolve(__dirname, '../..') });

    const index = JSON.parse(fs.readFileSync(claudeIndex, 'utf-8'));
    // All entries should have the keys (values may be undefined/null but keys must exist)
    for (const entry of index) {
      expect(entry).toHaveProperty('model_hint');
      expect(entry).toHaveProperty('tags');
      expect(entry).toHaveProperty('category');
    }
  });

  it('should include phases in skill-index.json entries', () => {
    const distDir = path.resolve(__dirname, '../../dist');
    const claudeIndex = path.join(distDir, 'claude-code', 'skill-index.json');

    execSync(`node ${cliPath} build`, { encoding: 'utf-8', cwd: path.resolve(__dirname, '../..') });

    const index = JSON.parse(fs.readFileSync(claudeIndex, 'utf-8'));
    const featureSkill = index.find((e: any) => e.name === 'superpowers-feature-workflow');
    expect(featureSkill).toBeDefined();
    expect(featureSkill.phases).toBeDefined();
    expect(featureSkill.phases.length).toBeGreaterThan(0);
    expect(featureSkill.phases[0]).toHaveProperty('name');
    expect(featureSkill.phases[0]).toHaveProperty('model_hint');
  });
});
