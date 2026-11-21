import { MeshReflectorMaterial, Text, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getLocale, translate, useLocale, useT } from "@/i18n/locale";
import { neon, showreel, works, type Work } from "./content";
import { Overlays } from "./Overlays";
import { Props } from "./Props";

export const SCENE_URL = "/museum/assets/landscape.glb";
const DISPLAY_FONT = "/fonts/LeagueGothic.ttf";

// Quads that carried the original studio's copy and doodles as runtime
// textures. They are hidden; ARTIKO's copy is drawn in their place by Overlays.
const HIDDEN =
  /^(Camera_Web|desktop_|portfolio_text_|about_text_block|services_text_block|text_global_|text_mobile_|Group|Layer_1|3_Group|Logo_Rotation|FloorMirror|Play_button|Tex_03001$|Tex_4k_01004$)/;

// The baked mesh that holds the showreel room's furniture and its two people.
const PEOPLE_MESH = "Tex_4k_02_001";

// Every orange and red of the studio's baked textures (sofas, bean bags, the
// salmon ceiling beams, the red contact lettering) is moved to ARTIKO's warm
// blue palette. Sofas and bags become ARTIKO blue; the ceiling a pale sky blue.
// Wood stays out of the hue band. Expects srgb, hi, sat and warm in scope;
// FURNITURE limits the leather to furniture pixels, CEILING marks the ceiling.
const WARM_GLSL = `
        float orangeHue = srgb.g / max(srgb.r, 1e-4);
        float orange = (FURNITURE && warm && sat > 0.14 && hi > 0.3 && orangeHue > 0.2 && orangeHue < 0.66) ? 1.0 : 0.0;
        srgb = mix(srgb, vec3(0.74, 0.30, 0.20) * (0.3 + hi * 0.85), orange);
        float beam = (CEILING) ? 1.0 : 0.0;
        srgb = mix(srgb, vec3(hi) * vec3(1.0, 0.78, 0.62), beam);
        float neutral = 1.0 - smoothstep(0.05, 0.14, sat);
        // Golden hour: where the baked light falls (the rays) it turns gold and glows; in the
        // shade it deepens to rose and plum. Pale walls take the grade fully, the rest lightly.
        float lit = smoothstep(0.55, 0.92, hi);
        vec3 shade = vec3(0.84, 0.60, 0.58);
        vec3 gold = vec3(1.0, 0.82, 0.52);
        float body = mix(0.35, 1.0, neutral);
        srgb = mix(srgb, srgb * mix(shade, gold, lit) * 1.1, body);
        srgb += vec3(1.0, 0.62, 0.28) * 0.16 * lit * lit * neutral;`;

function warmPalette(material: THREE.MeshBasicMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWorldY = (modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vWorldY;")
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        vec3 srgb = pow(max(diffuseColor.rgb, vec3(0.0)), vec3(1.0 / 2.2));
        float hi = max(srgb.r, max(srgb.g, srgb.b));
        float lo = min(srgb.r, min(srgb.g, srgb.b));
        float sat = (hi - lo) / max(hi, 1e-4);
        bool warm = srgb.r >= srgb.g && srgb.g >= srgb.b;
        ${WARM_GLSL.replace("FURNITURE", "true").replace("CEILING", "vWorldY > 540.0")}
        diffuseColor.rgb = pow(srgb, vec3(2.2));`,
      );
  };
  material.customProgramCacheKey = () => "artiko-warm";
  material.needsUpdate = true;
}

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
    await document.fonts.load(`600 40px ${sans}`).catch(() => undefined);
    const gradient = ctx.createLinearGradient(0, canvas.height - 420, 0, canvas.height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 420, canvas.width, 420);
    ctx.font = `700 26px ${sans}`;
    const kind = caption.kind.toUpperCase();
    const pad = 18;
    const width = ctx.measureText(kind).width + pad * 2;
    ctx.fillStyle = "#C8553D";
    ctx.beginPath();
    ctx.roundRect(56, canvas.height - 300, width, 48, 24);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(kind, 56 + pad, canvas.height - 266);
    ctx.font = `600 42px ${sans}`;
    // maxWidth squeezes a longer translation instead of letting it run off the slide.
    ctx.fillText(caption.label, 56, canvas.height - 200, canvas.width - 112);
  }
  return canvas;
}

async function musicCanvas() {
  const levels: number[] = await fetch("/museum/assets/satie-waveform.json").then((r) => r.json());
  const sans = cssFont("--font-sans", "sans-serif");
  await document.fonts.load(`700 80px ${sans}`).catch(() => undefined);
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
  ctx.fillStyle = "#FBF0E4";
  ctx.font = `700 78px ${sans}`;
  ctx.fillText(translate("work.gymnopedie.title"), 80, 170);
  ctx.font = `600 30px ${sans}`;
  ctx.fillStyle = "rgba(255,244,236,0.7)";
  ctx.fillText(translate("card.music"), 80, 860);
  return canvas;
}

async function oralCanvas() {
  const serif = cssFont("--font-serif", "serif");
  const sans = cssFont("--font-sans", "sans-serif");
  await Promise.all([
    document.fonts.load(`italic 500 80px ${serif}`),
    document.fonts.load(`800 190px ${sans}`),
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
  ctx.fillStyle = "#C8553D";
  ctx.font = `italic 500 420px ${serif}`;
  ctx.fillText("\u201C", 60, 420);
  ctx.fillStyle = "#2A1C1A";
  ctx.font = `800 190px ${sans}`;
  ctx.fillText("KABARY", 90, 640);
  ctx.font = `500 54px ${sans}`;
  ctx.fillText(translate("card.oralTagline"), 96, 740, 1100);
  ctx.font = `600 28px ${sans}`;
  ctx.fillStyle = "rgba(20,17,16,0.6)";
  ctx.fillText(translate("card.oralFoot"), 96, 850, 1100);
  return canvas;
}

function workCanvas(work: Work) {
  if (work.card === "music") return musicCanvas();
  if (work.card === "oral") return oralCanvas();
  return pictureCanvas(work.image ?? "", work.fit ?? "cover");
}

// Draws a work's canvas onto its frame. Only the cards carry words, so they are redrawn when the
// language changes (see GalleryScene); `token` drops a draw that a newer one has overtaken.
function paintFrame(material: THREE.MeshBasicMaterial, work: Work) {
  const token = ((material.userData.token as number | undefined) ?? 0) + 1;
  material.userData.token = token;
  void workCanvas(work).then((canvas) => {
    if (material.userData.token !== token) return;
    material.map?.dispose();
    material.map = canvasTexture(canvas);
    material.color.set("#ffffff");
    material.needsUpdate = true;
  });
}

function repaintCards(root: THREE.Object3D, locale: string) {
  if (root.userData.cardsLocale === locale) return;
  root.userData.cardsLocale = locale;
  const frames = root.userData.frameMaterials as THREE.MeshBasicMaterial[] | undefined;
  works.forEach((work, index) => {
    if (work.card && frames?.[index]) paintFrame(frames[index], work);
  });
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
      const basic = copy as THREE.MeshBasicMaterial;
      if (basic.isMeshBasicMaterial && basic.map) warmPalette(basic);
      cloned.set(source, copy);
    }
    mesh.material = cloned.get(source)!;
  });

  // The furniture that gives way to ARTIKO's pieces (see Props).
  for (const name of ["Tex_4k_03_004", "Tex_4k_03_004001", "Tex_4k_03_005", "Tex_4k_02_009", "Planet_Rotation"]) {
    const node = root.getObjectByName(name);
    if (node) node.visible = false;
  }

  // The opening wall carries the studio slogan in its geometry. Rebuild it as
  // a flat wall that samples a clean area of the same baked texture.
  for (const name of ["DesktopWall_001", "DesktopWall_002"]) {
    const wall = root.getObjectByName(name) as THREE.Mesh | undefined;
    if (!wall) continue;
    wall.geometry = new THREE.PlaneGeometry(2292.232, 573.058);
    const material = (wall.material as THREE.MeshBasicMaterial).clone();
    if (material.map) {
      material.map = material.map.clone();
      material.map.repeat.set(0.45, 0.2);
      material.map.offset.set(0, 0.79);
      material.map.needsUpdate = true;
      warmPalette(material);
    }
    wall.material = material;
  }

  const frameMaterials: THREE.MeshBasicMaterial[] = [];
  FRAME_NAMES.forEach((name, index) => {
    const frame = root.getObjectByName(name) as THREE.Mesh | undefined;
    const work = works[index];
    if (!frame || !work) return;
    const material = new THREE.MeshBasicMaterial({ color: "#1b1b1b", toneMapped: false });
    frame.material = material;
    frameMaterials[index] = material;
    paintFrame(material, work);
  });
  root.userData.frameMaterials = frameMaterials;
  root.userData.cardsLocale = getLocale();

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
        ${WARM_GLSL.replace("FURNITURE", "vPerson < 0.5").replace("CEILING", "false")}
        diffuseColor.rgb = pow(srgb, vec3(2.2));`,
      );
  };
  material.customProgramCacheKey = () => "artiko-malagasy";
  return material;
}

// Longer words in French or Malagasy shrink to the width the English line was composed for.
const fitSize = (size: number, text: string, chars: number) => size * Math.min(1, chars / text.length);

function NeonSign() {
  const { t } = useT();
  const glow = useRef<THREE.Group>(null);
  const lines = neon.map((key) => t(key));
  const fontSize = fitSize(74, lines.reduce((a, b) => (b.length > a.length ? b : a)), 20);
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
        {lines.map((line, i) => (
          <Text
            key={`glow-${i}`}
            font={DISPLAY_FONT}
            fontSize={fontSize}
            anchorX="center"
            anchorY="middle"
            position={[i * -14, 36 - i * 72, 0]}
            color="#E2643F"
            fillOpacity={0}
            outlineBlur={26}
            outlineColor="#FF8A5C"
            outlineOpacity={0.7}
          >
            {line}
          </Text>
        ))}
      </group>
      {lines.map((line, i) => (
        <Text
          key={i}
          font={DISPLAY_FONT}
          fontSize={fontSize}
          anchorX="center"
          anchorY="middle"
          position={[i * -14, 36 - i * 72, 2]}
          color="#C8553D"
          outlineWidth={1.5}
          outlineColor="#E2643F"
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
    ctx.fillStyle = "#d62828";
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

// ARTIKO's flower in 3D on the logo alcove's plinth: six coral petals around
// a cream heart, turning slowly.
const PETAL = 52;

function ArtikoMark() {
  const group = useRef<THREE.Group>(null);
  const { petal, heart } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absellipse(0, PETAL / 2, PETAL * 0.26, PETAL / 2, 0, Math.PI * 2, false, 0);
    const extrude = { depth: 8, bevelEnabled: true, bevelSize: 2, bevelThickness: 2, bevelSegments: 4, curveSegments: 40 };
    const p = new THREE.ExtrudeGeometry(shape, extrude);
    p.translate(0, 0, -4);
    const h = new THREE.CylinderGeometry(PETAL * 0.2, PETAL * 0.2, 16, 48);
    h.rotateX(Math.PI / 2);
    return { petal: p, heart: h };
  }, []);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={group} position={[857.5, 282, -82]} scale={1.15}>
      {[0, 60, 120, 180, 240, 300].map((angle) => (
        <mesh key={angle} geometry={petal} rotation={[0, 0, THREE.MathUtils.degToRad(angle)]}>
          <meshStandardMaterial color="#C8553D" roughness={0.45} metalness={0.05} />
        </mesh>
      ))}
      <mesh geometry={heart}>
        <meshStandardMaterial color="#FBF0E4" roughness={0.6} />
      </mesh>
    </group>
  );
}

// Showreel: a screen that keeps crossfading through art forms with a slow
// zoom, like a looping video.
const SLIDE_SECONDS = 4;
const FADE_SECONDS = 1;

// Owns the screen's crossfade material and the slide clock. Kept outside
// React so the per-frame mutations stay out of hook values.
class ShowreelPlayer {
  private textures: THREE.Texture[] = [];
  private slide = 0;
  private startedAt = -1;
  private previous: THREE.Material | THREE.Material[];
  private cancelled = false;
  private generation = 0;
  private captionLocale: string | null = null;
  readonly material = new THREE.ShaderMaterial({
    toneMapped: false,
    uniforms: {
      uA: { value: null as THREE.Texture | null },
      uB: { value: null as THREE.Texture | null },
      uMix: { value: 0 },
      uZoomA: { value: 1 },
      uZoomB: { value: 1 },
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
      varying vec2 vUv;
      void main() {
        vec3 a = texture2D(uA, (vUv - 0.5) / uZoomA + 0.5).rgb;
        vec3 b = texture2D(uB, (vUv - 0.5) / uZoomB + 0.5).rgb;
        gl_FragColor = vec4(mix(a, b, smoothstep(0.0, 1.0, uMix)), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  constructor(private screen: THREE.Mesh) {
    this.previous = screen.material;
    screen.material = this.material;
    this.reloadCaptions();
  }

  // (Re)draws the slides with captions in the active language; the slide on screen carries over.
  reloadCaptions() {
    const locale = getLocale();
    if (locale === this.captionLocale) return;
    this.captionLocale = locale;
    const generation = ++this.generation;
    void Promise.all(
      showreel.map((slide) =>
        pictureCanvas(slide.image, "cover", {
          kind: translate(slide.kind, undefined, locale),
          label: translate(slide.label, undefined, locale),
        }).then(canvasTexture),
      ),
    ).then((list) => {
      if (this.cancelled || generation !== this.generation) {
        list.forEach((t) => t.dispose());
        return;
      }
      const old = this.textures;
      this.textures = list;
      this.material.uniforms.uA.value = list[this.slide % list.length];
      this.material.uniforms.uB.value = list[(this.slide + 1) % list.length];
      old.forEach((t) => t.dispose());
    });
  }

  update(time: number) {
    const u = this.material.uniforms;
    const list = this.textures;
    if (list.length < 2) return;
    if (this.startedAt < 0) this.startedAt = time;
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
  const locale = useLocale();

  useEffect(() => {
    if (!screen) return;
    const instance = new ShowreelPlayer(screen);
    player.current = instance;
    return () => {
      instance.dispose();
      player.current = null;
    };
  }, [screen]);

  useEffect(() => {
    player.current?.reloadCaptions();
  }, [locale]);

  useFrame(({ clock }) => player.current?.update(clock.elapsedTime));

  return null;
}

// Turns the globe in the closing room around its own axis.
function spinGlobe(globe: THREE.Object3D | null, delta: number) {
  if (globe) globe.rotation.y += delta * 0.25;
}

export function GalleryScene({ progress, onPath, goTo }: SceneProps) {
  const gltf = useGLTF(SCENE_URL);

  useMemo(() => prepareScene(gltf.scene), [gltf.scene]);

  // The music and kabary cards carry words drawn into their textures: redraw them for a new language.
  const locale = useLocale();
  useEffect(() => repaintCards(gltf.scene, locale), [locale, gltf.scene]);

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
  // Total scroll distance, measured on resize only.
  const scrollRange = useRef(0);
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      scrollRange.current = root.scrollHeight - window.innerHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
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
    const max = scrollRange.current;
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
  const globe = useMemo(() => gltf.scene.getObjectByName("Planet_Rotation") ?? null, [gltf.scene]);
  useFrame((_, delta) => spinGlobe(globe, delta));

  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[400, 900, 800]} intensity={2.2} />
      <primitive object={gltf.scene} />
      {floorMirror && (
        <mesh geometry={floorMirror.geometry} position={floorMirror.position}>
          <MeshReflectorMaterial
            resolution={512}
            mirror={0.6}
            mixStrength={1.2}
            blur={[0, 0]}
            mixBlur={0}
            color="#ffffff"
            transparent
            opacity={0.22}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <Props />
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
