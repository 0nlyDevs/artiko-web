import { Environment, Lightformer, useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

// ARTIKO's own pieces, set among the studio's rooms: a framed portrait, moulded limestone
// pedestals carrying real sculptures and vases, and the island of Madagascar where the
// studio's globe turned.
//
// The sculptures and vases are Poly Haven models (CC0, public domain), served from
// /art/<name>/: marble_bust_01, antique_ceramic_vase_01, ceramic_vase_04, brass_vase_03
// and carved_wooden_elephant. See https://polyhaven.com/models.

const TERRACOTTA = "#C8553D";
const LIMESTONE = "#EAD3BC";
const LIMESTONE_LIGHT = "#F3E2D0";
const INK = "#2A1C1A";

// Colour space and sharpness of a loaded picture.
function prepare(texture: THREE.Texture | THREE.Texture[]) {
  for (const t of Array.isArray(texture) ? texture : [texture]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.needsUpdate = true;
  }
}

// ── A soft contact shadow under everything that stands on the floor ───────

let shadowTexture: THREE.CanvasTexture | null = null;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  g.addColorStop(0, "rgba(50,20,12,0.55)");
  g.addColorStop(0.55, "rgba(50,20,12,0.22)");
  g.addColorStop(1, "rgba(50,20,12,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}

function ContactShadow({ radius }: { radius: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 1.2, 0]}>
      <planeGeometry args={[radius * 3.4, radius * 3.4]} />
      <meshBasicMaterial map={getShadowTexture()} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ── Framed portrait on the wall (the wall plane is at z = 0) ──────────────

const FRAME = 7;
const MAT = 15;

function Hung({ x, y, w, h, texture }: { x: number; y: number; w: number; h: number; texture: THREE.Texture }) {
  const shadow = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.filter = "blur(14px)";
    ctx.fillStyle = "rgba(40,16,10,0.9)";
    ctx.fillRect(26, 26, 76, 76);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group position={[x, y, 4]}>
      <mesh position={[0, -16, -2]}>
        <planeGeometry args={[w + 110, h + 110]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 4]}>
        <boxGeometry args={[w + 2 * (MAT + FRAME), h + 2 * (MAT + FRAME), 8]} />
        <meshStandardMaterial color={INK} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 8.2]}>
        <planeGeometry args={[w + 2 * MAT, h + 2 * MAT]} />
        <meshStandardMaterial color="#F7EBDD" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 8.8]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.8} />
      </mesh>
    </group>
  );
}

export function HeroPortrait() {
  const texture = useTexture("/gallery/pearl.webp", prepare);
  const image = texture.image as { width: number; height: number };
  const h = 350;
  return <Hung x={285} y={300} w={h * (image.width / image.height)} h={h} texture={texture} />;
}

// ── Pedestals ─────────────────────────────────────────────────────────────

// Moulded limestone: a stepped base, a slightly tapered shaft and a cap that overhangs.
function profile(kind: 0 | 1 | 2, r: number, h: number) {
  const p = (x: number, y: number) => new THREE.Vector2(x, y);
  if (kind === 0)
    return [p(0, 0), p(r * 1.16, 0), p(r * 1.16, 8), p(r * 1.05, 8), p(r * 1.05, 16), p(r * 0.9, 24), p(r * 0.84, h - 30), p(r * 0.96, h - 20), p(r * 1.08, h - 14), p(r * 1.16, h - 9), p(r * 1.16, h), p(0, h)];
  if (kind === 1)
    return [p(0, 0), p(r * 1.14, 0), p(r * 1.14, h * 0.1), p(r * 0.98, h * 0.1), p(r * 0.98, h * 0.2), p(r * 0.84, h * 0.2), p(r * 0.84, h * 0.8), p(r * 1.0, h * 0.8), p(r * 1.0, h * 0.9), p(r * 1.14, h * 0.9), p(r * 1.14, h), p(0, h)];
  return [p(0, 0), p(r * 1.12, 0), p(r * 1.12, 10), p(r * 0.74, h * 0.35), p(r * 0.7, h - 22), p(r * 0.9, h - 14), p(r * 1.1, h - 8), p(r * 1.1, h), p(0, h)];
}

export function Pedestal({ x, z = 240, h, r = 62, kind = 0, color = LIMESTONE, children }: { x: number; z?: number; h: number; r?: number; kind?: 0 | 1 | 2; color?: string; children?: ReactNode }) {
  const geometry = useMemo(() => new THREE.LatheGeometry(profile(kind, r, h), 64), [kind, r, h]);
  return (
    <group position={[x, 0, z]}>
      <ContactShadow radius={r * 1.16} />
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.02} envMapIntensity={0.5} />
      </mesh>
      <group position={[0, h, 0]}>{children}</group>
    </group>
  );
}

// ── Real objects (CC0 models) ─────────────────────────────────────────────

type PieceId = "marble_bust_01" | "antique_ceramic_vase_01" | "ceramic_vase_04" | "brass_vase_03" | "carved_wooden_elephant";

const piecePath = (id: PieceId) => `/art/${id}/${id}_1k.gltf`;

// A model stood on its pedestal: scaled to a height in scene units, centred, resting on y = 0.
export function Piece({ id, height, rotY = 0 }: { id: PieceId; height: number; rotY?: number }) {
  const gltf = useGLTF(piecePath(id));
  const holder = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    const group = new THREE.Group();
    group.add(clone);
    group.scale.setScalar(height / size.y);
    group.rotation.y = rotY;
    return group;
  }, [gltf, height, rotY]);
  return <primitive object={holder} />;
}

for (const id of ["marble_bust_01", "antique_ceramic_vase_01", "ceramic_vase_04", "brass_vase_03", "carved_wooden_elephant"] as PieceId[]) {
  useGLTF.preload(piecePath(id));
}

// ── The island of Madagascar ──────────────────────────────────────────────

// Madagascar's coastline (longitude, latitude), simplified, clockwise from Cap d'Ambre.
const MADAGASCAR: [number, number][] = [
  [49.27, -11.95], [50.0, -13.37], [50.17, -14.27], [50.28, -14.9], [50.48, -15.27], [50.2, -15.9],
  [49.75, -15.5], [49.85, -16.3], [49.4, -17.4], [49.4, -18.15], [48.8, -19.9], [48.35, -21.23],
  [48.02, -22.15], [47.83, -22.82], [47.6, -23.35], [47.0, -25.03], [46.2, -25.2], [45.15, -25.6],
  [44.95, -25.43], [44.0, -24.8], [43.67, -23.35], [43.37, -21.75], [44.28, -20.28], [44.5, -19.7],
  [44.02, -18.07], [44.45, -16.2], [45.3, -16.1], [46.32, -15.72], [47.75, -14.63], [48.0, -13.9],
  [48.45, -13.68], [48.8, -12.9], [49.3, -12.28],
];

export function Island({ lift = 122, size = 17 }: { lift?: number; size?: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const k = Math.cos(THREE.MathUtils.degToRad(19));
    MADAGASCAR.forEach(([lon, lat], i) => (i === 0 ? shape.moveTo(lon * k, lat) : shape.lineTo(lon * k, lat)));
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: true, bevelSize: 0.22, bevelThickness: 0.22, bevelSegments: 3 });
    g.center();
    return g;
  }, []);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.35;
  });
  return (
    <mesh ref={mesh} geometry={geometry} position={[0, lift, 0]} scale={size}>
      <meshStandardMaterial color={TERRACOTTA} roughness={0.38} metalness={0.2} envMapIntensity={1.2} />
    </mesh>
  );
}

// ── Placement ─────────────────────────────────────────────────────────────

// Warm, sunset-coloured reflections for the pieces: gold from the low sun, rose from the sky.
function SunsetLight() {
  return (
    <Environment resolution={128} frames={1}>
      <Lightformer form="rect" intensity={5} color="#FFB36B" position={[6, 3, 4]} scale={[9, 4, 1]} />
      <Lightformer form="rect" intensity={2} color="#FF8FA3" position={[-7, 2, 3]} scale={[7, 6, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#FFE2C2" position={[0, 6, -2]} scale={[12, 3, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#E8A07A" rotation-x={Math.PI / 2} position={[0, -3, 0]} scale={[12, 12, 1]} />
    </Environment>
  );
}

export function Props() {
  return (
    <group>
      <SunsetLight />
      {/* Entrance: a portrait on the wall, a marble bust on a tall column */}
      <HeroPortrait />
      <Pedestal x={510} z={240} h={150} r={64} kind={0} color={LIMESTONE_LIGHT}>
        <Piece id="marble_bust_01" height={235} rotY={-0.35} />
      </Pedestal>
      {/* Workshop, under the neon sign: five columns, the tallest in the middle */}
      {[
        { x: 14480, h: 62, kind: 1 as const, id: "ceramic_vase_04" as PieceId, height: 190 },
        { x: 14630, h: 100, kind: 0 as const, id: "brass_vase_03" as PieceId, height: 170 },
        { x: 14780, h: 150, kind: 2 as const, id: "antique_ceramic_vase_01" as PieceId, height: 230 },
        { x: 14930, h: 100, kind: 0 as const, id: "carved_wooden_elephant" as PieceId, height: 130 },
        { x: 15080, h: 62, kind: 1 as const, id: "brass_vase_03" as PieceId, height: 150 },
      ].map((p) => (
        <Pedestal key={p.x} x={p.x} z={-260} h={p.h} r={54} kind={p.kind} color={p.h > 120 ? LIMESTONE_LIGHT : LIMESTONE}>
          <Piece id={p.id} height={p.height} rotY={p.x % 3} />
        </Pedestal>
      ))}
      {/* Closing room: the island of Madagascar turns on the plinth where the studio's globe stood */}
      <group position={[16046, 186, -86]}>
        <Island lift={102} size={14} />
      </group>
    </group>
  );
}
