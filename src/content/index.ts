import { buildLibrary } from './library';
import type { Curriculum, Unit } from './types';
import curriculum from '../../content/curriculum.json';

// Every JSON file in content/units/ is picked up automatically: a new unit needs no code change.
const modules = import.meta.glob<Unit>('../../content/units/*.json', { eager: true, import: 'default' });

export const library = buildLibrary(curriculum as Curriculum, Object.values(modules));
