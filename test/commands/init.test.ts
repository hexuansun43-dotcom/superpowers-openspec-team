import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('sot init', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf-8' });
    expect(output).toContain('Initialize skills');
  });

  it('should list tool option', () => {
    const output = execSync(`node ${cliPath} init --help`, { encoding: 'utf-8' });
    expect(output).toContain('--tool');
    expect(output).toContain('--dry-run');
    expect(output).toContain('--force');
    expect(output).toContain('--backup');
    expect(output).toContain('--with-memory');
  });
});

describe('sot update', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} update --help`, { encoding: 'utf-8' });
    expect(output).toContain('Update installed skills');
  });
});

describe('sot build', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} build --help`, { encoding: 'utf-8' });
    expect(output).toContain('Build dist/ from skills/');
  });
});

describe('sot validate', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} validate --help`, { encoding: 'utf-8' });
    expect(output).toContain('Validate installation integrity');
  });
});

describe('sot list', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} list --help`, { encoding: 'utf-8' });
    expect(output).toContain('List available skills');
  });
});

describe('sot install-deps', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} install-deps --help`, { encoding: 'utf-8' });
    expect(output).toContain('Install runtime dependencies');
  });
});

describe('sot config', () => {
  it('should show help', () => {
    const output = execSync(`node ${cliPath} config --help`, { encoding: 'utf-8' });
    expect(output).toContain('View or modify global configuration');
  });
});
