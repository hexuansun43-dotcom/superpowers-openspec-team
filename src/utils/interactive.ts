import chalk from 'chalk';
import { TOOL_REGISTRY } from '../core/config.js';

/**
 * Interactive tool selection with search, pre-selection, and keyboard navigation.
 * Similar to OpenSpec's init flow.
 */
export async function interactiveToolSelect(detected: string[]): Promise<string[]> {
  const available = Object.keys(TOOL_REGISTRY);
  const selected = new Set(detected.length > 0 ? detected : ['claude-code']);

  // If only one tool and it's detected, ask for confirmation
  if (detected.length === 1 && available.length === 1) {
    return detected;
  }

  console.log(chalk.dim(`  ${detected.length > 0 ? `Detected: ${detected.map(id => TOOL_REGISTRY[id]?.name ?? id).join(', ')} (pre-selected)` : 'No tools detected'}`));
  console.log('');
  console.log(chalk.white(`  Select tools to set up (${available.length} available):`));
  console.log('');

  // Display tool list with selection state
  let currentIndex = 0;
  let searchQuery = '';

  const render = () => {
    // Clear previous render
    const linesToClear = available.length + 4;
    for (let i = 0; i < linesToClear; i++) {
      process.stdout.write('\x1B[A\x1B[2K');
    }

    const filtered = available.filter((id) => {
      if (!searchQuery) return true;
      const name = TOOL_REGISTRY[id]?.name?.toLowerCase() ?? '';
      return name.includes(searchQuery.toLowerCase()) || id.includes(searchQuery.toLowerCase());
    });

    console.log(chalk.dim(`  Search: ${searchQuery || '[type to filter]'}`));
    console.log('');

    for (let i = 0; i < filtered.length; i++) {
      const id = filtered[i];
      const name = TOOL_REGISTRY[id]?.name ?? id;
      const isSelected = selected.has(id);
      const isCurrent = filtered[i] === available[currentIndex];

      const checkbox = isSelected ? chalk.green('●') : chalk.dim('○');
      const label = isCurrent ? chalk.bold.white(name) : chalk.white(name);
      const idTag = chalk.dim(`(${id})`);
      const detectedTag = detected.includes(id) ? chalk.dim(' detected') : '';

      console.log(`  ${checkbox} ${label} ${idTag}${detectedTag}`);
    }

    console.log('');
    console.log(chalk.dim('  ↑↓ navigate  •  Space toggle  •  Enter confirm  •  Esc cancel'));
  };

  // Initial render
  for (const id of available) {
    const name = TOOL_REGISTRY[id]?.name ?? id;
    const isSelected = selected.has(id);
    const checkbox = isSelected ? chalk.green('●') : chalk.dim('○');
    const detectedTag = detected.includes(id) ? chalk.dim(' detected') : '';
    console.log(`  ${checkbox} ${chalk.white(name)} ${chalk.dim(`(${id})`)}${detectedTag}`);
  }
  console.log('');
  console.log(chalk.dim('  ↑↓ navigate  •  Space toggle  •  Enter confirm  •  Esc cancel'));

  // Use inquirer for the actual selection (renders correctly in all terminals)
  const { default: inquirer } = await import('inquirer');
  const answers = await inquirer.prompt([{
    type: 'checkbox',
    name: 'tools',
    message: 'Select target tools:',
    choices: available.map((id) => ({
      name: `${TOOL_REGISTRY[id].name} (${id})`,
      value: id,
      checked: selected.has(id),
    })),
    pageSize: 10,
  }]);

  return answers.tools as string[];
}
