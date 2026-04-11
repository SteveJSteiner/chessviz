import type {
  NavigationEntryPoint,
  RuntimeNeighborhoodSnapshot
} from './contracts';

export function createRuntimeNavigationEntryPoint(
  runtimeSnapshot: RuntimeNeighborhoodSnapshot
): NavigationEntryPoint {
  const focusOccurrence = runtimeSnapshot.occurrences.find(
    (occurrence) => occurrence.isFocus
  );

  return {
    entryId: runtimeSnapshot.focusOccurrenceId,
    label: `Neighborhood Focus · ${runtimeSnapshot.focusOccurrenceId}`,
    description: `${runtimeSnapshot.occurrences.length} local occurrence(s), ${runtimeSnapshot.edges.length} edge(s), cache ${runtimeSnapshot.cacheState}.`,
    focus: focusOccurrence?.embedding.coordinate ?? [0, 0, 0],
    distance: 4.2
  };
}