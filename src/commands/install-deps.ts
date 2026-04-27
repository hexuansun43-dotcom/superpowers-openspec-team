import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import yaml from 'yaml';
import { parseAllSkills } from '../core/schema/parser.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import { resolveSkillsDir } from '../utils/paths.js';
import type { DependencyStatus } from '../core/schema/types.js';

function collectExternalDependencies(skillsDir: string): Array<{
  name: string;
  version?: string;
  optional?: boolean;
  checkCommand?: string;
}> {
  const deps: Array<{
    name: string;
    version?: string;
    optional?: boolean;
    checkCommand?: string;
  }> = [];
  const seen = new Set<string>();

  if (!fs.existsSync(skillsDir)) return deps;

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workflowPath = path.join(skillsDir, entry.name, 'workflow.yaml');
    if (!fs.existsSync(workflowPath)) continue;

    try {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      const parsed = yaml.parse(content) as Record<string, unknown>;

      const dependencies = parsed.dependencies as Record<string, unknown> | undefined;
      if (!dependencies) continue;

      const external = dependencies.external_skills as Array<string> | undefined;
      if (!external) continue;

      for (const name of external) {
        if (!name || seen.has(name)) continue;
        seen.add(name);
        deps.push({
          name,
        });
      }
    } catch {
      logger.warn(`Failed to parse ${workflowPath}`);
    }
  }

  return deps;
}

function checkDependency(dep: {
  name: string;
  checkCommand?: string;
}): DependencyStatus {
  const checkCmd = dep.checkCommand || `which ${dep.name}`;
  try {
    const output = execSync(checkCmd, { encoding: 'utf-8', timeout: 5000 }).trim();
    return {
      name: dep.name,
      installed: true,
      version: output || undefined,
      required: dep.checkCommand || `which ${dep.name}`,
    };
  } catch {
    return {
      name: dep.name,
      installed: false,
      required: dep.checkCommand || `which ${dep.name}`,
    };
  }
}

function installDependency(dep: {
  name: string;
  version?: string;
}): boolean {
  try {
    // Try npm global install as a common fallback
    const installCmd = dep.version
      ? `npm install -g ${dep.name}@${dep.version}`
      : `npm install -g ${dep.name}`;
    execSync(installCmd, { encoding: 'utf-8', timeout: 60000 });
    return true;
  } catch {
    logger.warn(`Failed to install ${dep.name} via npm. You may need to install it manually.`);
    return false;
  }
}

export const installDepsCommand = new Command('install-deps')
  .description('Install runtime dependencies')
  .option('--force', 'Install missing dependencies without prompting')
  .option('--json', 'Output in JSON format')
  .action(async (options: { force?: boolean; json?: boolean }) => {
    const projectRoot = path.resolve('.');
    const skillsDir = resolveSkillsDir(projectRoot);

    const externalDeps = collectExternalDependencies(skillsDir);
    if (externalDeps.length === 0) {
      logger.info('No external dependencies found in workflow files');
      if (options.json) {
        console.log(formatJsonOutput({ dependencies: [], allInstalled: true }));
      }
      return;
    }

    // Check installation status
    const statuses = externalDeps.map(checkDependency);
    const missing = statuses.filter((s) => !s.installed);
    const installed = statuses.filter((s) => s.installed);

    if (options.json) {
      console.log(formatJsonOutput({
        dependencies: statuses,
        allInstalled: missing.length === 0,
      }));
      return;
    }

    if (installed.length > 0) {
      logger.success(`Installed dependencies (${installed.length}):`);
      for (const dep of installed) {
        const version = dep.version ? ` (${dep.version})` : '';
        console.log(`  ${dep.name}${version}`);
      }
    }

    if (missing.length > 0) {
      logger.warn(`Missing dependencies (${missing.length}):`);
      for (const dep of missing) {
        console.log(`  ${dep.name}`);
      }

      if (options.force) {
        logger.info('Installing missing dependencies...');
        for (const dep of missing) {
          const depInfo = externalDeps.find((d) => d.name === dep.name);
          logger.info(`Installing ${dep.name}...`);
          const success = installDependency(depInfo || dep);
          if (success) {
            logger.success(`Installed ${dep.name}`);
          } else {
            logger.error(`Failed to install ${dep.name}`);
          }
        }
      } else {
        logger.info('Use --force to install missing dependencies');
      }
    } else {
      logger.success('All dependencies are installed');
    }
  });
