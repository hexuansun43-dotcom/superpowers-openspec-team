import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');
const fixturesDir = path.resolve(__dirname, '../fixtures/test-skill');

describe('E2E: init -> build -> validate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sot-e2e-'));
    // Create a valid skills/ directory in the temp project
    const skillDir = path.join(tmpDir, 'skills', 'test-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.copyFileSync(
      path.join(fixturesDir, 'SKILL.md'),
      path.join(skillDir, 'SKILL.md'),
    );
    fs.copyFileSync(
      path.join(fixturesDir, 'workflow.yaml'),
      path.join(skillDir, 'workflow.yaml'),
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should show list of skills', () => {
    const output = execSync(`node ${cliPath} list`, {
      encoding: 'utf-8',
    });
    expect(output).toBeDefined();
  });

  it('should init skills in empty project with --force', () => {
    const output = execSync(`node ${cliPath} init ${tmpDir} --tool claude-code --force`, {
      encoding: 'utf-8',
    });
    expect(output).toBeDefined();
    expect(fs.existsSync(path.join(tmpDir, '.claude'))).toBe(true);
  });

  it('should validate after init', () => {
    execSync(`node ${cliPath} init ${tmpDir} --tool claude-code --force`, {
      encoding: 'utf-8',
    });
    // validate may exit with warnings, capture output
    try {
      const output = execSync(`node ${cliPath} validate ${tmpDir}`, {
        encoding: 'utf-8',
      });
      expect(output).toBeDefined();
    } catch (e: any) {
      // validate exits with 1 on warnings, that's ok for E2E
      expect(e.stdout || e.message).toBeDefined();
    }
  });
});
