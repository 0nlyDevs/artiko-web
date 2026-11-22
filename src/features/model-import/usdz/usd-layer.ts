export interface UsdSpec {
  fields: Record<string, unknown>;
}

export interface UsdLayer {
  specsByPath: Record<string, UsdSpec>;
}
