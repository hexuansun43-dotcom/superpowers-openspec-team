import crypto from 'crypto';
import fs from 'fs';

export function computeChecksum(content: string): string {
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

export function computeFileChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return computeChecksum(content);
}

export function verifyChecksum(content: string, checksum: string): boolean {
  const expected = computeChecksum(content);
  return expected === checksum;
}
