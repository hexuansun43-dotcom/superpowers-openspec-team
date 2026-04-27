import { Command } from 'commander';
import { loadConfig, saveConfig } from '../core/config.js';
import { logger, formatJsonOutput } from '../utils/logger.js';
import type { GlobalConfig } from '../core/config.js';

const VALID_KEYS: Array<keyof GlobalConfig> = ['defaultTools', 'deliveryMode', 'backupEnabled'];

function isValidKey(key: string): key is keyof GlobalConfig {
  return VALID_KEYS.includes(key as keyof GlobalConfig);
}

export const configCommand = new Command('config')
  .description('View or modify global configuration')
  .option('--get <key>', 'Get a config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--json', 'Output in JSON format')
  .action(async (options: { get?: string; set?: string; json?: boolean }) => {
    const config = loadConfig();

    // --set key=value
    if (options.set) {
      const equalIndex = options.set.indexOf('=');
      if (equalIndex === -1) {
        logger.error('Invalid format. Use --set key=value');
        process.exit(1);
      }

      const key = options.set.slice(0, equalIndex);
      const value = options.set.slice(equalIndex + 1);

      if (!isValidKey(key)) {
        logger.error(`Invalid config key: ${key}. Valid keys: ${VALID_KEYS.join(', ')}`);
        process.exit(1);
      }

      // Parse value based on key type
      let parsedValue: unknown;
      if (key === 'backupEnabled') {
        parsedValue = value === 'true';
      } else if (key === 'defaultTools') {
        parsedValue = value.split(',').map((v) => v.trim()).filter(Boolean);
      } else {
        parsedValue = value;
      }

      (config[key] as typeof parsedValue) = parsedValue;
      saveConfig(config);
      logger.success(`Set ${key} = ${JSON.stringify(parsedValue)}`);
      return;
    }

    // --get key
    if (options.get) {
      if (!isValidKey(options.get)) {
        logger.error(`Invalid config key: ${options.get}. Valid keys: ${VALID_KEYS.join(', ')}`);
        process.exit(1);
      }

      const value = config[options.get];
      if (options.json) {
        console.log(formatJsonOutput({ key: options.get, value }));
      } else {
        console.log(JSON.stringify(value));
      }
      return;
    }

    // No flags: show entire config
    if (options.json) {
      console.log(formatJsonOutput(config));
      return;
    }

    logger.info('Current configuration:');
    console.log(`  defaultTools:    ${JSON.stringify(config.defaultTools)}`);
    console.log(`  deliveryMode:    ${config.deliveryMode}`);
    console.log(`  backupEnabled:   ${config.backupEnabled}`);
  });
