import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  DoubleSide,
  Quaternion as ThreeQuaternion,
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
  normalizeCameraOrbitState,
  resolveCameraLookVector,
  resolveDetachedKeyboardOrbit,
  resolveDetachedKeyboardTranslation,
  resolveOrbitUpVector,
} from './cameraOrbit.ts';
import {
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
  SceneBootstrap,
  Vector3
} from './contracts';

type SmokeCanvasProps = {
  cameraGrammar: CameraGrammarState;
  cameraOrbit: CameraOrbitPreset;
  cameraPosition: Vector3;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  onCameraPoseChange: (position: Vector3, orbit: CameraOrbitPreset) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  onHoverOccurrenceChange: (occurrenceId: string | null) => void;
  onResetCameraPose: () => void;
  renderTuning: ViewerRenderTuning;
  sceneBootstrap: SceneBootstrap;
  hoveredOccurrenceId: string | null;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
};

const CAMERA_POSE_MIN_REPORT_MS = 120;
const CAMERA_POSE_MAX_REPORT_MS = 260;
const CAMERA_POSE_POSITION_EPSILON = 0.22;
const CAMERA_POSE_ORBIT_EPSILON = 0.08;
const KEYBOARD_TURN_RATE = 1.9;
const KEYBOARD_PITCH_RATE = 1.45;
const DETACHED_CONTROL_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'q',
  'e',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright'
]);

const labelTextureCache = new Map<
  string,
  { texture: CanvasTexture; aspect: number }
>();

export function SmokeCanvas({
  cameraGrammar,
  cameraOrbit,
  cameraPosition,
  carrierSurface,
  onCameraPoseChange,
  onFocusOccurrenceChange,
  onHoverOccurrenceChange,
  onResetCameraPose,
  renderTuning,
  sceneBootstrap,
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
      dpr={[1, 1.5]}
      gl={{ antialias: true }}
    >
      <CameraRig
        cameraOrbit={cameraOrbit}
        cameraPosition={cameraPosition}
        onCameraPoseChange={onCameraPoseChange}
        onResetCameraPose={onResetCameraPose}
        travelSpeed={Math.max(
          1.2,
          Math.min(4.8, (cameraGrammar.cameraDistance * 0.82) + 0.65)
        )}
      />
      <color attach="background" args={['#f5f1e8']} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#fff9ef', '#ddd3c2', 1.08]} />
      <directionalLight position={[2.4, 3.2, 3.8]} intensity={1.18} />
      <directionalLight position={[-2.8, 2.2, 1.4]} intensity={0.42} color="#f1dcc2" />
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
        cameraDistance={cameraGrammar.cameraDistance}
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        occurrences={runtimeSnapshot.occurrences}
        renderTuning={renderTuning}
      />
      <OccurrenceDataLabels
        cameraDistance={cameraGrammar.cameraDistance}
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        renderTuning={renderTuning}
        runtimeSnapshot={runtimeSnapshot}
      />
    </Canvas>
  );
}

function CameraRig({
  cameraOrbit,
  cameraPosition,
  onCameraPoseChange,
  onResetCameraPose,
  travelSpeed
}: {
  cameraOrbit: CameraOrbitPreset;
  cameraPosition: Vector3;
  onCameraPoseChange: (position: Vector3, orbit: CameraOrbitPreset) => void;
  onResetCameraPose: () => void;
  travelSpeed: number;
}) {
  const { camera, gl } = useThree();
  const orbitStateRef = useRef(cameraOrbit);
  const positionRef = useRef(cameraPosition);
  const dragStateRef = useRef({ active: false, pointerId: null as number | null, x: 0, y: 0 });
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const lastReportAtRef = useRef(0);
  const viewDirtyRef = useRef(false);
  const lastPublishedPoseRef = useRef({
    position: roundVector3(cameraPosition),
    orbit: roundOrbit(cameraOrbit)
  });

  useEffect(() => {
    orbitStateRef.current = cameraOrbit;
  }, [cameraOrbit]);

  useEffect(() => {
    positionRef.current = cameraPosition;
  }, [cameraPosition]);

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
      viewDirtyRef.current = true;
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
      publishPose(true);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const lookVector = resolveCameraLookVector(orbitStateRef.current);
      const dollyStep = Math.max(0.16, travelSpeed * 0.18);

      positionRef.current = addVector3(
        positionRef.current,
        scaleVector3(lookVector, -event.deltaY * 0.0028 * dollyStep)
      );
      viewDirtyRef.current = true;
      publishPose(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();

        if (!event.repeat) {
          onResetCameraPose();
        }

        return;
      }

      const key = event.key.toLowerCase();
      if (DETACHED_CONTROL_KEYS.has(key)) {
        event.preventDefault();
      }

      pressedKeysRef.current.add(key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key.toLowerCase());
    };

    canvasElement.addEventListener('pointerdown', handlePointerDown);
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      canvasElement.removeEventListener('pointerdown', handlePointerDown);
      canvasElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasElement.style.touchAction = previousTouchAction;
      canvasElement.style.cursor = previousCursor;
    };
  }, [gl, onCameraPoseChange, onResetCameraPose, travelSpeed]);

  useFrame((_, delta) => {
    const frameDelta = Math.min(delta, 0.05);
    const nextOrbit = resolveDetachedKeyboardOrbit(
      pressedKeysRef.current,
      orbitStateRef.current,
      frameDelta * KEYBOARD_TURN_RATE,
      frameDelta * KEYBOARD_PITCH_RATE
    );

    if (
      nextOrbit.azimuth !== orbitStateRef.current.azimuth ||
      nextOrbit.elevation !== orbitStateRef.current.elevation
    ) {
      orbitStateRef.current = nextOrbit;
      viewDirtyRef.current = true;
    }

    const movement = resolveDetachedKeyboardTranslation(
      pressedKeysRef.current,
      orbitStateRef.current,
      frameDelta * travelSpeed
    );

    if (movement) {
      positionRef.current = addVector3(positionRef.current, movement);
      viewDirtyRef.current = true;
    }

    const lookVector = resolveCameraLookVector(orbitStateRef.current);
    const cameraUp = resolveOrbitUpVector(orbitStateRef.current);

    camera.position.set(...positionRef.current);
    camera.up.set(...cameraUp);
    camera.lookAt(
      positionRef.current[0] + lookVector[0],
      positionRef.current[1] + lookVector[1],
      positionRef.current[2] + lookVector[2]
    );
    publishPose(false);
  });

  function publishPose(force: boolean) {
    if (!viewDirtyRef.current && !force) {
      return;
    }

    const now = performance.now();
    const interval = now - lastReportAtRef.current;

    if (!force && interval < CAMERA_POSE_MIN_REPORT_MS) {
      return;
    }

    const nextPosition = roundVector3(positionRef.current);
    const nextOrbit = roundOrbit(orbitStateRef.current);
    const lastPublishedPose = lastPublishedPoseRef.current;
    const positionDelta = distanceBetweenVector3(
      nextPosition,
      lastPublishedPose.position
    );
    const orbitDelta = resolveOrbitDelta(nextOrbit, lastPublishedPose.orbit);

    if (
      !force &&
      interval < CAMERA_POSE_MAX_REPORT_MS &&
      positionDelta < CAMERA_POSE_POSITION_EPSILON &&
      orbitDelta < CAMERA_POSE_ORBIT_EPSILON
    ) {
      return;
    }

    lastReportAtRef.current = now;
    lastPublishedPoseRef.current = {
      position: nextPosition,
      orbit: nextOrbit
    };
    viewDirtyRef.current = false;
    onCameraPoseChange(nextPosition, nextOrbit);
  }

  return null;
}

function addVector3(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scaleVector3(vector: Vector3, scale: number): Vector3 {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function roundVector3(vector: Vector3): Vector3 {
  return [roundNumber(vector[0]), roundNumber(vector[1]), roundNumber(vector[2])];
}

function roundOrbit(orbit: CameraOrbitPreset): CameraOrbitPreset {
  const normalizedOrbit = normalizeCameraOrbitState(orbit);

  return {
    azimuth: roundNumber(normalizedOrbit.azimuth),
    elevation: roundNumber(normalizedOrbit.elevation)
  };
}

function roundNumber(value: number) {
  return Number(value.toFixed(6));
}

function distanceBetweenVector3(left: Vector3, right: Vector3) {
  return Math.hypot(
    left[0] - right[0],
    left[1] - right[1],
    left[2] - right[2]
  );
}

function resolveOrbitDelta(
  left: CameraOrbitPreset,
  right: CameraOrbitPreset
) {
  return Math.max(
    Math.abs(resolveAngleDelta(left.azimuth, right.azimuth)),
    Math.abs(left.elevation - right.elevation)
  );
}

function resolveAngleDelta(left: number, right: number) {
  return Math.atan2(Math.sin(left - right), Math.cos(left - right));
}

const NeighborhoodNode = memo(function NeighborhoodNode({
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
  const radiusScale = resolveOccurrenceLodRadiusScale(occurrence.lod);
  const fillOpacity = resolveOccurrenceLodOpacity(occurrence.lod, occurrence.isFocus);
  const ringOpacity = resolveOccurrenceRingOpacity(occurrence.lod, occurrence.isFocus);
  const radius =
    (occurrence.isFocus ? presentation.radius * 1.06 : presentation.radius) * radiusScale;

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
          opacity={fillOpacity}
          roughness={0.3}
          transparent={fillOpacity < 0.999}
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
          opacity={Math.min(0.88, fillOpacity + 0.1)}
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
          opacity={ringOpacity}
          side={DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
});

function resolveOccurrenceLodRadiusScale(
  lod: RuntimeNeighborhoodOccurrence['lod']
) {
  if (lod === 'distant') {
    return 0.72;
  }

  if (lod === 'context') {
    return 0.84;
  }

  return 1;
}

function resolveOccurrenceLodOpacity(
  lod: RuntimeNeighborhoodOccurrence['lod'],
  isFocus: boolean
) {
  if (isFocus) {
    return 1;
  }

  if (lod === 'distant') {
    return 0.58;
  }

  if (lod === 'context') {
    return 0.76;
  }

  return 0.94;
}

function resolveOccurrenceRingOpacity(
  lod: RuntimeNeighborhoodOccurrence['lod'],
  isFocus: boolean
) {
  if (isFocus) {
    return 0.78;
  }

  if (lod === 'distant') {
    return 0.18;
  }

  if (lod === 'context') {
    return 0.28;
  }

  return 0.38;
}

const NeighborhoodCarriers = memo(function NeighborhoodCarriers({
  carrierSurface,
  focusOccurrenceId,
  renderTuning
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOccurrenceId: string;
  renderTuning: ViewerRenderTuning;
}) {
  const sortedCarriers = useMemo(
    () =>
      [...carrierSurface.carriers].sort(
        (left, right) => left.departureStrength - right.departureStrength
      ),
    [carrierSurface.carriers]
  );

  return sortedCarriers.map((carrier) => (
    <NeighborhoodCarrier
      carrier={carrier}
      focusOccurrenceId={focusOccurrenceId}
      key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`}
      renderTuning={renderTuning}
    />
  ));
});

const NeighborhoodCarrier = memo(function NeighborhoodCarrier({
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
});

const CarrierLabels = memo(function CarrierLabels({
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
});

const OccurrenceDataLabels = memo(function OccurrenceDataLabels({
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
});

const LabelSprite = memo(function LabelSprite({
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

  return (
    <sprite position={position} renderOrder={10} scale={[scale * textureData.aspect, scale, 1]}>
      <spriteMaterial depthWrite={false} map={textureData.texture} opacity={opacity} transparent />
    </sprite>
  );
});

function createLabelTextureData(
  text: string,
  backgroundColor: string,
  borderColor: string,
  textColor = '#231f18'
) {
  const cacheKey = `${text}|${backgroundColor}|${borderColor}|${textColor}`;
  const cachedTexture = labelTextureCache.get(cacheKey);

  if (cachedTexture) {
    return cachedTexture;
  }

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

  const textureData = {
    texture,
    aspect: width / height
  };

  labelTextureCache.set(cacheKey, textureData);

  return textureData;
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