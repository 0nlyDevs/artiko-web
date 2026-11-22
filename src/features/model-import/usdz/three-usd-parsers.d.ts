// three 0.187.0 ships these parsers without type declarations (@types/three only covers USDLoader).
declare module "three/examples/jsm/loaders/usd/USDCParser.js" {
  import type { UsdLayer } from "@/features/model-import/usdz/usd-layer";
  export class USDCParser {
    parseData(buffer: ArrayBuffer): UsdLayer;
  }
}

declare module "three/examples/jsm/loaders/usd/USDAParser.js" {
  import type { UsdLayer } from "@/features/model-import/usdz/usd-layer";
  export class USDAParser {
    parseData(text: string): UsdLayer;
  }
}
