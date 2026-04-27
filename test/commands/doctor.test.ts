import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('sot doctor', () => {
  it('should run doctor command without error', () => {
    const output = execSync(`node ${cliPath} doctor`, { encoding: 'utf-8' });
    expect(output).toContain('Superpowers-OpenSpec Doctor');
    expect(output).toMatch(/ok.*warn.*fail/);
  });

  it('should output JSON with --json flag', () => {
    const output = execSync(`node ${cliPath} doctor --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('omcDetected');
    expect(parsed).toHaveProperty('checks');
    expect(parsed).toHaveProperty('summary');
    expect(parsed.checks.length).toBe(5);
    expect(parsed.summary).toHaveProperty('ok');
    expect(parsed.summary).toHaveProperty('warn');
    expect(parsed.summary).toHaveProperty('fail');
  });
});
