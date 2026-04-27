import { describe, it, expect } from 'vitest';
import path from 'path';
import os from 'os';
import { validateTargetPath, validateDeletionPath } from '../../../src/core/installer/path-validator.js';

// Use platform-appropriate project root for testing
const projectRoot = path.join(os.tmpdir(), 'sot-test-project');

describe('validateTargetPath', () => {
  it('should allow paths inside project root', () => {
    const targetPath = path.join(projectRoot, '.claude');
    const result = validateTargetPath(targetPath, projectRoot);
    expect(result.valid).toBe(true);
  });

  it('should reject paths outside project root', () => {
    // Use a path on a different drive (Windows) or clearly outside (Unix)
    const outsidePath = process.platform === 'win32'
      ? (projectRoot.charAt(0) === 'C' ? 'D:\\other' : 'C:\\other')
      : '/opt/other';
    const result = validateTargetPath(outsidePath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject root path', () => {
    const rootPath = process.platform === 'win32' ? 'C:\\' : '/';
    const result = validateTargetPath(rootPath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject path traversal', () => {
    const targetPath = path.join(projectRoot, '..', 'other');
    const result = validateTargetPath(targetPath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject system directories', () => {
    if (process.platform === 'win32') {
      const result = validateTargetPath('C:\\Windows', projectRoot);
      expect(result.valid).toBe(false);
    } else {
      const result = validateTargetPath('/usr', projectRoot);
      expect(result.valid).toBe(false);
    }
  });

  it('should allow project root itself', () => {
    const result = validateTargetPath(projectRoot, projectRoot);
    expect(result.valid).toBe(true);
  });

  it('should reject home directory itself', () => {
    const result = validateTargetPath(os.homedir(), projectRoot);
    expect(result.valid).toBe(false);
  });
});

describe('validateDeletionPath', () => {
  it('should reject deleting project root', () => {
    const result = validateDeletionPath(projectRoot, projectRoot);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('project root');
  });

  it('should reject deleting critical directories', () => {
    const srcPath = path.join(projectRoot, 'src');
    const result = validateDeletionPath(srcPath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject deleting node_modules', () => {
    const nmPath = path.join(projectRoot, 'node_modules');
    const result = validateDeletionPath(nmPath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should reject deleting .git', () => {
    const gitPath = path.join(projectRoot, '.git');
    const result = validateDeletionPath(gitPath, projectRoot);
    expect(result.valid).toBe(false);
  });

  it('should allow deleting non-critical directories', () => {
    const distPath = path.join(projectRoot, 'dist');
    const result = validateDeletionPath(distPath, projectRoot);
    expect(result.valid).toBe(true);
  });
});
