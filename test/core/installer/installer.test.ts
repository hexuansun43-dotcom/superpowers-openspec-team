import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { installFiles, detectInstalledTools } from '../../../src/core/installer/installer.js';
import type { GeneratedFile } from '../../../src/core/schema/types.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('installFiles', () => {
  it('should install files to target directory', async () => {
    const files: GeneratedFile[] = [
      { path: '.claude/skills/test/SKILL.md', content: 'content', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.success).toBe(true);
    expect(result.filesWritten).toContain('.claude/skills/test/SKILL.md');
    expect(fs.existsSync(path.join(tmpDir, '.claude/skills/test/SKILL.md'))).toBe(true);
  });

  it('should create parent directories automatically', async () => {
    const files: GeneratedFile[] = [
      { path: 'a/b/c/file.md', content: 'nested', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'a/b/c/file.md'))).toBe(true);
  });

  it('should backup existing files when backup option is set', async () => {
    const filePath = path.join(tmpDir, 'test.md');
    fs.writeFileSync(filePath, '<!-- generatedBy: sot@1.0.0 -->\nold content');
    const files: GeneratedFile[] = [
      { path: 'test.md', content: 'new content', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, { backup: true });
    expect(result.filesBackedUp.length).toBeGreaterThan(0);
    expect(fs.existsSync(filePath + '.backup')).toBe(true);
  });

  it('should skip files without marker when not forced and overwrite=false', async () => {
    const filePath = path.join(tmpDir, 'existing.md');
    fs.writeFileSync(filePath, 'no marker');
    const files: GeneratedFile[] = [
      { path: 'existing.md', content: 'new', overwrite: false, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.filesWritten).not.toContain('existing.md');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should overwrite files without marker when overwrite=true', async () => {
    const filePath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(filePath, 'no marker');
    const files: GeneratedFile[] = [
      { path: 'config.json', content: '{"updated":true}', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.filesWritten).toContain('config.json');
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('{"updated":true}');
  });

  it('should overwrite files without marker when forced', async () => {
    const filePath = path.join(tmpDir, 'existing.md');
    fs.writeFileSync(filePath, 'no marker');
    const files: GeneratedFile[] = [
      { path: 'existing.md', content: 'new', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, { force: true });
    expect(result.filesWritten).toContain('existing.md');
  });

  it('should not write files in dryRun mode', async () => {
    const files: GeneratedFile[] = [
      { path: 'dry-run.md', content: 'content', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, { dryRun: true });
    expect(result.filesWritten).toContain('dry-run.md');
    expect(fs.existsSync(path.join(tmpDir, 'dry-run.md'))).toBe(false);
  });

  it('should reject paths outside project root', async () => {
    const files: GeneratedFile[] = [
      { path: '../../etc/passwd', content: 'hack', overwrite: true, generatedBy: 'sot@2.0.0' },
    ];
    const result = await installFiles(files, tmpDir, {});
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('detectInstalledTools', () => {
  it('should detect Claude Code', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    const tools = detectInstalledTools(tmpDir);
    expect(tools).toContain('claude-code');
  });

  it('should detect multiple tools', () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, '.cursor'));
    const tools = detectInstalledTools(tmpDir);
    expect(tools).toContain('claude-code');
    expect(tools).toContain('cursor');
  });

  it('should return empty array when no tools detected', () => {
    const tools = detectInstalledTools(tmpDir);
    expect(tools).toEqual([]);
  });
});
