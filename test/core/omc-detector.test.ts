import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import os from 'os';

let mockExistsSync: ReturnType<typeof vi.fn>;
let mockReadFileSync: ReturnType<typeof vi.fn>;

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  mockExistsSync = vi.fn();
  mockReadFileSync = vi.fn();
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: mockExistsSync,
      readFileSync: mockReadFileSync,
    },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  };
});

const { detectOmc } = await import('../../src/core/omc-detector.js');

describe('detectOmc', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
  });

  it('should detect project-local .omc/ directory', () => {
    mockExistsSync.mockImplementation((p: string) => {
      return p === path.join('/project', '.omc');
    });

    const result = detectOmc('/project');
    expect(result.available).toBe(true);
    expect(result.projectLocal).toBe(true);
    expect(result.detectionMethod).toBe('project-local');
  });

  it('should detect global install via ~/.claude.json mcpServers', () => {
    const home = os.homedir();
    mockExistsSync.mockImplementation((p: string) => {
      return p === path.join(home, '.claude.json');
    });
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ mcpServers: { t: { command: 'npx', args: ['omc'] } } })
    );

    const result = detectOmc('/project');
    expect(result.available).toBe(true);
    expect(result.globalInstall).toBe(true);
    expect(result.detectionMethod).toBe('global-claude-json');
    expect(result.mcpServerName).toBe('t');
  });

  it('should return none when OMC is not found', () => {
    mockExistsSync.mockReturnValue(false);

    const result = detectOmc('/project');
    expect(result.available).toBe(false);
    expect(result.detectionMethod).toBe('none');
  });

  it('should prioritize project-local over global detection', () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementation(() => {
      return '{}';
    });

    const result = detectOmc('/project');
    expect(result.detectionMethod).toBe('project-local');
    expect(mockReadFileSync).not.toHaveBeenCalled();
  });
});
