import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

export interface GlobalConfig {
  defaultTools: string[];
  deliveryMode: 'explicit-only' | 'auto';
  backupEnabled: boolean;
}

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.sot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: GlobalConfig = {
  defaultTools: ['claude-code'],
  deliveryMode: 'explicit-only',
  backupEnabled: true,
};

export function loadConfig(): GlobalConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    logger.warn(`Failed to load config: ${(error as Error).message}`);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: GlobalConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  logger.success(`Config saved to ${CONFIG_FILE}`);
}

// Tool registry
export const TOOL_REGISTRY: Record<string, { name: string; skillsDir: string; detectionPaths: string[] }> = {
  'claude-code': {
    name: 'Claude Code',
    skillsDir: '.claude/skills',
    detectionPaths: ['.claude/', 'CLAUDE.md'],
  },
  cursor: {
    name: 'Cursor',
    skillsDir: '.cursor/skills',
    detectionPaths: ['.cursor/', '.cursorrules'],
  },
  codex: {
    name: 'OpenAI Codex',
    skillsDir: '.codex/skills',
    detectionPaths: ['.codex/'],
  },
  gemini: {
    name: 'Gemini CLI',
    skillsDir: '',
    detectionPaths: ['GEMINI.md', 'gemini-extension.json'],
  },
};

export const VERSION = '2.0.9';
