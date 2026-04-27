import { VERSION } from './config.js';
import type { SkillDefinition } from './schema/types.js';

const SOT_START = '<!-- SOT:START -->';
const SOT_END = '<!-- SOT:END -->';
const OMC_END = '<!-- OMC:END -->';

/**
 * Inject or replace a SOT block in CLAUDE.md content.
 * Priority: existing SOT block -> replace; OMC:END exists -> insert after; else -> append.
 */
export function injectSotBlock(content: string, skills: SkillDefinition[]): string {
  const skillLines = skills
    .map((s) => `- \`${s.name}\`: ${s.description}`)
    .join('\n');
  const firstSkillName = skills.length > 0 ? skills[0].name : '';
  const block = [
    SOT_START,
    `<!-- generatedBy: sot@${VERSION} -->`,
    '## Superpowers-OpenSpec Skills',
    '',
    skillLines,
    '',
    `Invoke: \`/superpowers:${firstSkillName}\``,
    SOT_END,
  ].join('\n');

  // Replace existing SOT block
  const startIdx = content.indexOf(SOT_START);
  const endIdx = content.indexOf(SOT_END);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return content.slice(0, startIdx) + block + content.slice(endIdx + SOT_END.length);
  }

  // Insert after OMC:END marker
  const omcEndIdx = content.indexOf(OMC_END);
  if (omcEndIdx !== -1) {
    const insertPos = omcEndIdx + OMC_END.length;
    return content.slice(0, insertPos) + '\n\n' + block + content.slice(insertPos);
  }

  // Append to end
  const trimmed = content.trimEnd();
  return trimmed + '\n\n' + block + '\n';
}

/**
 * Remove the SOT block from CLAUDE.md content.
 */
export function removeSotBlock(content: string): string {
  const startIdx = content.indexOf(SOT_START);
  const endIdx = content.indexOf(SOT_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return content;
  }
  const result = content.slice(0, startIdx) + content.slice(endIdx + SOT_END.length);
  return result.trim() + '\n';
}
