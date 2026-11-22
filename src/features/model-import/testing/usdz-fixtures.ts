import { deflateSync } from "node:zlib";
import { zipSync } from "three/examples/jsm/libs/fflate.module.js";

// Builds small USDZ archives for tests: a textured cube authored as USDA, in the layout Reality Composer uses
// (root layer first, textures in a sub-folder).

const CUBE_POINTS = "[(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1),(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1)]";
const CUBE_FACES = "[0,1,2,3, 5,4,7,6, 4,0,3,7, 1,5,6,2, 3,2,6,7, 4,5,1,0]";
const FACE_UVS = "(0,0),(1,0),(1,1),(0,1)";

export interface CubeOptions {
  /** Asset path of the base colour texture, as written in the layer. */
  texturePath?: string;
  withMesh?: boolean;
}

export function cubeUsda({ texturePath = "0/color.png", withMesh = true }: CubeOptions = {}): string {
  const mesh = `
    def Mesh "Cube" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    )
    {
        int[] faceVertexCounts = [4, 4, 4, 4, 4, 4]
        int[] faceVertexIndices = ${CUBE_FACES}
        point3f[] points = ${CUBE_POINTS}
        texCoord2f[] primvars:st = [${Array(6).fill(FACE_UVS).join(",")}] (
            interpolation = "faceVarying"
        )
        rel material:binding = </Root/Material>
    }`;
  return `#usda 1.0
(
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Root"
{${withMesh ? mesh : ""}

    def Material "Material"
    {
        token outputs:surface.connect = </Root/Material/Surface.outputs:surface>

        def Shader "Surface"
        {
            uniform token info:id = "UsdPreviewSurface"
            color3f inputs:diffuseColor.connect = </Root/Material/Color.outputs:rgb>
            float inputs:roughness = 0.8
            token outputs:surface
        }

        def Shader "Color"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @${texturePath}@
            float2 inputs:st.connect = </Root/Material/Reader.outputs:result>
            float3 outputs:rgb
        }

        def Shader "Reader"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname = "st"
            float2 outputs:result
        }
    }
}
`;
}

export function usdz(files: Record<string, Uint8Array | string>): Uint8Array {
  const entries = Object.fromEntries(
    Object.entries(files).map(([name, content]) => [name, typeof content === "string" ? new TextEncoder().encode(content) : content]),
  );
  // USDZ stores entries uncompressed (level 0).
  return zipSync(entries, { level: 0 });
}

export function texturedCubeUsdz(options: CubeOptions = {}): Uint8Array {
  return usdz({ "cube.usda": cubeUsda(options), "0/color.png": checkerPng(64) });
}

/** An RGB checkerboard PNG, so the texture survives WebP compression as a real image. */
export function checkerPng(size: number): Uint8Array {
  const rows: number[] = [];
  for (let y = 0; y < size; y++) {
    rows.push(0);
    for (let x = 0; x < size; x++) {
      const light = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
      rows.push(...(light ? [230, 200, 160] : [200, 85, 61]));
    }
  }
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, size);
  view.setUint32(4, size);
  header.set([8, 2, 0, 0, 0], 8);
  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Uint8Array.from(rows))),
    chunk("IEND", new Uint8Array()),
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typed = concat([new TextEncoder().encode(type), data]);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typed, 4);
  view.setUint32(8 + data.length, crc32(typed));
  return out;
}

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
