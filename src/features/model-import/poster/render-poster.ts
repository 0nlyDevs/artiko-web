import { Box3, MathUtils, NeutralToneMapping, PerspectiveCamera, PMREMGenerator, Scene, Sphere, Vector3, WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ModelImportError } from "@/features/model-import/model-import-error";
import { FRONT_ORBIT } from "@/features/model-viewer/views";

const POSTER_SIZE = 1024;
const FIELD_OF_VIEW_DEGREES = 30;
const POSTER_QUALITY = 0.85;

/** Renders the front view, lit like model-viewer's neutral environment, so the poster matches the 3D view. */
export async function renderPoster(glb: ArrayBuffer, dracoDecoderPath: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(POSTER_SIZE, POSTER_SIZE);
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    throw new ModelImportError("unsupported_browser", String(error));
  }
  const draco = new DRACOLoader().setDecoderPath(dracoDecoderPath);
  try {
    const gltf = await new GLTFLoader().setDRACOLoader(draco).parseAsync(glb, "");
    const scene = new Scene();
    scene.add(gltf.scene);
    const environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environment.texture;
    renderer.toneMapping = NeutralToneMapping;
    renderer.setSize(POSTER_SIZE, POSTER_SIZE, false);
    renderer.render(scene, frontCamera(scene));
    environment.dispose();
    return await encode(canvas);
  } catch (error) {
    throw error instanceof ModelImportError ? error : new ModelImportError("poster_failed", String(error));
  } finally {
    draco.dispose();
    renderer.dispose();
  }
}

function frontCamera(scene: Scene): PerspectiveCamera {
  const sphere = new Box3().setFromObject(scene).getBoundingSphere(new Sphere());
  const camera = new PerspectiveCamera(FIELD_OF_VIEW_DEGREES, 1, sphere.radius / 100, sphere.radius * 100);
  const distance = sphere.radius / Math.sin(MathUtils.degToRad(FIELD_OF_VIEW_DEGREES / 2));
  const polar = MathUtils.degToRad(FRONT_ORBIT.polarDegrees);
  const azimuth = MathUtils.degToRad(FRONT_ORBIT.azimuthDegrees);
  camera.position.copy(sphere.center).add(new Vector3().setFromSphericalCoords(distance, polar, azimuth));
  camera.lookAt(sphere.center);
  return camera;
}

// Safari has no WebP encoder and returns PNG instead; JPEG keeps the poster small there.
async function encode(canvas: OffscreenCanvas): Promise<Blob> {
  const webp = await canvas.convertToBlob({ type: "image/webp", quality: POSTER_QUALITY });
  if (webp.type === "image/webp") return webp;
  return canvas.convertToBlob({ type: "image/jpeg", quality: POSTER_QUALITY });
}
