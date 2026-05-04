#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { profiles } from '../src/profiles/index.js';
import type { ModelProfile } from '../src/types.js';

export function buildGuideMarkdown(profiles: Record<string, ModelProfile>): string {
  const lines: string[] = [];

  lines.push('# T2I Model Prompting Knowledge Base');
  lines.push('');
  lines.push('## 1. Architectural Foundations');
  lines.push('');
  lines.push('- Dual-encoder paradigm (CLIP + T5)');
  lines.push('- Diffusion Transformer (DiT) evolution');
  lines.push('- Encoder comparison table (token limits, style bias)');
  lines.push('');
  lines.push('## 2. Per-Model Prompting Guides');
  lines.push('');

  for (const [id, profile] of Object.entries(profiles)) {
    lines.push(`### 2.${Object.keys(profiles).indexOf(id) + 1} ${profile.name} (${id})`);
    lines.push('');
    lines.push(`- **Persona:** ${profile.persona}`);
    lines.push(`- **Output Format:** ${profile.outputFormat}`);
    lines.push(`- **Negative Prompts:** ${profile.supportsNegativePrompt ? 'Supported' : 'Not supported'}`);
    lines.push('');

    if (profile.avoidPatterns.length > 0) {
      lines.push('**Anti-patterns:**');
      lines.push('');
      for (const pattern of profile.avoidPatterns) {
        lines.push(`- ${pattern}`);
      }
      lines.push('');
    }

    lines.push('**System Prompt:**');
    lines.push('');
    lines.push('```');
    lines.push(profile.systemPrompt);
    lines.push('```');
    lines.push('');
  }

  lines.push('## 3. Cross-Model Strategies');
  lines.push('');
  lines.push('### 3.1 Text Rendering vs. Text Prevention');
  lines.push('');
  lines.push('Some models excel at text rendering (Qwen Image, Nano Banana Pro), while others struggle (SDXL).');
  lines.push('For text-prone models, use double quotes around text elements. For text-averse models, omit text or use graphical representation.');
  lines.push('');
  lines.push('### 3.2 Affirmative Framing (Negation Avoidance)');
  lines.push('');
  lines.push('Models that do not support negative prompts (Flux, Z-Image Turbo, Seedream-4, Wan Image, Nano Banana Pro) require all constraints to be expressed positively. Instead of "a street without cars", use "an empty cobblestone street".');
  lines.push('');
  lines.push('### 3.3 Weighting Syntax Comparison');
  lines.push('');
  lines.push('| Model | Weighting |');
  lines.push('|-------|-----------|');
  lines.push('| SDXL | `(keyword:1.3)` |');
  lines.push('| Flux | Front-loading (position-based) |');
  lines.push('| Others | Positional + natural emphasis |');
  lines.push('');
  lines.push('### 3.4 Persona Strategies by Model Family');
  lines.push('');
  lines.push('| Model | Persona |');
  lines.push('|-------|---------|');
  for (const [_id, profile] of Object.entries(profiles)) {
    lines.push(`| ${profile.name} | ${profile.persona} |`);
  }
  lines.push('');

  lines.push('## 4. Reference Tables');
  lines.push('');
  lines.push('### Model Comparison Cheat Sheet');
  lines.push('');
  lines.push('| Model | Format | Negative Prompt | Style |');
  lines.push('|-------|--------|----------------|-------|');
  for (const [_id, profile] of Object.entries(profiles)) {
    lines.push(`| ${profile.name} | ${profile.outputFormat} | ${profile.supportsNegativePrompt ? 'Yes' : 'No'} | ${profile.id} |`);
  }
  lines.push('');
  lines.push('### Camera/Film Vocabulary Reference');
  lines.push('');
  lines.push('- **Chiaroscuro:** High-contrast dramatic lighting (Nano Banana Pro)');
  lines.push('- **Rembrandt Lighting:** Classic moody portrait lighting (Nano Banana Pro, Wan Image)');
  lines.push('- **Volumetric Lighting:** Beam effects through dust/fog (Nano Banana Pro, Wan Image)');
  lines.push('- **Golden Hour Backlighting:** Warm atmospheric shots (Wan Image)');
  lines.push('- **Shallow Depth of Field:** Background blur (Wan Image)');
  lines.push('- **Anamorphic Lens Flare:** Cinematic feel (Wan Image)');
  lines.push('');
  lines.push('- **Pan Left / Pan Right:** Camera pans (Wan Image)');
  lines.push('- **Tilt Up / Tilt Down:** Camera tilts (Wan Image)');
  lines.push('- **Dolly In:** Dramatic emphasis zoom (Wan Image)');
  lines.push('- **Pull Back:** Receding shot (Wan Image, use instead of "Dolly Out")');

  return lines.join('\n');
}

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