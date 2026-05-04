#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { profiles } from '../src/profiles/index.js';
import { buildGuideMarkdown } from '../src/guide.js';

async function main(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(__dirname, '../docs');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'PROMPTING_GUIDE.md'), buildGuideMarkdown(profiles));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});