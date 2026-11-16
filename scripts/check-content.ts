// npm run check:content – validates all content files. Exit code 1 on any error.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateContent, type FileInput } from '../src/content/validate';

const root = join(import.meta.dirname, '..', 'content');

function read(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`✗ ${path}: kein gültiges JSON – ${(e as Error).message}`);
    process.exit(1);
  }
}

const files: FileInput[] = readdirSync(join(root, 'units'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => ({ name: f, data: read(join(root, 'units', f)) }));

const errors = validateContent(read(join(root, 'curriculum.json')), files);
if (errors.length) {
  console.error(`✗ Inhaltsprüfung: ${errors.length} Fehler`);
  errors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
console.log(`✓ Inhaltsprüfung: ${files.length} Einheiten in Ordnung`);
