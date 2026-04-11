import type { NavigationEntryPoint } from './contracts';

export function createDefaultNavigationEntryPoint(): NavigationEntryPoint {
  return {
    entryId: 'root-anchor',
    label: 'Root Anchor',
    description: 'Placeholder navigation anchor for camera and graph controls.',
    focus: [0, 0, 0],
    distance: 4.5
  };
}