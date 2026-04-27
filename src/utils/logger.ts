import chalk from 'chalk';

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export const logger: Logger = {
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✓'), message),
  warn: (message) => console.log(chalk.yellow('⚠'), message),
  error: (message) => console.error(chalk.red('✗'), message),
  debug: (message) => {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), message);
    }
  },
};

export function formatJsonOutput(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
