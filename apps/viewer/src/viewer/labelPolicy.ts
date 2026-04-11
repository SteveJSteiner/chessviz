import type {
  RuntimeCarrierRecord,
  RuntimeNeighborhoodOccurrence
} from './contracts';

export type LabelZoomBand = 'structure' | 'tactical' | 'contextual';

export interface CarrierLabelSelection {
  carrier: RuntimeCarrierRecord;
  opacity: number;
  rank: number;
  scale: number;
}

export interface OccurrenceLabelSelection {
  kind: 'root' | 'terminal';
  occurrence: RuntimeNeighborhoodOccurrence;
  opacity: number;
  scale: number;
}

export const LIVE_VIEW_DISTANCE = {
  min: 2.6,
  default: 4.2,
  tacticalThreshold: 3.55,
  structureThreshold: 4.7,
  max: 5.8
} as const;

type CarrierLabelSelectionArgs = {
  cameraDistance: number;
  carriers: RuntimeCarrierRecord[];
  focusOccurrenceId: string;
  occurrences: RuntimeNeighborhoodOccurrence[];
};

type CarrierLabelBandSelectionArgs = {
  band: LabelZoomBand;
  carriers: RuntimeCarrierRecord[];
  focusOccurrenceId: string;
  occurrences: RuntimeNeighborhoodOccurrence[];
};

type OccurrenceLabelSelectionArgs = {
  cameraDistance: number;
  occurrences: RuntimeNeighborhoodOccurrence[];
};

export function clampLiveViewDistance(distance: number) {
  return clampNumber(distance, LIVE_VIEW_DISTANCE.min, LIVE_VIEW_DISTANCE.max);
}

export function resolveLabelZoomBand(cameraDistance: number): LabelZoomBand {
  const clampedDistance = clampLiveViewDistance(cameraDistance);

  if (clampedDistance >= LIVE_VIEW_DISTANCE.structureThreshold) {
    return 'structure';
  }

  if (clampedDistance >= LIVE_VIEW_DISTANCE.tacticalThreshold) {
    return 'tactical';
  }

  return 'contextual';
}

export function selectCarrierLabelSelections({
  cameraDistance,
  carriers,
  focusOccurrenceId,
  occurrences
}: CarrierLabelSelectionArgs): CarrierLabelSelection[] {
  return selectCarrierLabelSelectionsForBand({
    band: resolveLabelZoomBand(cameraDistance),
    carriers,
    focusOccurrenceId,
    occurrences
  });
}

function selectCarrierLabelSelectionsForBand({
  band,
  carriers,
  focusOccurrenceId,
  occurrences
}: CarrierLabelBandSelectionArgs): CarrierLabelSelection[] {
  const occurrenceById = new Map(
    occurrences.map((occurrence) => [occurrence.occurrenceId, occurrence])
  );
  const incidentCounts = countCarrierIncidents(carriers);
  const selectionBudget = resolveCarrierSelectionBudget(carriers.length, incidentCounts, band);
  const sortedCarriers = [...carriers].sort(
    (left, right) =>
      scoreCarrier(right, occurrenceById, incidentCounts, focusOccurrenceId) -
      scoreCarrier(left, occurrenceById, incidentCounts, focusOccurrenceId)
  );
  const minimumSelectionKeys = new Set(
    resolvePriorBandSelections({
      band,
      carriers,
      focusOccurrenceId,
      occurrences
    }).map((selection) => carrierKey(selection.carrier))
  );
  const selectedCountsByOccurrenceId = new Map<string, number>();

  for (const carrier of sortedCarriers) {
    if (!minimumSelectionKeys.has(carrierKey(carrier))) {
      continue;
    }

    incrementSelectedCounts(selectedCountsByOccurrenceId, carrier);
  }

  const selectedKeys = new Set(minimumSelectionKeys);

  for (const carrier of sortedCarriers) {
    if (selectedKeys.size >= selectionBudget) {
      break;
    }

    if (selectedKeys.has(carrierKey(carrier))) {
      continue;
    }

    const sourceCount = selectedCountsByOccurrenceId.get(carrier.sourceOccurrenceId) ?? 0;
    const targetCount = selectedCountsByOccurrenceId.get(carrier.targetOccurrenceId) ?? 0;
    const sourceIncidentCount = incidentCounts.get(carrier.sourceOccurrenceId) ?? 0;
    const targetIncidentCount = incidentCounts.get(carrier.targetOccurrenceId) ?? 0;
    const sourceCap = resolvePerOccurrenceSelectionCap(
      sourceIncidentCount,
      band,
      carrier.sourceOccurrenceId === focusOccurrenceId
    );
    const targetCap = resolvePerOccurrenceSelectionCap(
      targetIncidentCount,
      band,
      carrier.targetOccurrenceId === focusOccurrenceId
    );

    if (sourceCount >= sourceCap || targetCount >= targetCap) {
      continue;
    }

    selectedKeys.add(carrierKey(carrier));
    incrementSelectedCounts(selectedCountsByOccurrenceId, carrier);
  }

  return sortedCarriers
    .filter((carrier) => selectedKeys.has(carrierKey(carrier)))
    .map((carrier, rank) => {
      const focusAdjacent =
        carrier.sourceOccurrenceId === focusOccurrenceId ||
        carrier.targetOccurrenceId === focusOccurrenceId;

      return {
        carrier,
        opacity: resolveCarrierLabelOpacity(band, rank, focusAdjacent),
        rank,
        scale: resolveCarrierLabelScale(band, focusAdjacent)
      };
    });
}

export function selectOccurrenceLabelSelections({
  cameraDistance,
  occurrences
}: OccurrenceLabelSelectionArgs): OccurrenceLabelSelection[] {
  const band = resolveLabelZoomBand(cameraDistance);
  const rootSelections = occurrences
    .filter((occurrence) => occurrence.ply === 0)
    .map((occurrence) => ({
      kind: 'root' as const,
      occurrence,
      opacity: resolveRootLabelOpacity(band),
      scale: resolveRootLabelScale(band)
    }));
  const terminalBudget = band === 'structure' ? 1 : band === 'tactical' ? 2 : 4;
  const terminalSelections = occurrences
    .filter((occurrence) => occurrence.terminal !== null)
    .filter(
      (occurrence) =>
        band !== 'structure' || occurrence.isFocus || occurrence.distance <= 1
    )
    .sort((left, right) => scoreOccurrenceLabel(right) - scoreOccurrenceLabel(left))
    .slice(0, terminalBudget)
    .map((occurrence) => ({
      kind: 'terminal' as const,
      occurrence,
      opacity: resolveTerminalLabelOpacity(band, occurrence.isFocus),
      scale: resolveTerminalLabelScale(band, occurrence.isFocus)
    }));

  return [...rootSelections, ...terminalSelections];
}

function countCarrierIncidents(carriers: RuntimeCarrierRecord[]) {
  return carriers.reduce<Map<string, number>>((counts, carrier) => {
    counts.set(
      carrier.sourceOccurrenceId,
      (counts.get(carrier.sourceOccurrenceId) ?? 0) + 1
    );
    counts.set(
      carrier.targetOccurrenceId,
      (counts.get(carrier.targetOccurrenceId) ?? 0) + 1
    );
    return counts;
  }, new Map<string, number>());
}

function resolveCarrierSelectionBudget(
  carrierCount: number,
  incidentCounts: Map<string, number>,
  band: LabelZoomBand
) {
  const maxIncidentCount = Math.max(0, ...incidentCounts.values());
  const baseBudget = band === 'structure' ? 3 : band === 'tactical' ? 5 : 8;
  const pressurePenalty = maxIncidentCount >= 8 ? 2 : maxIncidentCount >= 6 ? 1 : 0;

  return clampNumber(baseBudget - pressurePenalty, 2, Math.max(2, carrierCount));
}

function resolvePriorBandSelections({
  band,
  carriers,
  focusOccurrenceId,
  occurrences
}: CarrierLabelBandSelectionArgs) {
  if (band === 'structure') {
    return [];
  }

  return selectCarrierLabelSelectionsForBand({
    band: band === 'tactical' ? 'structure' : 'tactical',
    carriers,
    focusOccurrenceId,
    occurrences
  });
}

function resolvePerOccurrenceSelectionCap(
  incidentCount: number,
  band: LabelZoomBand,
  focusAdjacent: boolean
) {
  const baseCap = band === 'structure' ? 1 : band === 'tactical' ? 2 : 3;
  const densityPenalty = incidentCount >= 8 ? 1 : 0;
  const focusBonus = focusAdjacent ? 1 : 0;

  return Math.max(1, baseCap - densityPenalty + focusBonus);
}

function scoreCarrier(
  carrier: RuntimeCarrierRecord,
  occurrenceById: Map<string, RuntimeNeighborhoodOccurrence>,
  incidentCounts: Map<string, number>,
  focusOccurrenceId: string
) {
  const sourceOccurrence = occurrenceById.get(carrier.sourceOccurrenceId);
  const targetOccurrence = occurrenceById.get(carrier.targetOccurrenceId);
  const focusAdjacent =
    carrier.sourceOccurrenceId === focusOccurrenceId ||
    carrier.targetOccurrenceId === focusOccurrenceId;
  const proximityBoost = 2.8 - Math.min(sourceOccurrence?.distance ?? 3, targetOccurrence?.distance ?? 3);
  const salienceBoost =
    ((sourceOccurrence?.salience.normalizedScore ?? 0) * 1.6) +
    ((targetOccurrence?.salience.normalizedScore ?? 0) * 1.8);
  const departureBoost = carrier.departureStrength * 2.4;
  const priorityBoost =
    scorePriorityHint(sourceOccurrence) + scorePriorityHint(targetOccurrence);
  const rootBoost = sourceOccurrence?.ply === 0 ? 0.6 : 0;
  const terminalBoost = targetOccurrence?.terminal ? 0.8 : 0;
  const maxIncidentCount = Math.max(
    incidentCounts.get(carrier.sourceOccurrenceId) ?? 0,
    incidentCounts.get(carrier.targetOccurrenceId) ?? 0
  );
  const branchPenalty = maxIncidentCount >= 8 ? 0.55 : maxIncidentCount >= 6 ? 0.25 : 0;

  return (
    (focusAdjacent ? 5 : 0) +
    proximityBoost +
    salienceBoost +
    departureBoost +
    priorityBoost +
    rootBoost +
    terminalBoost -
    branchPenalty
  );
}

function scorePriorityHint(occurrence: RuntimeNeighborhoodOccurrence | undefined) {
  const rank = occurrence?.salience.priorityHint.priorityRank;

  if (rank === undefined) {
    return 0;
  }

  if (rank <= 1) {
    return 0.9;
  }

  if (rank <= 3) {
    return 0.45;
  }

  return 0;
}

function scoreOccurrenceLabel(occurrence: RuntimeNeighborhoodOccurrence) {
  return (
    (occurrence.isFocus ? 4 : 0) +
    ((2 - occurrence.distance) * 1.2) +
    (occurrence.salience.normalizedScore * 2.1)
  );
}

function resolveCarrierLabelOpacity(
  band: LabelZoomBand,
  rank: number,
  focusAdjacent: boolean
) {
  if (focusAdjacent) {
    return band === 'structure' ? 0.74 : band === 'tactical' ? 0.82 : 0.88;
  }

  const baseOpacity = band === 'structure' ? 0.46 : band === 'tactical' ? 0.58 : 0.68;
  return Math.max(0.28, baseOpacity - (rank * 0.05));
}

function resolveCarrierLabelScale(_band: LabelZoomBand, focusAdjacent: boolean) {
  if (focusAdjacent) {
    return 0.24;
  }

  return 0.2;
}

function resolveRootLabelOpacity(band: LabelZoomBand) {
  return band === 'structure' ? 0.7 : band === 'tactical' ? 0.62 : 0.56;
}

function resolveRootLabelScale(_band: LabelZoomBand) {
  return 0.22;
}

function resolveTerminalLabelOpacity(band: LabelZoomBand, focusLabel: boolean) {
  if (focusLabel) {
    return band === 'structure' ? 0.72 : band === 'tactical' ? 0.78 : 0.84;
  }

  return band === 'structure' ? 0.62 : band === 'tactical' ? 0.7 : 0.78;
}

function resolveTerminalLabelScale(_band: LabelZoomBand, focusLabel: boolean) {
  if (focusLabel) {
    return 0.24;
  }

  return 0.2;
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function incrementSelectedCounts(
  selectedCountsByOccurrenceId: Map<string, number>,
  carrier: RuntimeCarrierRecord
) {
  selectedCountsByOccurrenceId.set(
    carrier.sourceOccurrenceId,
    (selectedCountsByOccurrenceId.get(carrier.sourceOccurrenceId) ?? 0) + 1
  );
  selectedCountsByOccurrenceId.set(
    carrier.targetOccurrenceId,
    (selectedCountsByOccurrenceId.get(carrier.targetOccurrenceId) ?? 0) + 1
  );
}

function carrierKey(carrier: RuntimeCarrierRecord) {
  return `${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`;
}