import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { detectOmc } from '../core/omc-detector.js';
import { VERSION } from '../core/config.js';
import { logger, formatJsonOutput } from '../utils/logger.js';

interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  message: string;
}

function checkOmcInstallation(projectRoot: string): DoctorCheck {
  const result = detectOmc(projectRoot);
  if (!result.available) {
    return { name: 'OMC Installation', status: 'warn', message: 'OMC not detected — optional integration skipped' };
  }
  const detail = result.projectLocal ? 'project-local .omc/' : `global (${result.detectionMethod})`;
  return { name: 'OMC Installation', status: 'ok', message: `OMC detected via ${detail}` };
}

function countSotSkills(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => {
      const skillMd = path.join(dir, d.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) return false;
      const content = fs.readFileSync(skillMd, 'utf-8');
      return content.includes('generatedBy: sot@');
    })
    .length;
}

function checkSkillSync(projectRoot: string): DoctorCheck {
  const omcSkillsDir = path.join(projectRoot, '.omc/skills');
  const claudeSkillsDir = path.join(projectRoot, '.claude/skills');
  if (!fs.existsSync(omcSkillsDir) && !fs.existsSync(claudeSkillsDir)) {
    return { name: 'Skill Sync', status: 'warn', message: 'No skill directories found — run sot init' };
  }
  if (fs.existsSync(omcSkillsDir) && fs.existsSync(claudeSkillsDir)) {
    const omcCount = countSotSkills(omcSkillsDir);
    const claudeCount = countSotSkills(claudeSkillsDir);
    if (omcCount !== claudeCount) {
      return { name: 'Skill Sync', status: 'warn', message: `OMC skills (${omcCount}) vs Claude skills (${claudeCount}) — consider sot update` };
    }
    return { name: 'Skill Sync', status: 'ok', message: `Skill directories in sync (${omcCount} skills)` };
  }
  const dir = fs.existsSync(omcSkillsDir) ? omcSkillsDir : claudeSkillsDir;
  const count = countSotSkills(dir);
  return { name: 'Skill Sync', status: 'ok', message: `${count} skill(s) installed` };
}

function checkClaudeMdSotBlock(projectRoot: string): DoctorCheck {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!fs.existsSync(claudeMdPath)) {
    return { name: 'CLAUDE.md SOT Block', status: 'warn', message: 'CLAUDE.md not found — run sot init' };
  }
  const content = fs.readFileSync(claudeMdPath, 'utf-8');
  if (content.includes('<!-- SOT:START -->') && content.includes('<!-- SOT:END -->')) {
    return { name: 'CLAUDE.md SOT Block', status: 'ok', message: 'SOT block present in CLAUDE.md' };
  }
  return { name: 'CLAUDE.md SOT Block', status: 'warn', message: 'No SOT block found in CLAUDE.md — run sot init' };
}

function checkRegistryVersion(projectRoot: string): DoctorCheck {
  const registryPath = path.join(projectRoot, '.omc/skills/sot-registry.json');
  if (!fs.existsSync(registryPath)) {
    return { name: 'Registry Version', status: 'warn', message: 'sot-registry.json not found — run sot init with OMC' };
  }
  try {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    if (registry.version === VERSION) {
      return { name: 'Registry Version', status: 'ok', message: `Registry version matches (${VERSION})` };
    }
    return { name: 'Registry Version', status: 'warn', message: `Registry v${registry.version} vs CLI v${VERSION} — run sot update` };
  } catch {
    return { name: 'Registry Version', status: 'fail', message: 'sot-registry.json is invalid JSON' };
  }
}

function checkMcpRegistration(): DoctorCheck {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '~';
  const claudeJsonPath = path.join(homeDir, '.claude.json');
  if (!fs.existsSync(claudeJsonPath)) {
    return { name: 'MCP Registration', status: 'warn', message: '~/.claude.json not found — MCP server not registered' };
  }
  try {
    const config = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
    const servers = config?.mcpServers || {};
    const hasSot = Object.keys(servers).some((k) => k === 'sot');
    if (hasSot) {
      return { name: 'MCP Registration', status: 'ok', message: 'sot MCP server registered in ~/.claude.json' };
    }
    return { name: 'MCP Registration', status: 'warn', message: 'sot MCP server not found in ~/.claude.json' };
  } catch {
    return { name: 'MCP Registration', status: 'fail', message: '~/.claude.json is invalid JSON' };
  }
}

function runChecks(projectRoot: string): DoctorCheck[] {
  return [
    checkOmcInstallation(projectRoot),
    checkSkillSync(projectRoot),
    checkClaudeMdSotBlock(projectRoot),
    checkRegistryVersion(projectRoot),
    checkMcpRegistration(),
  ];
}

export const doctorCommand = new Command('doctor')
  .description('Check Superpowers-OpenSpec health')
  .option('--json', 'Output in JSON format')
  .action((options: { json?: boolean }, cmd: Command) => {
    // Commander may consume --json at program level; check both
    const useJson = options.json || cmd.parent?.opts()?.json;
    const projectRoot = path.resolve('.');
    const checks = runChecks(projectRoot);
    const omcDetected = detectOmc(projectRoot).available;

    if (useJson) {
      const summary = {
        ok: checks.filter((c) => c.status === 'ok').length,
        warn: checks.filter((c) => c.status === 'warn').length,
        fail: checks.filter((c) => c.status === 'fail').length,
      };
      console.log(formatJsonOutput({ omcDetected, checks, summary }));
      return;
    }

    console.log(chalk.cyan.bold('\n  Superpowers-OpenSpec Doctor\n'));
    for (const check of checks) {
      const icon = check.status === 'ok' ? chalk.green('✓') : check.status === 'warn' ? chalk.yellow('⚠') : chalk.red('✗');
      console.log(`  ${icon} ${chalk.bold(check.name)}: ${check.message}`);
    }
    const ok = checks.filter((c) => c.status === 'ok').length;
    const warn = checks.filter((c) => c.status === 'warn').length;
    const fail = checks.filter((c) => c.status === 'fail').length;
    console.log(`\n  ${ok} ok, ${warn} warn, ${fail} fail\n`);
  });
