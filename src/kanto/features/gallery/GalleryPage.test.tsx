import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../app/App';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { settleMotion } from '../../test/motion';

/** Renders the real app at a gallery URL, so the route drives the room and artwork. */
async function renderGalleryAt(path: string): Promise<void> {
  window.history.replaceState(null, '', path);
  render(<App />);
  await settleMotion();
}

function openDialogs(): HTMLElement[] {
  return screen
    .getAllByRole('dialog', { hidden: true })
    .filter((element) => element.hasAttribute('open'));
}

describe('GalleryPage', () => {
  beforeEach(() => {
    // Reduced motion keeps swaps short. The full choreography is checked in the browser.
    setForcedReducedMotion(true);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
  });

  it('shows the room, the counter and the wall label of the current artwork', async () => {
    await renderGalleryAt('/musee/peinture/01');

    expect(screen.getByText('Salle 01 sur 04 · Peinture')).toBeTruthy();
    expect(screen.getByText('Œuvre 01 / 04')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Femme malgache/ })).toBeTruthy();
  });

  it('navigates artworks with the arrow keys and updates the URL', async () => {
    await renderGalleryAt('/musee/peinture/01');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(window.location.pathname).toBe('/musee/peinture/02');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(window.location.pathname).toBe('/musee/peinture/01');
  });

  it('wraps around from the last artwork to the first', async () => {
    await renderGalleryAt('/musee/peinture/04');

    fireEvent.click(screen.getByRole('button', { name: 'Œuvre suivante' }));
    expect(window.location.pathname).toBe('/musee/peinture/01');
  });

  it('survives rapid repeated clicks and ends on the right artwork', async () => {
    await renderGalleryAt('/musee/peinture/01');
    const next = screen.getByRole('button', { name: 'Œuvre suivante' });

    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(next);
    }
    await settleMotion();

    // 7 steps from 01 in a room of 4 lands on 04, on the wall and in the URL.
    expect(window.location.pathname).toBe('/musee/peinture/04');
    expect(screen.getByText('Œuvre 04 / 04')).toBeTruthy();
  });

  it('opens the notice from the wall label with the demo mention and a verification status', async () => {
    await renderGalleryAt('/musee/peinture/01');

    fireEvent.click(screen.getByRole('button', { name: /Lire la notice/ }));
    await settleMotion();

    const openDialog = screen
      .getAllByRole('dialog', { hidden: true })
      .find((element) => element.hasAttribute('open'));
    expect(openDialog).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain(
      'Œuvre de démonstration',
    );
    expect(screen.getByText('Informations non relues')).toBeTruthy();
  });

  it('opens the notice beside the work, without a backdrop over the room', async () => {
    await renderGalleryAt('/musee/peinture/01');

    const label = screen.getByRole('button', { name: /Lire la notice/ });
    fireEvent.click(label);
    await settleMotion();

    expect(openDialogs()).toHaveLength(1);
    expect(openDialogs()[0]?.getAttribute('data-dim')).toBe('off');
    // The panel covers the wall text, which steps back while it is open.
    expect(screen.getByRole('region', { name: 'Texte mural' })).toHaveAttribute(
      'inert',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Fermer la notice' }));
    await settleMotion();
    expect(openDialogs()).toHaveLength(0);
    expect(
      screen.getByRole('region', { name: 'Texte mural' }),
    ).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(label);
  });

  it('keeps the backdrop of the other dialogs', async () => {
    await renderGalleryAt('/musee/peinture/01');

    fireEvent.click(screen.getByRole('button', { name: /Observer de près/ }));
    await settleMotion();

    expect(openDialogs()).toHaveLength(1);
    expect(openDialogs()[0]?.hasAttribute('data-dim')).toBe(false);
  });

  it('brings the hung work into focus on a click, without opening the notice', async () => {
    await renderGalleryAt('/musee/peinture/01');

    const work = screen.getByRole('button', { name: 'Agrandir l’œuvre' });
    const back = screen.getByRole('button', { name: 'Retour à la salle' });
    expect(work.getAttribute('aria-pressed')).toBe('false');
    expect(back).toHaveAttribute('inert');

    fireEvent.click(work);
    await settleMotion();

    expect(work.getAttribute('aria-pressed')).toBe('true');
    expect(openDialogs()).toHaveLength(0);
    expect(back).not.toHaveAttribute('inert');
    expect(document.activeElement).toBe(back);
    expect(screen.getByRole('region', { name: 'Texte mural' })).toHaveAttribute(
      'inert',
    );
    // The wall label stays: it is the way to the notice.
    expect(screen.getByRole('button', { name: /Lire la notice/ })).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('steps back from the focus with Escape, the return button or a click outside the work', async () => {
    await renderGalleryAt('/musee/peinture/01');
    const work = screen.getByRole('button', { name: 'Agrandir l’œuvre' });

    fireEvent.click(work);
    await settleMotion();
    fireEvent.keyDown(window, { key: 'Escape' });
    await settleMotion();
    expect(work.getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement).toBe(work);

    fireEvent.click(work);
    await settleMotion();
    fireEvent.click(screen.getByRole('button', { name: 'Retour à la salle' }));
    await settleMotion();
    expect(work.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(work);
    await settleMotion();
    fireEvent.click(screen.getByRole('main'));
    await settleMotion();
    expect(work.getAttribute('aria-pressed')).toBe('false');
  });

  it('gives Escape to the notice first, then to the focus', async () => {
    await renderGalleryAt('/musee/peinture/01');
    const work = screen.getByRole('button', { name: 'Agrandir l’œuvre' });
    fireEvent.click(work);
    await settleMotion();

    fireEvent.click(screen.getByRole('button', { name: /Lire la notice/ }));
    await settleMotion();
    const [notice] = openDialogs();
    if (notice === undefined) {
      throw new Error('the notice did not open');
    }

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(work.getAttribute('aria-pressed')).toBe('true');
    // jsdom does not close a dialog on Escape: the browser fires `cancel`.
    fireEvent(notice, new Event('cancel', { cancelable: true }));
    await settleMotion();
    expect(openDialogs()).toHaveLength(0);
    // Closing the notice returns to the focus it was opened from.
    expect(work.getAttribute('aria-pressed')).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    await settleMotion();
    expect(work.getAttribute('aria-pressed')).toBe('false');
  });

  it('leaves the focus when the visitor walks on to another work', async () => {
    await renderGalleryAt('/musee/peinture/01');
    fireEvent.click(screen.getByRole('button', { name: 'Agrandir l’œuvre' }));
    await settleMotion();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await settleMotion();

    expect(window.location.pathname).toBe('/musee/peinture/02');
    expect(
      screen
        .getByRole('button', { name: 'Agrandir l’œuvre' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.getByRole('button', { name: 'Retour à la salle' })).toHaveAttribute(
      'inert',
    );
  });

  it('opens the 3D viewer of a modelled work instead of enlarging its poster', async () => {
    // jsdom has no WebGL: the viewer asks a canvas for a context and gets none.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    await renderGalleryAt('/musee/sculpture/01');

    const work = screen.getByRole('button', { name: 'Manipuler l’œuvre en 3D' });
    expect(work.hasAttribute('aria-pressed')).toBe(false);
    fireEvent.click(work);
    await settleMotion();

    expect(openDialogs()).toHaveLength(1);
    expect(screen.getByText(/Glisser pour faire tourner/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retour à la salle' })).toHaveAttribute(
      'inert',
    );
  });

  it('shows the uncertain status for a work whose attribution is unverified', async () => {
    await renderGalleryAt('/musee/peinture/04');

    fireEvent.click(screen.getByRole('button', { name: /Lire la notice/ }));
    await settleMotion();

    expect(screen.getByText('Informations incertaines')).toBeTruthy();
  });

  it('shows "Salle en préparation" and disables artwork controls in an empty room', async () => {
    await renderGalleryAt('/musee/savoir-faire');

    expect(screen.getByRole('status').textContent).toContain(
      'Salle en préparation',
    );
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Œuvre suivante' })
        .disabled,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: /Observer de près/,
      }).disabled,
    ).toBe(true);
  });

  it('changes the wall text with the work: the text being left fades, then the next one comes in', async () => {
    await renderGalleryAt('/musee/peinture/01');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Femme malgache' }),
    ).toBeTruthy();
    expect(screen.getByText('Antonio Zeno Shindler, vers 1893')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Œuvre suivante' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Antongona' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Femme malgache' }),
    ).toBeNull();
  });

  it('changes room once the wall text has been split into lines', async () => {
    // Full motion: the arrival splits the wall title, which rebuilds its nodes.
    setForcedReducedMotion(false);
    await renderGalleryAt('/musee/peinture/01');
    // The wall tells the story of the work in front of the visitor.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Femme malgache' }),
    ).toBeTruthy();

    fireEvent.click(
      within(screen.getByRole('navigation', { name: 'Salles' })).getByRole(
        'link',
        { name: 'Sculpture' },
      ),
    );
    // The room fades to black, swaps its wall, then lights up again.
    await settleMotion();
    await settleMotion();

    expect(window.location.pathname).toBe('/musee/sculpture/01');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Pot en terre cuite vernissée',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Salle 02 sur 04 · Sculpture')).toBeTruthy();
    expect(
      screen.getByText('Salle 02 · Sculpture — Efitrano 02'),
    ).toBeTruthy();
  });

  it('never starts audio on arrival', async () => {
    const play = vi.spyOn(window.HTMLMediaElement.prototype, 'play');
    await renderGalleryAt('/musee/peinture/01');

    expect(play).not.toHaveBeenCalled();
  });
});
