import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const cliPath = path.resolve(__dirname, '../../bin/sot.js');

describe('sot build --format agentskills', () => {
  it('should generate agentskills manifests', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    execSync(`node ${cliPath} build --format agentskills`, { encoding: 'utf-8', cwd: projectRoot });

    const agentskillsDir = path.join(projectRoot, 'dist', 'agentskills');
    expect(fs.existsSync(agentskillsDir)).toBe(true);

    const files = fs.readdirSync(agentskillsDir).filter((f) => f.endsWith('.json'));
    expect(files.length).toBe(5); // one per skill
  });

  it('should produce valid agentskills manifest', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    execSync(`node ${cliPath} build --format agentskills`, { encoding: 'utf-8', cwd: projectRoot });

    const manifestPath = path.join(projectRoot, 'dist', 'agentskills', 'superpowers-feature-workflow.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.id).toBe('superpowers-feature-workflow');
    expect(manifest).toHaveProperty('phases');
    expect(manifest).toHaveProperty('instructions');
    expect(Array.isArray(manifest.dependencies)).toBe(true);
  });
});
