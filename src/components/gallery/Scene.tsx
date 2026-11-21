import { MeshReflectorMaterial, Text, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hero, neon, showreel, works, type Work } from "./content";
import { Overlays } from "./Overlays";

export const SCENE_URL = "/museum/assets/landscape.glb";
const DISPLAY_FONT = "/fonts/LeagueGothic.ttf";

// Quads that carried the original studio's copy and doodles as runtime
// textures. They are hidden; ARTIKO's copy is drawn in their place by Overlays.
const HIDDEN =
  /^(Camera_Web|desktop_|portfolio_text_|about_text_block|services_text_block|text_global_|text_mobile_|Group|Layer_1|3_Group|Logo_Rotation|FloorMirror|Play_button|Tex_03001$|Tex_4k_01004$)/;

// The baked mesh that holds the showreel room's furniture and its two people.
const PEOPLE_MESH = "Tex_4k_02_001";

const FRAME_NAMES = ["work_prev_01_0", "work_prev_02_1", "work_prev_03_2", "work_prev_04_3", "work_prev_05_4", "work_prev_06_5"];

export type CameraPath = {
  progressForX: (x: number) => number;
};

type SceneProps = {
  progress: { current: number };
  onPath: (path: CameraPath) => void;
  goTo: (x: number) => void;
};

const cssFont = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  return texture;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

// Draws an image into a 4:3 canvas: cropped to fill, or whole on a mat of the
// photo's own background colour for objects shot on a plain backdrop.
async function pictureCanvas(url: string, fit: "cover" | "contain", caption?: { kind: string; label: string }) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  if (fit === "contain") {
    // A blurred, enlarged copy of the picture fills the mat behind it.
    const cover = Math.max(canvas.width / image.width, canvas.height / image.height) * 1.2;
    ctx.filter = "blur(36px) brightness(0.92)";
    ctx.drawImage(image, (canvas.width - image.width * cover) / 2, (canvas.height - image.height * cover) / 2, image.width * cover, image.height * cover);
    ctx.filter = "none";
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    const scale = Math.min((canvas.width * 0.9) / image.width, (canvas.height * 0.9) / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    ctx.shadowColor = "transparent";
  } else {
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  if (caption) {
    const sans = cssFont("--font-sans", "sans-serif");
    const serif = cssFont("--font-serif", "serif");
    await document.fonts.load(`italic 600 40px ${serif}`).catch(() => undefined);
    const gradient = ctx.createLinearGradient(0, canvas.height - 420, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 420, canvas.width, 420);
    ctx.font = `700 26px ${sans}`;
    const kind = caption.kind.toUpperCase();
    const pad = 18;
    const width = ctx.measureText(kind).width + pad * 2;
    ctx.fillStyle = "#e5574a";
    ctx.beginPath();
    ctx.roundRect(56, canvas.height - 300, width, 48, 24);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(kind, 56 + pad, canvas.height - 266);
    ctx.font = `italic 600 46px ${serif}`;
    ctx.fillText(caption.label, 56, canvas.height - 200);
  }
  return canvas;
}

async function musicCanvas() {
  const levels: number[] = await fetch("/museum/assets/satie-waveform.json").then((r) => r.json());
  const serif = cssFont("--font-serif", "serif");
  const sans = cssFont("--font-sans", "sans-serif");
  await document.fonts.load(`italic 600 80px ${serif}`).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#171312";
  ctx.fillRect(0, 0, 1280, 960);
  const mid = 520;
  const bars = levels.length;
  const step = 1120 / bars;
  for (let i = 0; i < bars; i++) {
    const h = 20 + levels[i] * 520;
    const t = i / bars;
    ctx.fillStyle = `rgb(${229 + t * 26}, ${87 + t * 120}, ${74 + t * 110})`;
    ctx.beginPath();
    ctx.roundRect(80 + i * step, mid - h / 2, Math.max(2, step * 0.55), h, 2);
    ctx.fill();
  }
  ctx.fillStyle = "#fff4ec";
  ctx.font = `italic 600 92px ${serif}`;
  ctx.fillText("Gymnopédie No. 1", 80, 170);
  ctx.font = `600 30px ${sans}`;
  ctx.fillStyle = "rgba(255,244,236,0.7)";
  ctx.fillText("ERIK SATIE  ·  1888  ·  PIANO", 80, 860);
  return canvas;
}

async function oralCanvas() {
  const serif = cssFont("--font-serif", "serif");
  const display = cssFont("--font-display", "sans-serif");
  const sans = cssFont("--font-sans", "sans-serif");
  await Promise.all([
    document.fonts.load(`italic 600 80px ${serif}`),
    document.fonts.load(`400 300px ${display}`),
  ]).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f4ece0";
  ctx.fillRect(0, 0, 1280, 960);
  // Voice ripples spreading from the speaker.
  ctx.strokeStyle = "rgba(20,17,16,0.16)";
  ctx.lineWidth = 3;
  for (let r = 120; r < 1100; r += 70) {
    ctx.beginPath();
    ctx.arc(1180, 860, r, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.fillStyle = "#e5574a";
  ctx.font = `italic 600 420px ${serif}`;
  ctx.fillText("\u201C", 60, 420);
  ctx.fillStyle = "#141110";
  ctx.font = `400 300px ${display}`;
  ctx.fillText("KABARY", 90, 640);
  ctx.font = `italic 600 64px ${serif}`;
  ctx.fillText("the Malagasy art of speech", 96, 740);
  ctx.font = `600 28px ${sans}`;
  ctx.fillStyle = "rgba(20,17,16,0.6)";
  ctx.fillText("PROVERBS  ·  IMAGES  ·  VOICE", 96, 850);
  return canvas;
}

function workCanvas(work: Work) {
  if (work.card === "music") return musicCanvas();
  if (work.card === "oral") return oralCanvas();
  return pictureCanvas(work.image ?? "", work.fit ?? "cover");
}

function prepareScene(root: THREE.Object3D) {
  if (root.userData.artikoPrepared) return;
  root.userData.artikoPrepared = true;

  const cloned = new Map<THREE.Material, THREE.Material>();
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });

  root.traverse((node) => {
    if (HIDDEN.test(node.name)) {
      node.visible = false;
      return;
    }
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (/^light_/.test(mesh.name)) {
      mesh.material = white;
      return;
    }
    const source = mesh.material as THREE.Material;
    if (!cloned.has(source)) {
      const copy = source.clone();
      copy.toneMapped = false;
      cloned.set(source, copy);
    }
    mesh.material = cloned.get(source)!;
  });

  // The opening wall carries the studio slogan in its geometry. Rebuild it as
  // a flat wall that samples a clean area of the same baked texture.
  const heroWall = root.getObjectByName("DesktopWall_001") as THREE.Mesh | undefined;
  if (heroWall) {
    heroWall.geometry = new THREE.PlaneGeometry(2292.232, 573.058);
    const material = (heroWall.material as THREE.MeshBasicMaterial).clone();
    if (material.map) {
      material.map = material.map.clone();
      material.map.repeat.set(0.45, 0.2);
      material.map.offset.set(0, 0.79);
      material.map.needsUpdate = true;
    }
    heroWall.material = material;
  }

  FRAME_NAMES.forEach((name, index) => {
    const frame = root.getObjectByName(name) as THREE.Mesh | undefined;
    const work = works[index];
    if (!frame || !work) return;
    const material = new THREE.MeshBasicMaterial({ color: "#1b1b1b", toneMapped: false });
    frame.material = material;
    void workCanvas(work).then((canvas) => {
      material.map = canvasTexture(canvas);
      material.color.set("#ffffff");
      material.needsUpdate = true;
    });
  });

  const people = root.getObjectByName(PEOPLE_MESH) as THREE.Mesh | undefined;
  if (people) {
    people.geometry = people.geometry.clone();
    people.geometry.setAttribute("aPerson", new THREE.BufferAttribute(personMask(people.geometry), 1));
    people.material = malagasyMaterial(people.material as THREE.MeshBasicMaterial);
  }
}

// Local-space bounds of the two seated people in the showreel room.
const PERSON_BOUNDS = [
  new THREE.Box3(new THREE.Vector3(-55, -40, 45), new THREE.Vector3(30, 140, 95)),
  new THREE.Box3(new THREE.Vector3(880, -40, -85), new THREE.Vector3(1030, 140, 105)),
];

// Marks the vertices that belong to a person (1) rather than furniture (0).
// The mesh is a merge of many separate parts, so it is split into connected
// parts; a part counts as a person when it is small and sits inside a
// person's bounds, which leaves out couch backs and armrests.
function personMask(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position;
  const count = position.count;
  const parent = new Int32Array(count).map((_, i) => i);
  const find = (a: number) => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]];
      a = parent[a];
    }
    return a;
  };
  const index = geometry.index;
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = find(index.getX(i));
      parent[find(index.getX(i + 1))] = a;
      parent[find(index.getX(i + 2))] = a;
    }
  }
  const boxes = new Map<number, THREE.Box3>();
  const point = new THREE.Vector3();
  for (let v = 0; v < count; v++) {
    const root = find(v);
    point.fromBufferAttribute(position, v);
    let box = boxes.get(root);
    if (!box) boxes.set(root, (box = new THREE.Box3()));
    box.expandByPoint(point);
  }
  const person = new Map<number, number>();
  const size = new THREE.Vector3();
  boxes.forEach((box, root) => {
    box.getSize(size);
    const small = size.x < 100 && size.z < 100 && size.y < 170;
    person.set(root, small && PERSON_BOUNDS.some((b) => b.containsBox(box)) ? 1 : 0);
  });
  const mask = new Float32Array(count);
  for (let v = 0; v < count; v++) mask[v] = person.get(find(v)) ?? 0;
  return mask;
}

// The people in the scene are baked into a shared texture with light skin and
// blond or brown hair. This shader shifts skin tones to warm brown and hair
// above head height to black, so they read as Malagasy. Furniture on the same
// mesh is left alone through the per-vertex person mask.
function malagasyMaterial(source: THREE.MeshBasicMaterial) {
  const material = source.clone();
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPerson;\nvarying float vWorldY;\nvarying float vPerson;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;\nvPerson = aPerson;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;\nvarying float vPerson;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 srgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
        float hi = max(srgb.r, max(srgb.g, srgb.b));
        float lo = min(srgb.r, min(srgb.g, srgb.b));
        float sat = (hi - lo) / max(hi, 1e-4);
        bool warm = srgb.r >= srgb.g && srgb.g >= srgb.b;
        float skin = (vPerson > 0.5 && warm && sat > 0.1 && sat < 0.62 && hi > 0.45) ? 1.0 : 0.0;
        vec3 brown = vec3(0.50, 0.32, 0.22) * (hi / 0.86);
        srgb = mix(srgb, brown, skin);
        float yellowish = srgb.g / max(srgb.r, 1e-4);
        float hair = (vPerson > 0.5 && vWorldY > 96.0 && warm && skin < 0.5 && ((sat >= 0.55 && yellowish > 0.55) || hi < 0.45)) ? 1.0 : 0.0;
        srgb = mix(srgb, vec3(0.08, 0.065, 0.06) * (0.7 + hi * 0.5), hair);
        diffuseColor.rgb = pow(srgb, vec3(2.2));`,
      );
  };
  material.customProgramCacheKey = () => "artiko-malagasy";
  return material;
}

function ExtrudedLine({ text, position, fontSize }: { text: string; position: [number, number, number]; fontSize: number }) {
  const layers = 10;
  return (
    <group position={position}>
      <Text
        font={DISPLAY_FONT}
        fontSize={fontSize}
        anchorX="left"
        anchorY="top-baseline"
        position={[10, -16, 0.5]}
        color="#000000"
        fillOpacity={0.05}
        outlineBlur={34}
        outlineColor="#000000"
        outlineOpacity={0.1}
      >
        {text}
      </Text>
      {Array.from({ length: layers }, (_, i) => {
        const front = i === layers - 1;
        const shade = new THREE.Color("#9e2c24").lerp(new THREE.Color("#d84a3d"), i / (layers - 1));
        return (
          <Text
            key={i}
            font={DISPLAY_FONT}
            fontSize={fontSize}
            anchorX="left"
            anchorY="top-baseline"
            position={[0, 0, 2 + i * 3]}
            color={front ? "#ec5d4e" : shade}
          >
            {text}
          </Text>
        );
      })}
    </group>
  );
}

// The slogan pushes out of the wall line by line once the scene is shown.
function HeroSlogan() {
  const lines = useRef<(THREE.Group | null)[]>([]);
  const start = useRef(-1);
  useFrame(({ clock }) => {
    if (start.current < 0) start.current = clock.elapsedTime + 1.1;
    const t = clock.elapsedTime - start.current;
    lines.current.forEach((line, i) => {
      if (!line) return;
      const k = THREE.MathUtils.clamp((t - i * 0.2) / 1.2, 0, 1);
      const c = 1.4;
      const eased = 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
      line.position.z = -40 * (1 - eased);
    });
  });
  // Line boxes follow the original composition: two lines indented, the
  // middle one wider. Each position is the line's baseline.
  const baselines: [number, number][] = [
    [-374, 349],
    [-514, 217],
    [-374, 87],
  ];
  return (
    <group>
      {baselines.map(([x, y], i) => (
        <group key={i} ref={(g) => void (lines.current[i] = g)} position={[0, 0, -40]}>
          <ExtrudedLine text={hero.lines[i]} position={[x, y, 0]} fontSize={168} />
        </group>
      ))}
    </group>
  );
}

function NeonSign() {
  const glow = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!glow.current) return;
    const t = clock.elapsedTime;
    const flicker = Math.sin(t * 13) > 0.97 ? 0.55 : 1;
    glow.current.children.forEach((child) => {
      const text = child as unknown as { outlineOpacity: number; fillOpacity: number };
      if ("outlineOpacity" in text) text.outlineOpacity = 0.7 * flicker;
    });
  });
  return (
    <group position={[14423, 323, -528]}>
      <group ref={glow}>
        {neon.map((line, i) => (
          <Text
            key={`glow-${line}`}
            font={DISPLAY_FONT}
            fontSize={74}
            anchorX="center"
            anchorY="middle"
            position={[i * -14, 36 - i * 72, 0]}
            color="#ff3b2b"
            fillOpacity={0}
            outlineBlur={26}
            outlineColor="#ff3b2b"
            outlineOpacity={0.7}
          >
            {line}
          </Text>
        ))}
      </group>
      {neon.map((line, i) => (
        <Text
          key={line}
          font={DISPLAY_FONT}
          fontSize={74}
          anchorX="center"
          anchorY="middle"
          position={[i * -14, 36 - i * 72, 2]}
          color="#ff6a58"
          outlineWidth={1.5}
          outlineColor="#ffd2c8"
        >
          {line}
        </Text>
      ))}
    </group>
  );
}

// The original neon is baked into the back wall, so Lova's sign hangs on a
// white acrylic board that covers it, like a lightbox.
function NeonBoard() {
  const { board, shadow } = useMemo(() => {
    const make = (draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      if (ctx) draw(ctx);
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const rounded = (ctx: CanvasRenderingContext2D, inset: number, radius: number) => {
      ctx.beginPath();
      ctx.roundRect(inset, inset, 512 - inset * 2, 192 - inset * 2, radius);
    };
    return {
      board: make((ctx) => {
        rounded(ctx, 4, 18);
        ctx.fillStyle = "#f5f4f2";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#d6d4d0";
        ctx.stroke();
      }),
      shadow: make((ctx) => {
        ctx.filter = "blur(14px)";
        rounded(ctx, 30, 24);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.fill();
      }),
    };
  }, []);
  return (
    <group position={[14423, 323, -538]}>
      <mesh position={[16, -22, 0]}>
        <planeGeometry args={[860, 330]} />
        <meshBasicMaterial map={shadow} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 4]}>
        <planeGeometry args={[760, 260]} />
        <meshBasicMaterial map={board} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

// Madagascar's flag on the closing room's flagpole: white hoist band, red
// over green, in its 3:2 proportions. The cloth ripples in a vertex shader
// that also shades the folds.
const FLAG_W = 186;
const FLAG_H = 124;

function Flag() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { geometry, uniforms } = useMemo(() => {
    const g = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 60, 30);
    g.translate(FLAG_W / 2, -FLAG_H / 2, 0);
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fc3d32";
    ctx.fillRect(200, 0, 400, 200);
    ctx.fillStyle = "#007e3a";
    ctx.fillRect(200, 200, 400, 200);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 200, 400);
    // A faint weave so the cloth does not look like plastic.
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = "#000";
    for (let y = 0; y < 400; y += 3) ctx.fillRect(0, y, 600, 1);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return { geometry: g, uniforms: { uMap: { value: map }, uTime: { value: 0 } } };
  }, []);
  useFrame(({ clock }) => {
    if (material.current) material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh geometry={geometry} position={[15840, 400, -472]} rotation={[0, -1.0, 0]}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        toneMapped={false}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying float vShade;
          void main() {
            vUv = uv;
            float k = position.x / ${FLAG_W.toFixed(1)};
            float a = position.x * 0.042 - uTime * 3.0 + position.y * 0.01;
            float b = position.x * 0.085 - uTime * 4.6 - position.y * 0.02;
            float wave = (sin(a) * 14.0 + sin(b) * 4.5) * k;
            float slope = (cos(a) * 14.0 * 0.042 + cos(b) * 4.5 * 0.085) * k;
            vec3 p = position;
            p.z += wave;
            p.y -= k * k * 7.0;
            p.x -= k * abs(wave) * 0.12;
            vShade = clamp(slope, -1.0, 1.0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D uMap;
          varying vec2 vUv;
          varying float vShade;
          void main() {
            vec4 c = texture2D(uMap, vUv);
            float light = 0.9 + vShade * 0.22;
            gl_FragColor = vec4(c.rgb * light, 1.0);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}

function ArtikoMark() {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-40, -62);
    shape.lineTo(-40, 18);
    shape.absarc(0, 18, 40, Math.PI, 0, true);
    shape.lineTo(40, -62);
    shape.lineTo(-40, -62);
    const hole = new THREE.Path();
    hole.absarc(0, -8, 15, 0, Math.PI * 2, false);
    shape.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 16, bevelEnabled: true, bevelSize: 2.5, bevelThickness: 2.5, bevelSegments: 4, curveSegments: 40 });
    g.center();
    return g;
  }, []);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.6;
  });
  return (
    <mesh ref={mesh} geometry={geometry} position={[857.5, 282, -82]}>
      <meshStandardMaterial color="#e5574a" roughness={0.45} metalness={0.05} />
    </mesh>
  );
}

// Showreel: a screen that crossfades through art forms with a slow zoom,
// and a play button that pulses until the visitor starts it.
const SCREEN_CENTER: [number, number, number] = [5969.4, 276, -110];
const SLIDE_SECONDS = 4;
const FADE_SECONDS = 1;

// Owns the screen's crossfade material and the slide clock. Kept outside
// React so the per-frame mutations stay out of hook values.
class ShowreelPlayer {
  playing = false;
  private textures: THREE.Texture[] = [];
  private slide = 0;
  private startedAt = 0;
  private now = 0;
  private previous: THREE.Material | THREE.Material[];
  private cancelled = false;
  readonly material = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: {
      uA: { value: null as THREE.Texture | null },
      uB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uZoomA: { value: 1 },
      uZoomB: { value: 1 },
      uDim: { value: 0.82 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uA;
      uniform sampler2D uB;
      uniform float uMix;
      uniform float uZoomA;
      uniform float uZoomB;
      uniform float uDim;
      varying vec2 vUv;
      void main() {
        vec3 a = texture2D(uA, (vUv - 0.5) / uZoomA + 0.5).rgb;
        vec3 b = texture2D(uB, (vUv - 0.5) / uZoomB + 0.5).rgb;
        gl_FragColor = vec4(mix(a, b, smoothstep(0.0, 1.0, uMix)) * uDim, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  constructor(private screen: THREE.Mesh) {
    this.previous = screen.material;
    screen.material = this.material;
    void Promise.all(
      showreel.map((slide) => pictureCanvas(slide.image, "cover", { kind: slide.kind, label: slide.label }).then(canvasTexture)),
    ).then((list) => {
      if (this.cancelled) return;
      this.textures = list;
      this.material.uniforms.uA.value = list[0];
      this.material.uniforms.uB.value = list[1];
    });
  }

  toggle() {
    this.playing = !this.playing;
    if (this.playing) this.startedAt = this.now;
  }

  update(time: number) {
    this.now = time;
    const u = this.material.uniforms;
    u.uDim.value = THREE.MathUtils.lerp(u.uDim.value, this.playing ? 1 : 0.82, 0.08);
    const list = this.textures;
    if (list.length < 2 || !this.playing) return;
    let elapsed = time - this.startedAt;
    if (elapsed >= SLIDE_SECONDS + FADE_SECONDS) {
      this.slide += 1;
      this.startedAt += SLIDE_SECONDS + FADE_SECONDS;
      elapsed = time - this.startedAt;
    }
    const n = list.length;
    u.uA.value = list[this.slide % n];
    u.uB.value = list[(this.slide + 1) % n];
    u.uZoomA.value = 1 + elapsed * 0.012;
    u.uZoomB.value = 1 + Math.max(0, elapsed - SLIDE_SECONDS) * 0.012;
    u.uMix.value = THREE.MathUtils.clamp((elapsed - SLIDE_SECONDS) / FADE_SECONDS, 0, 1);
  }

  dispose() {
    this.cancelled = true;
    this.screen.material = this.previous;
    this.material.dispose();
    this.textures.forEach((t) => t.dispose());
  }
}

function Showreel({ screen }: { screen: THREE.Mesh | null }) {
  const player = useRef<ShowreelPlayer | null>(null);
  const button = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const hover = useRef(false);

  useEffect(() => {
    if (!screen) return;
    const instance = new ShowreelPlayer(screen);
    player.current = instance;
    return () => {
      instance.dispose();
      player.current = null;
    };
  }, [screen]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const p = player.current;
    p?.update(t);
    if (button.current) {
      const target = p?.playing ? 0.001 : hover.current ? 1.12 : 1;
      const s = THREE.MathUtils.lerp(button.current.scale.x, target, 1 - Math.pow(0.0001, delta));
      button.current.scale.setScalar(s);
      button.current.visible = s > 0.01;
    }
    if (ring.current) {
      const k = (t % 1.8) / 1.8;
      ring.current.scale.setScalar(1 + k * 0.6);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    }
  });

  const triangle = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-10, -15);
    shape.quadraticCurveTo(-12, -17, -8, -16);
    shape.lineTo(17, -2);
    shape.quadraticCurveTo(19, 0, 17, 2);
    shape.lineTo(-8, 16);
    shape.quadraticCurveTo(-12, 17, -10, 15);
    shape.lineTo(-10, -15);
    return new THREE.ShapeGeometry(shape, 12);
  }, []);

  const toggle = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    player.current?.toggle();
  };

  return (
    <group position={SCREEN_CENTER}>
      <mesh
        position={[0, 10, -2]}
        onClick={toggle}
        onPointerOver={() => {
          hover.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hover.current = false;
          document.body.style.cursor = "";
        }}
      >
        <planeGeometry args={[560, 320]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={button}>
        <mesh ref={ring} position={[0, 0, 0.5]}>
          <ringGeometry args={[50, 53, 64]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, 1]}>
          <circleGeometry args={[44, 64]} />
          <meshBasicMaterial color="#fff4ec" transparent opacity={0.96} toneMapped={false} />
        </mesh>
        <mesh geometry={triangle} position={[3, 0, 2]}>
          <meshBasicMaterial color="#e5574a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

export function GalleryScene({ progress, onPath, goTo }: SceneProps) {
  const gltf = useGLTF(SCENE_URL);

  useMemo(() => prepareScene(gltf.scene), [gltf.scene]);

  const path = useMemo(() => {
    const clip = gltf.animations.find((a) => a.name.startsWith("Camera"));
    const position = clip?.tracks.find((t) => t.name.endsWith(".position"));
    const rotation = clip?.tracks.find((t) => t.name.endsWith(".quaternion"));
    if (!position) return null;
    const times = position.times;
    const interpolant = new THREE.LinearInterpolant(times, position.values, 3, new Float32Array(3));
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const quaternion = rotation ? new THREE.Quaternion().fromArray(rotation.values, 0) : new THREE.Quaternion();
    return { interpolant, t0, t1, quaternion, times, values: position.values };
  }, [gltf.animations]);

  const baseFov = useMemo(() => {
    const cam = gltf.cameras?.[0] as THREE.PerspectiveCamera | undefined;
    return cam?.fov ?? 22.9;
  }, [gltf.cameras]);

  useEffect(() => {
    if (!path) return;
    onPath({
      progressForX: (x: number) => {
        const { times, values, t0, t1 } = path;
        for (let i = 0; i < times.length; i++) {
          if (values[i * 3] >= x) return (times[i] - t0) / (t1 - t0);
        }
        return 1;
      },
    });
  }, [path, onPath]);

  const fitted = useRef(0);
  const smoothed = useRef(0);
  // Runs before every other frame callback (negative priority), so the Html
  // overlays always read this frame's camera.
  useFrame(({ camera, size }) => {
    // Keep the framing of the original 16:9 camera; narrow screens get a
    // wider field of view so the walls still fit.
    const aspect = size.width / size.height;
    if (aspect !== fitted.current) {
      fitted.current = aspect;
      const cam = camera as THREE.PerspectiveCamera;
      const minAspect = 1.45;
      const tan = Math.tan(THREE.MathUtils.degToRad(baseFov / 2));
      const fov = aspect < minAspect ? THREE.MathUtils.radToDeg(2 * Math.atan((tan * minAspect) / aspect)) : baseFov;
      cam.fov = Math.min(fov, 70);
      cam.updateProjectionMatrix();
    }
    if (!path) return;
    // Read the scroll position every frame rather than trusting scroll
    // events, which can be dropped while Lenis is stopped or animating.
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    const target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : progress.current;
    smoothed.current += (target - smoothed.current) * 0.18;
    const t = path.t0 + smoothed.current * (path.t1 - path.t0);
    const p = path.interpolant.evaluate(t);
    camera.position.set(p[0], p[1], p[2]);
    camera.quaternion.copy(path.quaternion);
    camera.updateMatrixWorld();
  }, -1);

  const floorMirror = useMemo(() => {
    const node = gltf.scene.getObjectByName("FloorMirror") as THREE.Mesh | undefined;
    return node ? { geometry: node.geometry, position: node.position.clone() } : null;
  }, [gltf.scene]);

  const screen = useMemo(() => (gltf.scene.getObjectByName("screen_showreel") as THREE.Mesh | undefined) ?? null, [gltf.scene]);

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[400, 900, 800]} intensity={2.2} />
      <primitive object={gltf.scene} />
      {floorMirror && (
        <mesh geometry={floorMirror.geometry} position={floorMirror.position}>
          <MeshReflectorMaterial
            resolution={1024}
            mirror={0.6}
            mixStrength={1.2}
            blur={[400, 120]}
            mixBlur={1}
            color="#ffffff"
            transparent
            opacity={0.22}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <HeroSlogan />
      <ArtikoMark />
      <NeonBoard />
      <NeonSign />
      <Flag />
      <Showreel screen={screen} />
      <Overlays goTo={goTo} />
    </>
  );
}

useGLTF.preload(SCENE_URL);
