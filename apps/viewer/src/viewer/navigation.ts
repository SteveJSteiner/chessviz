import type {
  NavigationEntryPoint,
  RuntimeNeighborhoodSnapshot
} from './contracts';
import { LIVE_VIEW_DISTANCE, clampLiveViewDistance } from './labelPolicy.ts';

export function createRuntimeNavigationEntryPoint(
  runtimeSnapshot: RuntimeNeighborhoodSnapshot,
  distance: number = LIVE_VIEW_DISTANCE.default
): NavigationEntryPoint {
  const focusOccurrence = runtimeSnapshot.occurrences.find(
    (occurrence) => occurrence.isFocus
  );

  return {
    entryId: runtimeSnapshot.focusOccurrenceId,
    label: `Neighborhood Focus · ${runtimeSnapshot.focusOccurrenceId}`,
    description: `${runtimeSnapshot.occurrences.length} local occurrence(s), ${runtimeSnapshot.edges.length} edge(s), cache ${runtimeSnapshot.cacheState}.`,
    focus: focusOccurrence?.embedding.coordinate ?? [0, 0, 0],
    distance: clampLiveViewDistance(distance)
  };
}