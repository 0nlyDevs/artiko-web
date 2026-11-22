import type { ReactNode } from 'react';
import type { Artwork, ArtworkModel } from './data/rooms';

/**
 * Renders the 3D viewer of a modelled work. The app hands it to the rooms,
 * so this feature does not import the viewer's module (see rules.md,
 * Structure: a feature imports from components/ and lib/ only).
 */
export type ModelViewerRenderer = (
  artwork: Artwork,
  model: ArtworkModel,
) => ReactNode;
