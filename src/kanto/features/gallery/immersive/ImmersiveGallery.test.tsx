import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setForcedReducedMotion } from '../../../lib/motion/reduced-motion';
import { settleMotion } from '../../../test/motion';
import { rooms } from '../data/rooms';
import type { Room } from '../data/rooms';
import { attachGalleryControls } from './GalleryControls';
import { ImmersiveGallery } from './ImmersiveGallery';
import { placeArtworks } from './gallery-layout';
import { TURN_STEP, galleryStore, spin } from './gallery-store';
import { sceneWorks } from './scene-annex';

// jsdom has no WebGL: the canvas is left out and the tests act on the store
// as the scene does (a click on a work focuses it, the keyboard goes through
// the controls of the room).
vi.mock('./GalleryScene', () => ({
  GalleryScene: () => null,
}));

const PLACED = placeArtworks(sceneWorks());
/** Scene positions: the four paintings, then the three 3D works. */
const FIRST_PAINTING = 0;
const FIRST_SCULPTURE = 4;

function roomOf(slug: string): Room {
  const room = rooms.find((candidate) => candidate.slug === slug);
  if (room === undefined) {
    throw new Error(`no room ${slug}`);
  }
  return room;
}

async function renderRoom(slug = 'peinture', artworkIndex = 0): Promise<void> {
  render(
    <ImmersiveGallery
      room={roomOf(slug)}
      artworkIndex={artworkIndex}
      onFailure={() => undefined}
    />,
  );
  await settleMotion();
}

/** What the scene does when a work is clicked. */
async function clickWork(index: number): Promise<void> {
  act(() => {
    galleryStore.focus(index);
  });
  await settleMotion();
}

function gallery(): HTMLElement {
  const root = document.querySelector<HTMLElement>('[data-phase]');
  if (root === null) {
    throw new Error('no gallery');
  }
  return root;
}

const hud = (): HTMLElement =>
  screen.getByRole('region', { name: 'Œuvre vue de près' });

const openDialogs = (): HTMLElement[] =>
  screen
    .getAllByRole('dialog', { hidden: true })
    .filter((element) => element.hasAttribute('open'));

describe('ImmersiveGallery', () => {
  beforeEach(() => {
    // Reduced motion lands on the rail at once and keeps the fades short.
    setForcedReducedMotion(true);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
  });

  it('keeps the controls of the focus off stage during the visit', async () => {
    await renderRoom();

    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(gallery().hasAttribute('data-focus-kind')).toBe(false);
    expect(gallery().hasAttribute('data-notice')).toBe(false);
    expect(hud()).toHaveAttribute('inert');
    expect(screen.getByRole('contentinfo')).not.toHaveAttribute('inert');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('comes close to a clicked work without opening its notice', async () => {
    await renderRoom();
    await clickWork(FIRST_PAINTING);

    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(gallery().getAttribute('data-focus-kind')).toBe('painting');
    expect(gallery().hasAttribute('data-notice')).toBe(false);
    expect(openDialogs()).toHaveLength(0);

    // The caption of the focus takes the place of the chrome of the room.
    expect(hud()).not.toHaveAttribute('inert');
    expect(within(hud()).getByText('01 / 04')).toBeTruthy();
    expect(within(hud()).getByText('Femme malgache')).toBeTruthy();
    expect(within(hud()).getByText('Huile sur toile')).toBeTruthy();
    expect(screen.getByRole('contentinfo')).toHaveAttribute('inert');
    expect(screen.getByRole('region', { name: 'Texte mural' })).toHaveAttribute(
      'inert',
    );

    const back = within(hud()).getByRole('button', {
      name: 'Retour à la salle',
    });
    expect(back.getAttribute('aria-keyshortcuts')).toBe('Escape');
    expect(document.activeElement).toBe(back);
    expect(screen.getByText(/^Vue rapprochée\. Œuvre 01 sur 04/)).toBeTruthy();
  });

  it('opens the notice only from "Lire la notice", beside the lit work, and returns to the focus', async () => {
    await renderRoom();
    await clickWork(FIRST_PAINTING);

    const read = within(hud()).getByRole('button', { name: 'Lire la notice' });
    fireEvent.click(read);
    await settleMotion();

    const [notice] = openDialogs();
    expect(openDialogs()).toHaveLength(1);
    // No backdrop: the room is not darkened behind the panel.
    expect(notice?.getAttribute('data-dim')).toBe('off');
    expect(gallery().getAttribute('data-notice')).toBe('open');
    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(screen.getByRole('note').textContent).toContain(
      'Œuvre de démonstration',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notice' }));
    await settleMotion();

    expect(openDialogs()).toHaveLength(0);
    expect(gallery().hasAttribute('data-notice')).toBe(false);
    // Back where the visitor was: still close to the work.
    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(document.activeElement).toBe(read);
  });

  it('opens the notice from the wall label in the visit and returns to the visit', async () => {
    await renderRoom();

    const label = screen.getByRole('button', { name: /Femme malgache/ });
    fireEvent.click(label);
    await settleMotion();

    expect(openDialogs()).toHaveLength(1);
    expect(openDialogs()[0]?.getAttribute('data-dim')).toBe('off');
    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(gallery().getAttribute('data-notice')).toBe('open');

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notice' }));
    await settleMotion();

    expect(openDialogs()).toHaveLength(0);
    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(document.activeElement).toBe(label);
  });

  it('turns a 3D work from the caption, 30 degrees per press, and resets it', async () => {
    await renderRoom('sculpture');
    await clickWork(FIRST_SCULPTURE);

    expect(gallery().getAttribute('data-focus-kind')).toBe('sculpture');
    const turn = within(hud()).getByRole('group', {
      name: 'Faire pivoter l’objet',
    });
    expect(within(turn).getByText('Glisser pour faire pivoter')).toBeTruthy();
    // The close-up viewer is for paintings.
    expect(
      within(hud()).queryByRole('button', { name: 'Observer de près' }),
    ).toBeNull();
    expect(screen.getByText(/Objet en 3D/)).toBeTruthy();

    const right = within(turn).getByRole('button', { name: 'Tourner à droite' });
    fireEvent.click(right);
    fireEvent.click(right);
    expect(spin.yaw).toBeCloseTo(2 * TURN_STEP);
    fireEvent.click(
      within(turn).getByRole('button', { name: 'Tourner à gauche' }),
    );
    expect(spin.yaw).toBeCloseTo(TURN_STEP);

    fireEvent.click(within(turn).getByRole('button', { name: 'Réinitialiser' }));
    expect(spin.yaw).toBe(0);
    expect(openDialogs()).toHaveLength(0);
  });

  it('comes close to a 3D work from "Manipuler en 3D", in the room and not in a viewer', async () => {
    await renderRoom('sculpture');

    const action = screen.getByRole('button', { name: 'Manipuler en 3D' });
    action.focus();
    fireEvent.click(action);
    await settleMotion();

    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(gallery().getAttribute('data-focus-kind')).toBe('sculpture');
    expect(openDialogs()).toHaveLength(0);

    fireEvent.click(
      within(hud()).getByRole('button', { name: 'Retour à la salle' }),
    );
    await settleMotion();

    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(hud()).toHaveAttribute('inert');
    // The keyboard goes back to the control that asked for the focus.
    expect(document.activeElement).toBe(action);
  });

  it('keeps "Observer de près" for paintings, from the bar and from the caption', async () => {
    await renderRoom();

    fireEvent.click(
      within(screen.getByRole('contentinfo')).getByRole('button', {
        name: 'Observer de près',
      }),
    );
    await settleMotion();
    expect(openDialogs()).toHaveLength(1);
    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await settleMotion();
    expect(openDialogs()).toHaveLength(0);

    await clickWork(FIRST_PAINTING);
    const observe = within(hud()).getByRole('button', {
      name: 'Observer de près',
    });
    fireEvent.click(observe);
    await settleMotion();
    expect(openDialogs()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await settleMotion();

    expect(openDialogs()).toHaveLength(0);
    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(document.activeElement).toBe(observe);
  });

  it('moves the focus to the neighbouring work with the arrows of the caption', async () => {
    await renderRoom();
    await clickWork(FIRST_PAINTING);

    fireEvent.click(
      within(hud()).getByRole('button', { name: 'Œuvre suivante' }),
    );
    await settleMotion();

    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(within(hud()).getByText('02 / 04')).toBeTruthy();
    expect(within(hud()).getByText('Antongona')).toBeTruthy();
    expect(window.location.pathname).toBe('/musee/peinture/02');

    fireEvent.click(
      within(hud()).getByRole('button', { name: 'Œuvre précédente' }),
    );
    await settleMotion();
    expect(within(hud()).getByText('01 / 04')).toBeTruthy();
    expect(window.location.pathname).toBe('/musee/peinture/01');
  });

  it('offers the keyboard a way to the work, and gives it back on the way out', async () => {
    await renderRoom();

    const approach = screen.getByRole('button', {
      name: 'S’approcher de l’œuvre',
    });
    approach.focus();
    fireEvent.click(approach);
    await settleMotion();

    expect(gallery().getAttribute('data-phase')).toBe('focus');
    expect(openDialogs()).toHaveLength(0);
    const back = within(hud()).getByRole('button', {
      name: 'Retour à la salle',
    });
    expect(document.activeElement).toBe(back);

    fireEvent.click(back);
    await settleMotion();
    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(document.activeElement).toBe(approach);
  });

  it('gives the keyboard to the work itself after a focus that began on the canvas', async () => {
    await renderRoom();
    await clickWork(FIRST_PAINTING);

    act(() => {
      galleryStore.unfocus();
    });
    await settleMotion();

    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'S’approcher de l’œuvre' }),
    );
  });

  it('gives Escape to the notice first, then to the focus', async () => {
    const canvas = document.createElement('div');
    const detach = attachGalleryControls(canvas, PLACED);
    await renderRoom();
    await clickWork(FIRST_PAINTING);

    fireEvent.click(
      within(hud()).getByRole('button', { name: 'Lire la notice' }),
    );
    await settleMotion();
    const [notice] = openDialogs();
    if (notice === undefined) {
      throw new Error('the notice did not open');
    }

    // The first Escape belongs to the dialog: the room does not hear it.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(gallery().getAttribute('data-phase')).toBe('focus');
    // jsdom does not close a dialog on Escape: the browser fires `cancel`.
    fireEvent(notice, new Event('cancel', { cancelable: true }));
    await settleMotion();
    expect(openDialogs()).toHaveLength(0);
    expect(gallery().getAttribute('data-phase')).toBe('focus');

    fireEvent.keyDown(window, { key: 'Escape' });
    await settleMotion();
    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    detach();
  });

  it('leaves the focus when the address moves the visitor to another room', async () => {
    const { rerender } = render(
      <ImmersiveGallery
        room={roomOf('peinture')}
        artworkIndex={0}
        onFailure={() => undefined}
      />,
    );
    await settleMotion();
    await clickWork(FIRST_PAINTING);

    rerender(
      <ImmersiveGallery
        room={roomOf('sculpture')}
        artworkIndex={0}
        onFailure={() => undefined}
      />,
    );
    await settleMotion();

    expect(gallery().getAttribute('data-phase')).toBe('visiting');
    expect(galleryStore.getState().activeIndex).toBe(FIRST_SCULPTURE);
    expect(screen.getByRole('button', { name: 'Manipuler en 3D' })).toBeTruthy();
  });
});
