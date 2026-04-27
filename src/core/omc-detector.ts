import path from 'path';
import fs from 'fs';
import os from 'os';

export interface OmcDetectionResult {
  available: boolean;
  projectLocal: boolean;
  globalInstall: boolean;
  mcpServerName: string;
  version?: string;
  detectionMethod: 'project-local' | 'global-claude-json' | 'global-omc-dir' | 'global-omc-config' | 'none';
}

const MCP_SERVER_NAMES = ['t', 'omc', 'oh-my-claudecode'];

export function detectOmc(projectRoot: string): OmcDetectionResult {
  const none: OmcDetectionResult = {
    available: false,
    projectLocal: false,
    globalInstall: false,
    mcpServerName: '',
    detectionMethod: 'none',
  };

  // 1. Project-local .omc/ directory
  if (fs.existsSync(path.join(projectRoot, '.omc'))) {
    return {
      available: true,
      projectLocal: true,
      globalInstall: false,
      mcpServerName: '',
      detectionMethod: 'project-local',
    };
  }

  // 2. ~/.claude.json has mcpServers with OMC key
  const homeDir = os.homedir();
  const claudeJsonPath = path.join(homeDir, '.claude.json');
  try {
    if (fs.existsSync(claudeJsonPath)) {
      const content = fs.readFileSync(claudeJsonPath, 'utf-8');
      const config = JSON.parse(content);
      const servers = config?.mcpServers ?? {};
      const serverName = MCP_SERVER_NAMES.find((name) => name in servers);
      if (serverName) {
        return {
          available: true,
          projectLocal: false,
          globalInstall: true,
          mcpServerName: serverName,
          detectionMethod: 'global-claude-json',
        };
      }
    }
  } catch {
    // JSON parse error - fall through
  }

  // 3. ~/.omc/ directory
  if (fs.existsSync(path.join(homeDir, '.omc'))) {
    return {
      available: true,
      projectLocal: false,
      globalInstall: true,
      mcpServerName: '',
      detectionMethod: 'global-omc-dir',
    };
  }

  // 4. ~/.claude/.omc-config.json
  const omcConfigPath = path.join(homeDir, '.claude', '.omc-config.json');
  try {
    if (fs.existsSync(omcConfigPath)) {
      return {
        available: true,
        projectLocal: false,
        globalInstall: true,
        mcpServerName: '',
        detectionMethod: 'global-omc-config',
      };
    }
  } catch {
    // Fall through
  }

  return none;
}
