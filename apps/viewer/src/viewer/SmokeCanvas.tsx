import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  CanvasTexture,
  DoubleSide,
  Quaternion as ThreeQuaternion,
  TubeGeometry,
  Vector3 as ThreeVector3
} from 'three';
import type { CameraGrammarState } from './cameraGrammar.ts';
import { createCarrierRibbonGeometry } from './carrierRibbon.ts';
import {
  buildOccurrenceRadiusCaps,
  collectContextualResidueSamples,
  createCarrierPresentation,
  createOccurrencePresentation,
  scaleCoordinate
} from './carrierPresentation.ts';
import { formatSubtreeLabel, formatTerminalOutcomeLabel } from './chessContext.ts';
import {
  advanceCameraOrbitState,
  resolveOrbitUpVector,
  resolveOrbitCameraPosition
} from './cameraOrbit.ts';
import {
  clampLiveViewDistance,
  selectCarrierLabelSelections,
  selectOccurrenceLabelSelections
} from './labelPolicy.ts';
import type { ViewerRenderTuning } from './renderTuning.ts';
import type {
  CameraOrbitPreset,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeCarrierRecord,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  RuntimeTranspositionLink,
  RuntimeTranspositionOccurrence,
  RuntimeTranspositionSurfaceSnapshot,
  SceneBootstrap,
  Vector3
} from './contracts';

type SmokeCanvasProps = {
  cameraGrammar: CameraGrammarState;
  cameraDistance: number;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  onCameraDistanceChange: (distance: number) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  orbitPreset: CameraOrbitPreset;
  orbitResetKey: number;
  renderTuning: ViewerRenderTuning;
  sceneBootstrap: SceneBootstrap;
  transpositionSurface: RuntimeTranspositionSurfaceSnapshot;
  hoveredOccurrenceId: string | null;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
};

export function SmokeCanvas({
  cameraGrammar,
  cameraDistance,
  carrierSurface,
  onCameraDistanceChange,
  onFocusOccurrenceChange,
  onHoverOccurrenceChange,
  orbitPreset,
  orbitResetKey,
  renderTuning,
  sceneBootstrap,
  transpositionSurface,
  hoveredOccurrenceId,
  runtimeSnapshot
}: SmokeCanvasProps) {
  const occurrenceRadiusCaps = useMemo(
    () => buildOccurrenceRadiusCaps(runtimeSnapshot.occurrences),
    [runtimeSnapshot.occurrences]
  );

  return (
    <Canvas
      camera={{
        position: sceneBootstrap.camera.position,
        fov: sceneBootstrap.camera.fov,
        near: 0.1,
        far: 30
      }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <CameraRig
        cameraFocus={cameraGrammar.lookAt}
        cameraDistance={cameraDistance}
        onCameraDistanceChange={onCameraDistanceChange}
        orbitPreset={orbitPreset}
        orbitResetKey={orbitResetKey}
      />
      <color attach="background" args={['#f5f1e8']} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#fff9ef', '#ddd3c2', 1.08]} />
      <directionalLight position={[2.4, 3.2, 3.8]} intensity={1.18} />
      <directionalLight position={[-2.8, 2.2, 1.4]} intensity={0.42} color="#f1dcc2" />
      <TranspositionRelations
        onFocusOccurrenceChange={onFocusOccurrenceChange}
        onHoverOccurrenceChange={onHoverOccurrenceChange}
        hoveredOccurrenceId={hoveredOccurrenceId}
        transpositionSurface={transpositionSurface}
      />
      <NeighborhoodCarriers
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        renderTuning={renderTuning}
      />
      {runtimeSnapshot.occurrences.map((occurrence) => (
        <NeighborhoodNode
          accentColor={sceneBootstrap.accentColor}
          isHovered={hoveredOccurrenceId === occurrence.occurrenceId}
          key={occurrence.occurrenceId}
          onFocusOccurrenceChange={onFocusOccurrenceChange}
          onHoverOccurrenceChange={onHoverOccurrenceChange}
          occurrence={occurrence}
          radiusCap={occurrenceRadiusCaps.get(occurrence.occurrenceId)}
          renderTuning={renderTuning}
        />
      ))}
      <CarrierLabels
        cameraDistance={cameraDistance}
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        occurrences={runtimeSnapshot.occurrences}
        renderTuning={renderTuning}
      />
      <OccurrenceDataLabels
        cameraDistance={cameraDistance}
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        renderTuning={renderTuning}
        runtimeSnapshot={runtimeSnapshot}
      />
    </Canvas>
  );
}

function TranspositionRelations({
  hoveredOccurrenceId,
  onFocusOccurrenceChange,
  onHoverOccurrenceChange,
  transpositionSurface
}: {
  hoveredOccurrenceId: string | null;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  transpositionSurface: RuntimeTranspositionSurfaceSnapshot;
}) {
  const ghostOccurrences = transpositionSurface.groups
    .flatMap((group) => group.occurrences)
    .filter((occurrence) => !occurrence.isVisibleInNeighborhood)
    .sort((left, right) => {
      if (left.isFocus !== right.isFocus) {
        return left.isFocus ? -1 : 1;
      }

      if (left.subtreeKey !== right.subtreeKey) {
        return left.subtreeKey.localeCompare(right.subtreeKey);
      }

      return left.ply - right.ply;
    });
  const orderedLinks = [...transpositionSurface.links].sort((left, right) => {
    if (left.emphasis !== right.emphasis) {
      return left.emphasis === 'context' ? -1 : 1;
    }

    return `${left.sourceOccurrenceId}|${left.targetOccurrenceId}`.localeCompare(
      `${right.sourceOccurrenceId}|${right.targetOccurrenceId}`
    );
  });

  return (
    <group>
      {orderedLinks.map((link) => (
        <TranspositionRelationLink
          key={`${link.sourceOccurrenceId}:${link.targetOccurrenceId}:transposition`}
          link={link}
        />
      ))}
      {ghostOccurrences.map((occurrence) => (
        <TranspositionEchoOccurrence
          key={`${occurrence.occurrenceId}:transposition-echo`}
          isHovered={hoveredOccurrenceId === occurrence.occurrenceId}
          occurrence={occurrence}
          onFocusOccurrenceChange={onFocusOccurrenceChange}
          onHoverOccurrenceChange={onHoverOccurrenceChange}
        />
      ))}
    </group>
  );
}

function TranspositionRelationLink({
  link
}: {
  link: RuntimeTranspositionLink;
}) {
  const touchesGhost =
    !link.sourceVisibleInNeighborhood || !link.targetVisibleInNeighborhood;
  const scaledSamples = useMemo(
    () => link.samples.map((sample) => scaleCoordinate(sample)),
    [link.samples]
  );
  const curve = useMemo(
    () =>
      new CatmullRomCurve3(
        scaledSamples.map(
          (sample) => new ThreeVector3(sample[0], sample[1], sample[2])
        ),
        false,
        'centripetal'
      ),
    [scaledSamples]
  );
  const coreRadius = touchesGhost ? 0.0085 : link.emphasis === 'focus' ? 0.007 : 0.005;
  const haloRadius = coreRadius * 1.9;
  const tubeSegments = Math.max(28, scaledSamples.length * 12);
  const haloGeometry = useMemo(
    () => new TubeGeometry(curve, tubeSegments, haloRadius, 10, false),
    [curve, haloRadius, tubeSegments]
  );
  const coreGeometry = useMemo(
    () => new TubeGeometry(curve, tubeSegments, coreRadius, 10, false),
    [coreRadius, curve, tubeSegments]
  );
  const centerSample = scaledSamples[Math.floor(scaledSamples.length / 2)] ?? scaledSamples[0];
  const coreColor = link.emphasis === 'focus' ? '#0f172a' : '#334155';
  const haloColor = link.emphasis === 'focus' ? '#dbe7f6' : '#e2e8f0';

  useEffect(
    () => () => {
      haloGeometry.dispose();
      coreGeometry.dispose();
    },
    [coreGeometry, haloGeometry]
  );

  return (
    <group>
      <mesh renderOrder={4}>
        <primitive attach="geometry" object={haloGeometry} />
        <meshBasicMaterial
          color={haloColor}
          depthWrite={false}
          opacity={touchesGhost ? 0.72 : 0.42}
          transparent
        />
      </mesh>
      <mesh renderOrder={5}>
        <primitive attach="geometry" object={coreGeometry} />
        <meshStandardMaterial
          color={coreColor}
          depthWrite={false}
          emissive={coreColor}
          emissiveIntensity={touchesGhost ? 0.36 : 0.18}
          opacity={touchesGhost ? 0.92 : 0.78}
          roughness={0.18}
          transparent
        />
      </mesh>
      {centerSample ? (
        <mesh position={centerSample} renderOrder={6}>
          <sphereGeometry args={[touchesGhost ? 0.019 : 0.014, 14, 14]} />
          <meshBasicMaterial color="#d97706" depthWrite={false} transparent opacity={0.94} />
        </mesh>
      ) : null}
    </group>
  );
}

function TranspositionEchoOccurrence({
  isHovered,
  occurrence,
  onFocusOccurrenceChange,
  onHoverOccurrenceChange
}: {
  isHovered: boolean;
  occurrence: RuntimeTranspositionOccurrence;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
}) {
  const radius = 0.05;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onFocusOccurrenceChange(occurrence.occurrenceId);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHoverOccurrenceChange(null);
        setCanvasPointerCursor(event, 'grab');
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHoverOccurrenceChange(occurrence.occurrenceId);
        setCanvasPointerCursor(event, 'pointer');
      }}
      position={scaleCoordinate(occurrence.coordinate)}
    >
      <mesh renderOrder={7}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial
          color="#eff6ff"
          emissive="#dbeafe"
          emissiveIntensity={isHovered ? 0.72 : 0.4}
          opacity={0.94}
          roughness={0.18}
          transparent
        />
      </mesh>
      {isHovered ? (
        <mesh renderOrder={8}>
          <ringGeometry args={[radius * 1.88, radius * 2.08, 30]} />
          <meshBasicMaterial
            color="#38bdf8"
            depthWrite={false}
            opacity={0.92}
            side={DoubleSide}
            transparent
          />
        </mesh>
      ) : null}
      <mesh renderOrder={8}>
        <ringGeometry args={[radius * 1.34, radius * 1.7, 28]} />
        <meshBasicMaterial
          color="#0f172a"
          depthWrite={false}
          opacity={0.86}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh renderOrder={9}>
        <sphereGeometry args={[radius * 0.22, 10, 10]} />
        <meshBasicMaterial color="#d97706" depthWrite={false} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function CameraRig({
  cameraFocus,
  cameraDistance,
  onCameraDistanceChange,
  orbitPreset,
  orbitResetKey
}: {
  cameraFocus: Vector3;
  cameraDistance: number;
  onCameraDistanceChange: (distance: number) => void;
  orbitPreset: CameraOrbitPreset;
  orbitResetKey: number;
}) {
  const { camera, gl } = useThree();
  const scaledFocus = scaleCoordinate(cameraFocus);
  const orbitStateRef = useRef(orbitPreset);
  const dragStateRef = useRef({ active: false, pointerId: null as number | null, x: 0, y: 0 });
  const cameraDistanceRef = useRef(cameraDistance);

  useEffect(() => {
    cameraDistanceRef.current = cameraDistance;
  }, [cameraDistance]);

  useEffect(() => {
    orbitStateRef.current = orbitPreset;
  }, [orbitPreset, orbitResetKey]);

  useEffect(() => {
    const canvasElement = gl.domElement;
    const previousTouchAction = canvasElement.style.touchAction;
    const previousCursor = canvasElement.style.cursor;
    canvasElement.style.touchAction = 'none';
    canvasElement.style.cursor = 'grab';

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType !== 'touch') {
        return;
      }

      dragStateRef.current = {
        active: true,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY
      };
      canvasElement.style.cursor = 'grabbing';
      canvasElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState.active || dragState.pointerId !== event.pointerId) {
        return;
      }

      orbitStateRef.current = advanceCameraOrbitState(
        orbitStateRef.current,
        event.clientX - dragState.x,
        event.clientY - dragState.y
      );
      dragStateRef.current = {
        ...dragState,
        x: event.clientX,
        y: event.clientY
      };
    };

    const stopDragging = (event?: PointerEvent) => {
      if (
        event &&
        dragStateRef.current.pointerId !== null &&
        dragStateRef.current.pointerId !== event.pointerId
      ) {
        return;
      }

      dragStateRef.current = {
        active: false,
        pointerId: null,
        x: 0,
        y: 0
      };
      canvasElement.style.cursor = 'grab';
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      onCameraDistanceChange(
        clampLiveViewDistance(cameraDistanceRef.current + (event.deltaY * 0.0025))
      );
    };

    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      canvasElement.removeEventListener('pointerdown', handlePointerDown);
      canvasElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      canvasElement.style.touchAction = previousTouchAction;
      canvasElement.style.cursor = previousCursor;
    };
  }, [gl, onCameraDistanceChange]);

  useFrame(() => {
    const cameraPosition = resolveOrbitCameraPosition(
      scaledFocus,
      cameraDistance,
      orbitStateRef.current
    );
    const cameraUp = resolveOrbitUpVector(orbitStateRef.current);

    camera.position.set(...cameraPosition);
    camera.up.set(...cameraUp);
    camera.lookAt(...scaledFocus);
  });

  return null;
}

function NeighborhoodNode({
  accentColor,
  isHovered,
  onFocusOccurrenceChange,
  onHoverOccurrenceChange,
  occurrence,
  radiusCap,
  renderTuning
}: {
  accentColor: string;
  isHovered: boolean;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  occurrence: RuntimeNeighborhoodOccurrence;
  radiusCap: number | undefined;
  renderTuning: ViewerRenderTuning;
}) {
  const position = scaleCoordinate(occurrence.embedding.coordinate);
  const presentation = createOccurrencePresentation(
    occurrence,
    accentColor,
    radiusCap,
    renderTuning.nodeRadiusScale
  );
  const radius = occurrence.isFocus ? presentation.radius * 1.06 : presentation.radius;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onFocusOccurrenceChange(occurrence.occurrenceId);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHoverOccurrenceChange(null);
        setCanvasPointerCursor(event, 'grab');
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHoverOccurrenceChange(occurrence.occurrenceId);
        setCanvasPointerCursor(event, 'pointer');
      }}
      position={position}
    >
      <mesh>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={presentation.fillColor}
          emissive={occurrence.isFocus || isHovered ? presentation.fillColor : '#000000'}
          emissiveIntensity={occurrence.isFocus ? 0.2 : isHovered ? 0.1 : 0}
          roughness={0.3}
        />
      </mesh>
      {isHovered && !occurrence.isFocus ? (
        <mesh>
          <ringGeometry args={[radius * 1.42, radius * 1.62, 36]} />
          <meshBasicMaterial
            color="#38bdf8"
            depthWrite={false}
            opacity={0.9}
            side={DoubleSide}
            transparent
          />
        </mesh>
      ) : null}
      <mesh>
        <ringGeometry args={[radius * 1.08, radius * 1.18, 32]} />
        <meshBasicMaterial
          color={presentation.phaseRingColor}
          depthWrite={false}
          opacity={0.88}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 0.24, 14, 14]} />
        <meshStandardMaterial
          color={presentation.centerMarkColor}
          emissive={presentation.centerMarkColor}
          emissiveIntensity={0.12}
          roughness={0.22}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 1.22, radius * 1.36, 32]} />
        <meshBasicMaterial
          color={presentation.ringColor}
          depthWrite={false}
          opacity={occurrence.isFocus ? 0.78 : 0.38}
          side={DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}

function NeighborhoodCarriers({
  carrierSurface,
  focusOccurrenceId,
  renderTuning
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOccurrenceId: string;
  renderTuning: ViewerRenderTuning;
}) {
  return [...carrierSurface.carriers]
    .sort((left, right) => left.departureStrength - right.departureStrength)
    .map((carrier) => (
      <NeighborhoodCarrier
        carrier={carrier}
        focusOccurrenceId={focusOccurrenceId}
        key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`}
        renderTuning={renderTuning}
      />
    ));
}

function NeighborhoodCarrier({
  carrier,
  focusOccurrenceId,
  renderTuning
}: {
  carrier: RuntimeCarrierRecord;
  focusOccurrenceId: string;
  renderTuning: ViewerRenderTuning;
}) {
  const presentation = createCarrierPresentation(carrier);
  const thicknessScale = renderTuning.carrierThicknessScale;
  const directionRelation = resolveCarrierFocusRelation(carrier, focusOccurrenceId);
  const scaledSamples = useMemo(
    () => carrier.samples.map((sample) => scaleCoordinate(sample)),
    [carrier.samples]
  );
  const directionMarkers = useMemo(
    () => resolveCarrierDirectionMarkers(scaledSamples),
    [scaledSamples]
  );
  const haloRibbonGeometry = useMemo(
    () =>
      createCarrierRibbonGeometry({
        samples: scaledSamples,
        halfWidth: presentation.haloRadius * thicknessScale,
        twist: carrier.twist,
        surfaceOffset: -0.003
      }),
    [carrier.twist, presentation.haloRadius, scaledSamples, thicknessScale]
  );
  const structureRibbonGeometry = useMemo(
    () =>
      createCarrierRibbonGeometry({
        samples: scaledSamples,
        halfWidth: presentation.structureRadius * thicknessScale,
        twist: carrier.twist
      }),
    [carrier.twist, presentation.structureRadius, scaledSamples, thicknessScale]
  );
  const tacticalRibbonGeometry = useMemo(
    () =>
      createCarrierRibbonGeometry({
        samples: scaledSamples,
        halfWidth: presentation.tacticalRadius * thicknessScale,
        twist: carrier.twist,
        surfaceOffset: 0.003
      }),
    [carrier.twist, presentation.tacticalRadius, scaledSamples, thicknessScale]
  );
  const contextualResidueSamples = carrier.activeBands.includes('contextual')
    ? collectContextualResidueSamples(carrier)
    : [];

  useEffect(
    () => () => {
      haloRibbonGeometry.dispose();
      structureRibbonGeometry.dispose();
      tacticalRibbonGeometry.dispose();
    },
    [haloRibbonGeometry, structureRibbonGeometry, tacticalRibbonGeometry]
  );

  return (
    <group>
      <mesh renderOrder={1}>
        <primitive attach="geometry" object={haloRibbonGeometry} />
        <meshBasicMaterial
          color={presentation.haloColor}
          depthWrite={false}
          opacity={0.24 * renderTuning.carrierHaloOpacityScale}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh renderOrder={2}>
        <primitive attach="geometry" object={structureRibbonGeometry} />
        <meshStandardMaterial
          color={presentation.structureColor}
          emissive={presentation.structureColor}
          emissiveIntensity={presentation.emissiveIntensity}
          roughness={0.28}
          side={DoubleSide}
        />
      </mesh>
      {carrier.activeBands.includes('tactical') ? (
        <mesh renderOrder={3}>
          <primitive attach="geometry" object={tacticalRibbonGeometry} />
          <meshStandardMaterial
            color={presentation.tacticalColor}
            emissive={presentation.tacticalColor}
            emissiveIntensity={0.28}
            opacity={0.76}
            roughness={0.18}
            side={DoubleSide}
            transparent
          />
        </mesh>
      ) : null}
      {directionMarkers.map((marker) => (
        <mesh
          key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}:direction:${marker.kind}`}
          position={marker.position}
          quaternion={marker.quaternion}
          renderOrder={5}
        >
          <coneGeometry args={[marker.radius * (0.72 + thicknessScale), marker.height * (0.72 + thicknessScale), 12]} />
          <meshBasicMaterial
            color={resolveCarrierDirectionColor(directionRelation, presentation.structureColor)}
            depthWrite={false}
            opacity={marker.opacity}
            transparent
          />
        </mesh>
      ))}
      {contextualResidueSamples.map((sample, index) => (
        <mesh key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}:context:${index}`} position={scaleCoordinate(sample)} renderOrder={4}>
          <sphereGeometry args={[presentation.contextualDotRadius * thicknessScale, 10, 10]} />
          <meshStandardMaterial
            color={presentation.contextualColor}
            emissive={presentation.contextualColor}
            emissiveIntensity={0.36}
            roughness={0.22}
          />
        </mesh>
      ))}
    </group>
  );
}

function CarrierLabels({
  cameraDistance,
  carrierSurface,
  focusOccurrenceId,
  renderTuning,
  occurrences
}: {
  cameraDistance: number;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOccurrenceId: string;
  renderTuning: ViewerRenderTuning;
  occurrences: RuntimeNeighborhoodOccurrence[];
}) {
  const labeledCarriers = useMemo(
    () =>
      selectCarrierLabelSelections({
        cameraDistance,
        carriers: carrierSurface.carriers,
        focusOccurrenceId,
        occurrences
      }),
    [cameraDistance, carrierSurface.carriers, focusOccurrenceId, occurrences]
  );

  return labeledCarriers.map(({ carrier, opacity, scale }) => {
    const centerSample =
      carrier.samples[Math.floor(carrier.samples.length * 0.5)] ?? carrier.samples[0];
    if (!centerSample) {
      return null;
    }

    const presentation = createCarrierPresentation(carrier);

    return (
      <LabelSprite
        backgroundColor="#f7f1e6"
        borderColor={presentation.structureColor}
        key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}:label`}
        opacity={opacity}
        position={offsetLabelPosition(scaleCoordinate(centerSample), carrier.ply)}
        scale={scale * renderTuning.labelScale}
        text={carrier.san}
      />
    );
  });
}

function OccurrenceDataLabels({
  cameraDistance,
  carrierSurface,
  focusOccurrenceId,
  renderTuning,
  runtimeSnapshot
}: {
  cameraDistance: number;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOccurrenceId: string;
  renderTuning: ViewerRenderTuning;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
}) {
  const labelSelections = useMemo(
    () =>
      selectOccurrenceLabelSelections({
        cameraDistance,
        occurrences: runtimeSnapshot.occurrences
      }),
    [cameraDistance, runtimeSnapshot.occurrences]
  );

  return labelSelections.flatMap(({ kind, occurrence, opacity, scale }) => {
    const position = offsetNodeLabelPosition(scaleCoordinate(occurrence.embedding.coordinate));

    if (kind === 'root') {
      const isFocus = occurrence.occurrenceId === focusOccurrenceId;

      return [
        <LabelSprite
          backgroundColor={isFocus ? '#fff7d8' : '#f7f1e6'}
          borderColor={isFocus ? '#b7791f' : '#7a6a55'}
          key={`${occurrence.occurrenceId}:root-label`}
          opacity={opacity}
          position={position}
          scale={scale * renderTuning.labelScale}
          text={formatSubtreeLabel(occurrence.embedding.subtreeKey)}
          textColor={isFocus ? '#7c2d12' : undefined}
        />
      ];
    }

    const terminal = occurrence.terminal;
    if (!terminal) {
      return [];
    }

    const incomingCarrier = carrierSurface.carriers.find(
      (carrier) => carrier.targetOccurrenceId === occurrence.occurrenceId
    );
    const outcome = formatTerminalOutcomeLabel(terminal.wdlLabel);
    const label = incomingCarrier?.san ? `${incomingCarrier.san} · ${outcome}` : outcome;

    return [
      <LabelSprite
        backgroundColor="#eef7ee"
        borderColor="#2f6b38"
        key={`${occurrence.occurrenceId}:terminal-label`}
        opacity={opacity}
        position={position}
        scale={scale * renderTuning.labelScale}
        text={label}
      />
    ];
  });
}

function LabelSprite({
  text,
  position,
  backgroundColor,
  borderColor,
  textColor,
  scale,
  opacity
}: {
  text: string;
  position: Vector3;
  backgroundColor: string;
  borderColor: string;
  textColor?: string;
  scale: number;
  opacity: number;
}) {
  const textureData = useMemo(
    () => createLabelTextureData(text, backgroundColor, borderColor, textColor),
    [backgroundColor, borderColor, text, textColor]
  );

  useEffect(() => () => textureData.texture.dispose(), [textureData]);

  return (
    <sprite position={position} renderOrder={10} scale={[scale * textureData.aspect, scale, 1]}>
      <spriteMaterial depthWrite={false} map={textureData.texture} opacity={opacity} transparent />
    </sprite>
  );
}

function createLabelTextureData(
  text: string,
  backgroundColor: string,
  borderColor: string,
  textColor = '#231f18'
) {
  const pixelRatio = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const fontSize = 22;
  const paddingX = 8;
  const paddingY = 6;
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');
  if (!measureContext) {
    const fallbackCanvas = document.createElement('canvas');
    return {
      texture: new CanvasTexture(fallbackCanvas),
      aspect: 2.4
    };
  }

  measureContext.font = `700 ${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  const textWidth = Math.ceil(measureContext.measureText(text).width);
  const width = textWidth + (paddingX * 2);
  const height = fontSize + (paddingY * 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * pixelRatio);
  canvas.height = Math.ceil(height * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) {
    return {
      texture: new CanvasTexture(canvas),
      aspect: width / height
    };
  }

  context.scale(pixelRatio, pixelRatio);
  context.font = `700 ${fontSize}px "Avenir Next", "Segoe UI", sans-serif`;
  context.textBaseline = 'middle';
  context.lineWidth = 2;

  drawRoundedRect(context, 1, 1, width - 2, height - 2, height / 2, backgroundColor, borderColor);
  context.fillStyle = textColor;
  context.fillText(text, paddingX, height / 2);

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;

  return {
    texture,
    aspect: width / height
  };
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor: string,
  strokeColor: string
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fillStyle = fillColor;
  context.fill();
  context.strokeStyle = strokeColor;
  context.stroke();
}

function offsetLabelPosition(position: Vector3, ply: number): Vector3 {
  const verticalOffset = (ply % 2) === 0 ? 0.16 : 0.22;
  const lateralOffset = (ply % 2) === 0 ? -0.04 : 0.05;

  return [position[0] + lateralOffset, position[1] + verticalOffset, position[2]];
}

function offsetNodeLabelPosition(position: Vector3): Vector3 {
  return [position[0], position[1] + 0.28, position[2]];
}

function resolveCarrierFocusRelation(
  carrier: RuntimeCarrierRecord,
  focusOccurrenceId: string
) {
  if (carrier.sourceOccurrenceId === focusOccurrenceId) {
    return 'outgoing';
  }

  if (carrier.targetOccurrenceId === focusOccurrenceId) {
    return 'incoming';
  }

  return 'ambient';
}

function resolveCarrierDirectionColor(
  directionRelation: 'outgoing' | 'incoming' | 'ambient',
  structureColor: string
) {
  if (directionRelation === 'outgoing') {
    return '#2563eb';
  }

  if (directionRelation === 'incoming') {
    return '#c2410c';
  }

  return structureColor;
}

function resolveCarrierDirectionMarkers(samples: Vector3[]) {
  if (samples.length < 2) {
    return [];
  }

  return [
    {
      kind: 'arrow-tip',
      ...resolveCarrierDirectionFrame(samples, 0.93),
      radius: 0.015,
      height: 0.072,
      opacity: 0.82
    }
  ] as const;
}

function resolveCarrierDirectionFrame(samples: Vector3[], progress: number) {
  const lastIndex = samples.length - 1;
  const index = Math.max(0, Math.min(lastIndex, Math.round(lastIndex * progress)));
  const previousSample = samples[Math.max(0, index - 1)] ?? samples[index]!;
  const nextSample = samples[Math.min(lastIndex, index + 1)] ?? samples[index]!;
  const tangent = normalizeMarkerTangent(subtractVector3(nextSample, previousSample));
  const quaternion = new ThreeQuaternion().setFromUnitVectors(
    new ThreeVector3(0, 1, 0),
    new ThreeVector3(tangent[0], tangent[1], tangent[2])
  );

  return {
    position: samples[index] ?? samples[0]!,
    quaternion
  };
}

function subtractVector3(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function normalizeMarkerTangent(vector: Vector3): Vector3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length <= 1e-6) {
    return [0, 1, 0];
  }

  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function setCanvasPointerCursor(
  event: { nativeEvent: PointerEvent },
  cursor: 'grab' | 'pointer'
) {
  const target = event.nativeEvent.target;
  if (target instanceof HTMLCanvasElement) {
    target.style.cursor = cursor;
  }
}