// Above this the browser risks running out of memory while unzipping and decoding textures.
export const MAX_SOURCE_BYTES = 150 * 1024 * 1024;

// Mirrors the API upload limit (artiko-api/app/platform/config.py:29), which answers 413 beyond it.
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const TEXTURE_SIZE_1K = 1024;
export const TEXTURE_SIZE_2K = 2048;
