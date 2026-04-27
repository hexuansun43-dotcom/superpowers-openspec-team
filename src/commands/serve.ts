import { Command } from 'commander';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createSotServer } from '../mcp/server.js';
import { logger } from '../utils/logger.js';
import path from 'path';

export const serveCommand = new Command('serve')
  .description('Start MCP server for skill state queries')
  .option('--project-root <path>', 'Project root directory', '.')
  .action(async (options: { projectRoot: string }) => {
    const projectRoot = path.resolve(options.projectRoot);
    const server = createSotServer(projectRoot);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.debug(`sot MCP server started for ${projectRoot}`);
  });
