import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Resolve the skills/ directory:
 * 1. Check project root for local skills/ (sot build workflow)
 * 2. Resolve from package installation directory (global install)
 * 3. Fallback to process.cwd()/skills (local development)
 */
export function resolveSkillsDir(projectRoot: string): string {
  const localSkills = path.join(projectRoot, 'skills');
  if (fs.existsSync(localSkills)) return localSkills;

  // When installed globally, __dirname (via import.meta.url) points to dist/cli/
  // Package root is two levels up from dist/cli/
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const packageSkills = path.join(packageRoot, 'skills');
  if (fs.existsSync(packageSkills)) return packageSkills;

  // Fallback for local development
  const cwdSkills = path.resolve(process.cwd(), 'skills');
  return cwdSkills;
}

/**
 * Resolve the package root directory (where package.json lives).
 */
export function resolvePackageRoot(): string {
  const fromDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  if (fs.existsSync(path.join(fromDist, 'package.json'))) return fromDist;
  return process.cwd();
}
