import { MeshReflectorMaterial, Text, useGLTF } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hero, neon, works } from "./content";
import { Overlays } from "./Overlays";

export const SCENE_URL = "/museum/assets/landscape.glb";
const DISPLAY_FONT = "/fonts/LeagueGothic.ttf";

// Quads that carried the original studio's copy and doodles as runtime
// textures. They are hidden; Lova's copy is drawn in their place by Overlays.
const HIDDEN =
  /^(Camera_Web|desktop_|portfolio_text_|about_text_block|services_text_block|text_global_|text_mobile_|Group|Layer_1|3_Group|Logo_Rotation|FloorMirror|Tex_03001$|Tex_4k_01004$)/;

const FRAME_NAMES = ["work_prev_01_0", "work_prev_02_1", "work_prev_03_2", "work_prev_04_3", "work_prev_05_4", "work_prev_06_5"];

export type CameraPath = {
  progressForX: (x: number) => number;
};

type SceneProps = {
  progress: { current: number };
  onPath: (path: CameraPath) => void;
  goTo: (x: number) => void;
};

function coverTexture(url: string, onReady: (texture: THREE.Texture) => void) {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.anisotropy = 4;
    onReady(texture);
  };
  image.src = url;
}

function prepareScene(root: THREE.Object3D) {
  if (root.userData.lovaPrepared) return;
  root.userData.lovaPrepared = true;

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
    coverTexture(work.image, (texture) => {
      material.map = texture;
      material.color.set("#ffffff");
      material.needsUpdate = true;
    });
  });

  const screen = root.getObjectByName("screen_showreel") as THREE.Mesh | undefined;
  if (screen) {
    const material = new THREE.MeshBasicMaterial({ color: "#1b1b1b", toneMapped: false });
    screen.material = material;
    coverTexture("/gallery/starry.webp", (texture) => {
      material.map = texture;
      material.color.set("#ffffff");
      material.needsUpdate = true;
    });
  }

  const play = root.getObjectByName("Play_button") as THREE.Mesh | undefined;
  if (play) play.material = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false, transparent: true, opacity: 0.92 });
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

function HeroSlogan() {
  // Line boxes follow the original composition: two lines indented, the
  // middle one wider, filling x -514..346 and y 85..474 on the first wall.
  // Each position is the line's baseline.
  return (
    <group>
      <ExtrudedLine text={hero.lines[0]} position={[-374, 349, 0]} fontSize={168} />
      <ExtrudedLine text={hero.lines[1]} position={[-514, 217, 0]} fontSize={168} />
      <ExtrudedLine text={hero.lines[2]} position={[-374, 87, 0]} fontSize={168} />
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

// Madagascar's flag on the closing room's flagpole, gently waving.
function Flag() {
  const mesh = useRef<THREE.Mesh>(null);
  const { geometry, texture } = useMemo(() => {
    const g = new THREE.PlaneGeometry(96, 150, 16, 12);
    g.translate(48, -75, 0);
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fc3d32";
      ctx.fillRect(0, 0, 96, 32);
      ctx.fillStyle = "#007e3a";
      ctx.fillRect(0, 32, 96, 32);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 32, 64);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return { geometry: g, texture: t };
  }, []);
  const base = useMemo(() => Float32Array.from(geometry.attributes.position.array as Float32Array), [geometry]);
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const position = mesh.current.geometry.attributes.position as THREE.BufferAttribute;
    const t = clock.elapsedTime;
    for (let i = 0; i < position.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      position.setZ(i, Math.sin(x * 0.07 + t * 2 + y * 0.02) * x * 0.09);
    }
    position.needsUpdate = true;
  });
  return (
    <mesh ref={mesh} geometry={geometry} position={[15838, 398, -472]} rotation={[0, -0.5, 0]}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}

function LovaMark() {
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

function PlayTriangle() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-14, -17);
    shape.lineTo(20, 0);
    shape.lineTo(-14, 17);
    shape.lineTo(-14, -17);
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <mesh geometry={geometry} position={[5972, 276, -113]}>
      <meshBasicMaterial color="#e5574a" toneMapped={false} />
    </mesh>
  );
}

export function GalleryScene({ progress, onPath, goTo }: SceneProps) {
  const gltf = useGLTF(SCENE_URL);
  const router = useRouter();

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

  const openJourney = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    router.push("/museum");
  };

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
      <LovaMark />
      <NeonBoard />
      <NeonSign />
      <Flag />
      <group
        onClick={openJourney}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <PlayTriangle />
        <mesh position={[5969.4, 276, -110]}>
          <planeGeometry args={[116, 116]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <Overlays goTo={goTo} />
    </>
  );
}

useGLTF.preload(SCENE_URL);
