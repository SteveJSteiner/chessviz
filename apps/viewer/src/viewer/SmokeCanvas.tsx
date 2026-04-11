import { Canvas, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import {
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  Vector3 as ThreeVector3
} from 'three';
import {
  collectContextualResidueSamples,
  createCarrierPresentation,
  createOccurrencePresentation,
  scaleCoordinate
} from './carrierPresentation.ts';
import { formatGameName, formatTerminalOutcomeLabel } from './chessContext.ts';
import type {
  NavigationEntryPoint,
  RuntimeCarrierSurfaceSnapshot,
  RuntimeCarrierRecord,
  RuntimeNeighborhoodOccurrence,
  RuntimeNeighborhoodSnapshot,
  SceneBootstrap,
  Vector3
} from './contracts';

type SmokeCanvasProps = {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  sceneBootstrap: SceneBootstrap;
  navigationEntryPoint: NavigationEntryPoint;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
};

export function SmokeCanvas({
  carrierSurface,
  sceneBootstrap,
  navigationEntryPoint,
  runtimeSnapshot
}: SmokeCanvasProps) {
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
        navigationEntryPoint={navigationEntryPoint}
        sceneBootstrap={sceneBootstrap}
      />
      <color attach="background" args={['#f5f1e8']} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#fff9ef', '#ddd3c2', 1.08]} />
      <directionalLight position={[2.4, 3.2, 3.8]} intensity={1.18} />
      <directionalLight position={[-2.8, 2.2, 1.4]} intensity={0.42} color="#f1dcc2" />
      <NeighborhoodCarriers carrierSurface={carrierSurface} />
      {runtimeSnapshot.occurrences.map((occurrence) => (
        <NeighborhoodNode
          accentColor={sceneBootstrap.accentColor}
          key={occurrence.occurrenceId}
          occurrence={occurrence}
        />
      ))}
      <CarrierLabels
        carrierSurface={carrierSurface}
        focusOccurrenceId={runtimeSnapshot.focusOccurrenceId}
        refinementBudget={runtimeSnapshot.refinementBudget}
      />
      <OccurrenceDataLabels
        carrierSurface={carrierSurface}
        runtimeSnapshot={runtimeSnapshot}
      />
      <mesh position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.65, 2.2, 72]} />
        <meshStandardMaterial color="#d9cfbe" opacity={0.82} roughness={0.8} transparent />
      </mesh>
      <mesh position={[0, -1.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.48, 72]} />
        <meshStandardMaterial color="#f2eadb" opacity={0.9} roughness={0.92} transparent />
      </mesh>
    </Canvas>
  );
}

function CameraRig({
  navigationEntryPoint,
  sceneBootstrap
}: {
  navigationEntryPoint: NavigationEntryPoint;
  sceneBootstrap: SceneBootstrap;
}) {
  const { camera } = useThree();
  const scaledFocus = scaleCoordinate(navigationEntryPoint.focus);

  useEffect(() => {
    camera.position.set(
      scaledFocus[0] + sceneBootstrap.camera.position[0],
      scaledFocus[1] + sceneBootstrap.camera.position[1],
      scaledFocus[2] + navigationEntryPoint.distance
    );
    camera.lookAt(...scaledFocus);
  }, [camera, scaledFocus, sceneBootstrap]);

  return null;
}

function NeighborhoodNode({
  accentColor,
  occurrence
}: {
  accentColor: string;
  occurrence: RuntimeNeighborhoodOccurrence;
}) {
  const position = scaleCoordinate(occurrence.embedding.coordinate);
  const presentation = createOccurrencePresentation(occurrence, accentColor);
  const radius = occurrence.isFocus ? presentation.radius * 1.18 : presentation.radius;

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[presentation.haloRadius, 18, 18]} />
        <meshBasicMaterial
          color={presentation.haloColor}
          depthWrite={false}
          opacity={occurrence.isFocus ? 0.44 : 0.2}
          transparent
        />
      </mesh>
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
        <ringGeometry args={[radius * 1.14, radius * 1.34, 32]} />
        <meshBasicMaterial
          color={presentation.ringColor}
          depthWrite={false}
          opacity={occurrence.isFocus ? 0.92 : 0.54}
          side={DoubleSide}
          transparent
        />
      </mesh>
    </group>
  );
}

function NeighborhoodCarriers({
  carrierSurface
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
}) {
  return [...carrierSurface.carriers]
    .sort((left, right) => left.departureStrength - right.departureStrength)
    .map((carrier) => (
      <NeighborhoodCarrier
        carrier={carrier}
        key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}`}
      />
    ));
}

function NeighborhoodCarrier({
  carrier
}: {
  carrier: RuntimeCarrierRecord;
}) {
  const presentation = createCarrierPresentation(carrier);
  const curve = new CatmullRomCurve3(
    carrier.samples.map(
      (sample) => new ThreeVector3(...scaleCoordinate(sample))
    )
  );
  const tubularSegments = Math.max(30, carrier.samples.length * 6);
  const contextualResidueSamples = carrier.activeBands.includes('contextual')
    ? collectContextualResidueSamples(carrier)
    : [];

  return (
    <group>
      <mesh renderOrder={1}>
        <tubeGeometry
          args={[curve, tubularSegments, presentation.haloRadius, 10, false]}
        />
        <meshBasicMaterial
          color={presentation.haloColor}
          depthWrite={false}
          opacity={0.24}
          side={DoubleSide}
          transparent
        />
      </mesh>
      <mesh renderOrder={2}>
        <tubeGeometry
          args={[curve, tubularSegments, presentation.structureRadius, 12, false]}
        />
        <meshStandardMaterial
          color={presentation.structureColor}
          emissive={presentation.structureColor}
          emissiveIntensity={presentation.emissiveIntensity}
          roughness={0.28}
        />
      </mesh>
      {carrier.activeBands.includes('tactical') ? (
        <mesh renderOrder={3}>
          <tubeGeometry
            args={[curve, tubularSegments, presentation.tacticalRadius, 8, false]}
          />
          <meshStandardMaterial
            color={presentation.tacticalColor}
            emissive={presentation.tacticalColor}
            emissiveIntensity={0.42}
            opacity={0.92}
            roughness={0.18}
            transparent
          />
        </mesh>
      ) : null}
      {contextualResidueSamples.map((sample, index) => (
        <mesh key={`${carrier.sourceOccurrenceId}:${carrier.targetOccurrenceId}:context:${index}`} position={scaleCoordinate(sample)} renderOrder={4}>
          <sphereGeometry args={[presentation.contextualDotRadius, 10, 10]} />
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
  carrierSurface,
  focusOccurrenceId,
  refinementBudget
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  focusOccurrenceId: string;
  refinementBudget: number;
}) {
  const labeledCarriers = useMemo(() => {
    const maxLabels = refinementBudget <= 3 ? 3 : refinementBudget <= 6 ? 6 : Number.POSITIVE_INFINITY;

    return [...carrierSurface.carriers]
      .sort((left, right) => scoreCarrierForLabel(right, focusOccurrenceId) - scoreCarrierForLabel(left, focusOccurrenceId))
      .slice(0, maxLabels);
  }, [carrierSurface.carriers, focusOccurrenceId, refinementBudget]);

  return labeledCarriers.map((carrier) => {
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
        opacity={carrier.sourceOccurrenceId === focusOccurrenceId || carrier.targetOccurrenceId === focusOccurrenceId ? 0.98 : refinementBudget >= 12 ? 0.84 : 0.72}
        position={offsetLabelPosition(scaleCoordinate(centerSample), carrier.ply)}
        scale={carrier.sourceOccurrenceId === focusOccurrenceId || carrier.targetOccurrenceId === focusOccurrenceId ? 0.54 : 0.46}
        text={label}
      />
    );
  });
}

function OccurrenceDataLabels({
  carrierSurface,
  runtimeSnapshot
}: {
  carrierSurface: RuntimeCarrierSurfaceSnapshot;
  runtimeSnapshot: RuntimeNeighborhoodSnapshot;
}) {
  return runtimeSnapshot.occurrences.flatMap((occurrence) => {
    const position = offsetNodeLabelPosition(scaleCoordinate(occurrence.embedding.coordinate));

    if (occurrence.ply === 0) {
      return [
        <LabelSprite
          backgroundColor="#f7f1e6"
          borderColor="#7a6a55"
          key={`${occurrence.occurrenceId}:root-label`}
          opacity={0.88}
          position={position}
          scale={0.5}
          text={formatGameName(occurrence.embedding.rootGameId)}
        />
      ];
    }

    if (!occurrence.terminal) {
      return [];
    }

    const incomingCarrier = carrierSurface.carriers.find(
      (carrier) => carrier.targetOccurrenceId === occurrence.occurrenceId
    );
    const outcome = formatTerminalOutcomeLabel(occurrence.terminal.wdlLabel);
    const label = incomingCarrier?.san ? `${incomingCarrier.san} · ${outcome}` : outcome;

    return [
      <LabelSprite
        backgroundColor="#eef7ee"
        borderColor="#2f6b38"
        key={`${occurrence.occurrenceId}:terminal-label`}
        opacity={0.92}
        position={position}
        scale={0.5}
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
  const fontSize = 34;
  const paddingX = 20;
  const paddingY = 12;
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

function scoreCarrierForLabel(carrier: RuntimeCarrierRecord, focusOccurrenceId: string) {
  const focusAdjacencyBoost =
    carrier.sourceOccurrenceId === focusOccurrenceId || carrier.targetOccurrenceId === focusOccurrenceId
      ? 10
      : 0;

  return focusAdjacencyBoost + carrier.departureStrength;
}

function offsetLabelPosition(position: Vector3, ply: number): Vector3 {
  const verticalOffset = (ply % 2) === 0 ? 0.16 : 0.22;
  const lateralOffset = (ply % 2) === 0 ? -0.04 : 0.05;

  return [position[0] + lateralOffset, position[1] + verticalOffset, position[2]];
}

function offsetNodeLabelPosition(position: Vector3): Vector3 {
  return [position[0], position[1] + 0.28, position[2]];
}