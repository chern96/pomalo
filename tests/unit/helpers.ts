import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLibrary } from '../../src/content/library';
import type { Curriculum, Unit } from '../../src/content/types';

const root = join(import.meta.dirname, '..', '..', 'content');

export function readCurriculum(): Curriculum {
  return JSON.parse(readFileSync(join(root, 'curriculum.json'), 'utf8')) as Curriculum;
}

export function readUnits(): { name: string; data: Unit }[] {
  return readdirSync(join(root, 'units'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ name: f, data: JSON.parse(readFileSync(join(root, 'units', f), 'utf8')) as Unit }));
}

export function realLibrary() {
  return buildLibrary(readCurriculum(), readUnits().map((u) => u.data));
}
