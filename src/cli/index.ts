import { Command } from 'commander';
import { initCommand } from '../commands/init.js';
import { updateCommand } from '../commands/update.js';
import { buildCommand } from '../commands/build.js';
import { validateCommand } from '../commands/validate.js';
import { listCommand } from '../commands/list.js';
import { installDepsCommand } from '../commands/install-deps.js';
import { configCommand } from '../commands/config.js';

const VERSION = '2.0.9';

const program = new Command();

program
  .name('sot')
  .description('Superpowers-OpenSpec Team Skills CLI')
  .version(VERSION)
  .option('--json', 'Output in JSON format')
  .option('--debug', 'Enable debug logging');

// Register commands
program.addCommand(initCommand);
program.addCommand(updateCommand);
program.addCommand(buildCommand);
program.addCommand(validateCommand);
program.addCommand(listCommand);
program.addCommand(installDepsCommand);
program.addCommand(configCommand);

// Global options handling
program.hook('preAction', (thisCommand) => {
  const options = thisCommand.opts();
  if (options.debug) {
    process.env.DEBUG = '1';
  }
});

program.parse();
