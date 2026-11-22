// draco3d 1.5.9 ships no type declarations; only the factory used here is declared.
declare module "draco3d/draco_encoder_nodejs.js" {
  const createEncoderModule: (options: { locateFile: (file: string) => string }) => Promise<unknown>;
  export default createEncoderModule;
}

declare module "draco3d/draco_decoder_nodejs.js" {
  const createDecoderModule: (options: { locateFile: (file: string) => string }) => Promise<unknown>;
  export default createDecoderModule;
}
