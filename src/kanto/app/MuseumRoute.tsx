import { lazy, Suspense, useState } from 'react';
import { ArtworkViewer } from '../features/artwork-viewer';
import type { Room } from '../features/gallery/data/rooms';
import { GalleryPage } from '../features/gallery/GalleryPage';
import type { ModelViewerRenderer } from '../features/gallery/model-viewer-slot';
import { MuseumLoading } from '../features/gallery/MuseumLoading';
import { detectWebGL, resolveMuseumMode } from './museum-mode';

// The WebGL room and its three.js dependencies load only when a room needs them.
const ImmersiveGallery = lazy(() =>
  import('../features/gallery/immersive/ImmersiveGallery').then((module) => ({
    default: module.ImmersiveGallery,
  })),
);

/**
 * shidoAdr's viewer (3D-05a), handed to the photographic room so the gallery
 * feature stays independent of it. The WebGL room needs none: a 3D work is
 * turned where it stands, in the focus.
 */
const renderModelViewer: ModelViewerRenderer = (artwork, model) => (
  <ArtworkViewer
    poster={model.poster}
    model1k={model.model1k}
    {...(model.model2k === undefined ? {} : { model2k: model.model2k })}
    alt={artwork.alt}
    bottomScanned={model.bottomScanned}
  />
);

export interface MuseumRouteProps {
  room: Room;
  artworkIndex: number | null;
}

/**
 * Chooses the room for `/musee/:room/:number`: the WebGL room when it can
 * run, the photographic room otherwise, and again if WebGL fails later.
 */
export function MuseumRoute({ room, artworkIndex }: MuseumRouteProps) {
  const [webgl] = useState(detectWebGL);
  const [failed, setFailed] = useState(false);
  const mode = failed
    ? 'photo'
    : resolveMuseumMode({
        search: window.location.search,
        webgl,
        hasArtworks: room.artworks.length > 0,
      });

  if (mode === 'photo') {
    return (
      <GalleryPage
        room={room}
        artworkIndex={artworkIndex}
        renderModelViewer={renderModelViewer}
      />
    );
  }
  return (
    <Suspense fallback={<MuseumLoading room={room} />}>
      <ImmersiveGallery
        room={room}
        artworkIndex={artworkIndex}
        onFailure={() => {
          setFailed(true);
        }}
      />
    </Suspense>
  );
}
