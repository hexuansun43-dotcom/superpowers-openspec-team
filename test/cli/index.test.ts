import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('CLI entry', () => {
  it('should show version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe('2.5.6');
  });

  it('should show help', () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(output).toContain('sot');
    expect(output).toContain('init');
    expect(output).toContain('build');
    expect(output).toContain('validate');
  });

  it('should exit with code 0 for help', () => {
    const result = execSync(`node ${cliPath} --help`, { encoding: 'utf-8' });
    expect(result).toBeDefined();
  });
});
