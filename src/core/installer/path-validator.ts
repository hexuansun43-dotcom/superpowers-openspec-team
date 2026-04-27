import path from 'path';
import os from 'os';

export interface PathValidationResult {
  valid: boolean;
  reason?: string;
}

const SYSTEM_FORBIDDEN_PATHS: string[] = [
  '/',
  '/usr',
  '/usr/local',
  '/etc',
  '/System',
  '/Applications',
];

// Windows system forbidden paths
if (process.platform === 'win32') {
  const windir = process.env.WINDIR || 'C:\\Windows';
  const systemRoot = process.env.SYSTEMROOT || 'C:\\Windows';
  SYSTEM_FORBIDDEN_PATHS.push(windir, systemRoot, 'C:\\Program Files', 'C:\\Program Files (x86)');
}

// User home is only forbidden when the target is the home dir itself,
// not when it's a subdirectory (projects commonly live under home).
const HOME_FORBIDDEN_PATH = os.homedir();

export function validateTargetPath(
  targetPath: string,
  projectRoot: string
): PathValidationResult {
  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(projectRoot);

  if (!resolved || resolved === path.parse(resolved).root) {
    return { valid: false, reason: 'Target path is empty or root' };
  }

  // On Windows, path.relative between different drives returns an absolute path
  // (e.g. "D:\other"), not a ".." relative path. So we check both conditions.
  const relativeToRoot = path.relative(resolvedRoot, resolved);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return { valid: false, reason: 'Path traversal detected' };
  }

  if (!resolved.startsWith(resolvedRoot + path.sep) && resolved !== resolvedRoot) {
    return { valid: false, reason: 'Target path is outside project root' };
  }

  for (const forbidden of SYSTEM_FORBIDDEN_PATHS) {
    if (!forbidden) continue;
    const normalizedForbidden = path.resolve(forbidden);
    if (resolved === normalizedForbidden || resolved.startsWith(normalizedForbidden + path.sep)) {
      return { valid: false, reason: `Refusing to modify system directory: ${forbidden}` };
    }
  }

  // Reject targeting the home directory itself (but subdirectories like project dirs are OK)
  if (HOME_FORBIDDEN_PATH && resolved === path.resolve(HOME_FORBIDDEN_PATH)) {
    return { valid: false, reason: 'Refusing to modify home directory' };
  }

  return { valid: true };
}

export function validateDeletionPath(targetPath: string, projectRoot: string): PathValidationResult {
  const baseValidation = validateTargetPath(targetPath, projectRoot);
  if (!baseValidation.valid) return baseValidation;

  const resolved = path.resolve(targetPath);
  const resolvedRoot = path.resolve(projectRoot);

  if (resolved === resolvedRoot) {
    return { valid: false, reason: 'Refusing to delete project root' };
  }

  const criticalDirs = ['src', 'node_modules', '.git'];
  for (const dir of criticalDirs) {
    if (resolved === path.join(resolvedRoot, dir)) {
      return { valid: false, reason: `Refusing to delete critical directory: ${dir}` };
    }
  }

  return { valid: true };
}
