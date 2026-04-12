import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  DoubleSide
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
import { formatGameName, formatTerminalOutcomeLabel } from './chessContext.ts';
import {
  advanceCameraOrbitState,
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
  SceneBootstrap,
  Vector3
} from './contracts';

type SmokeCanvasProps = {
  cameraGrammar: CameraGrammarState;
  cameraDistance: number;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  onCameraDistanceChange: (distance: number) => void;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
  orbitPreset: CameraOrbitPreset;
  orbitResetKey: number;
  renderTuning: ViewerRenderTuning;
  sceneBootstrap: SceneBootstrap;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
};

export function SmokeCanvas({
  cameraGrammar,
  cameraDistance,
  carrierSurface,
  onCameraDistanceChange,
  onFocusOccurrenceChange,
  orbitPreset,
  orbitResetKey,
  renderTuning,
  sceneBootstrap,
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
      <NeighborhoodCarriers carrierSurface={carrierSurface} renderTuning={renderTuning} />
      {runtimeSnapshot.occurrences.map((occurrence) => (
        <NeighborhoodNode
          accentColor={sceneBootstrap.accentColor}
          key={occurrence.occurrenceId}
          onFocusOccurrenceChange={onFocusOccurrenceChange}
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
        renderTuning={renderTuning}
        runtimeSnapshot={runtimeSnapshot}
      />
    </Canvas>
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

    camera.position.set(...cameraPosition);
    camera.lookAt(...scaledFocus);
  });

  return null;
}

function NeighborhoodNode({
  accentColor,
  onFocusOccurrenceChange,
  occurrence,
  radiusCap,
  renderTuning
}: {
  accentColor: string;
  onFocusOccurrenceChange: (occurrenceId: string) => void;
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
      position={position}
    >
      <mesh>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshStandardMaterial
          color={presentation.fillColor}
          emissive={occurrence.isFocus ? presentation.fillColor : '#000000'}
          emissiveIntensity={occurrence.isFocus ? 0.2 : 0}
          roughness={0.3}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[radius * 1.08, radius * 1.22, 32]} />
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
  renderTuning
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  renderTuning: ViewerRenderTuning;
}) {
  return [...carrierSurface.carriers]
    .sort((left, right) => left.departureStrength - right.departureStrength)
    .map((carrier) => (
      <NeighborhoodCarrier
        carrier={carrier}
        key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`}
        renderTuning={renderTuning}
      />
    ));
}

function NeighborhoodCarrier({
  carrier,
  renderTuning
}: {
  carrier: RuntimeCarrierRecord;
  renderTuning: ViewerRenderTuning;
}) {
  const presentation = createCarrierPresentation(carrier);
  const thicknessScale = renderTuning.carrierThicknessScale;
  const scaledSamples = useMemo(
    () => carrier.samples.map((sample) => scaleCoordinate(sample)),
    [carrier.samples]
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
    const label =
      carrier.sourceOccurrenceId === focusOccurrenceId
        ? `out ${carrier.san}`
        : carrier.targetOccurrenceId === focusOccurrenceId
          ? `in ${carrier.san}`
          : carrier.san;

    return (
      <LabelSprite
        backgroundColor={carrier.sourceOccurrenceId === focusOccurrenceId ? '#deebf4' : '#f7f1e6'}
        borderColor={carrier.sourceOccurrenceId === focusOccurrenceId ? '#3a6b87' : presentation.structureColor}
        key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}:label`}
        opacity={opacity}
        position={offsetLabelPosition(scaleCoordinate(centerSample), carrier.ply)}
        scale={scale * renderTuning.labelScale}
        text={label}
      />
    );
  });
}

function OccurrenceDataLabels({
  cameraDistance,
  carrierSurface,
  renderTuning,
  runtimeSnapshot
}: {
  cameraDistance: number;
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
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
      return [
        <LabelSprite
          backgroundColor="#f7f1e6"
          borderColor="#7a6a55"
          key={`${occurrence.occurrenceId}:root-label`}
          opacity={opacity}
          position={position}
          scale={scale * renderTuning.labelScale}
          text={formatGameName(occurrence.embedding.rootGameId)}
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
  scale,
  opacity
}: {
  text: string;
  position: Vector3;
  backgroundColor: string;
  borderColor: string;
  scale: number;
  opacity: number;
}) {
  const textureData = useMemo(
    () => createLabelTextureData(text, backgroundColor, borderColor),
    [backgroundColor, borderColor, text]
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
  borderColor: string
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
  context.fillStyle = '#231f18';
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