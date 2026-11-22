import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { session } from '../../lib/session/session';
import { settleMotion } from '../../test/motion';
import { HangingPage } from './HangingPage';

const PASSWORD = 'kanto-demo-2026';
const CONTRIBUTOR = { email: 'visiteur@kanto.demo', password: PASSWORD };
const REVIEWER = { email: 'relecture@kanto.demo', password: PASSWORD };
const WORKSHOP = { email: 'atelier@kanto.demo', password: PASSWORD };

const PENDING = 'sub-hautes-terres';
const HEADLINE_PENDING = /Misaotra !\s+Votre œuvre est\s+déposée\./;
const HEADLINE_PUBLISHED = /Misaotra !\s+Votre œuvre est\s+accrochée\./;

function root(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-motion]');
  if (element === null) {
    throw new Error('the ceremony is not rendered');
  }
  return element;
}

function work(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-h="work"]');
  if (element === null) {
    throw new Error('no work in the ceremony');
  }
  return element;
}

/** jsdom never loads an image: tell the page that the picture and its frame arrived. */
function loadImages(): void {
  for (const image of work().querySelectorAll('img')) {
    fireEvent.load(image);
  }
}

async function open(itemId: string, props: object = {}) {
  window.history.replaceState(null, '', `/contribuer/${itemId}/accrochage`);
  render(<HangingPage itemId={itemId} detectWebGL={() => false} {...props} />);
  return screen.findByRole('heading', { level: 1 }, { timeout: 3000 });
}

describe('HangingPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn(CONTRIBUTOR);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
    session.reset();
    resetDemoData();
  });

  describe('a status without ceremony', () => {
    it('sends a draft to its submission page', async () => {
      window.history.replaceState(null, '', '/contribuer/sub-sinibe/accrochage');
      render(<HangingPage itemId="sub-sinibe" />);

      await waitFor(
        () => {
          expect(window.location.pathname).toBe('/contribuer/sub-sinibe');
        },
        { timeout: 3000 },
      );
      expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    it('sends a refused work to its submission page', async () => {
      render(<HangingPage itemId="sub-paysage-genere" />);

      await waitFor(
        () => {
          expect(window.location.pathname).toBe(
            '/contribuer/sub-paysage-genere',
          );
        },
        { timeout: 3000 },
      );
    });

    it('sends a work sent back for changes to its submission page', async () => {
      session.reset();
      await session.signIn(WORKSHOP);
      render(<HangingPage itemId="sub-lamba" />);

      await waitFor(
        () => {
          expect(window.location.pathname).toBe('/contribuer/sub-lamba');
        },
        { timeout: 3000 },
      );
    });

    it('sends an unknown work to the submission page, which says it is not found', async () => {
      render(<HangingPage itemId="nope" />);

      await waitFor(
        () => {
          expect(window.location.pathname).toBe('/contribuer/nope');
        },
        { timeout: 3000 },
      );
    });

    it('sends someone who does not own a published work to its public notice', async () => {
      render(<HangingPage itemId="peinture-01" />);

      await waitFor(
        () => {
          expect(window.location.pathname).toBe('/oeuvre/peinture-01');
        },
        { timeout: 3000 },
      );
      expect(screen.queryByText(/Votre œuvre/)).toBeNull();
    });
  });

  describe('with reduced motion', () => {
    beforeEach(() => {
      setForcedReducedMotion(true);
    });

    it('shows the final state at once, without a fall or a skip control', async () => {
      const heading = await open(PENDING);
      await settleMotion();

      expect(heading).toHaveAccessibleName(HEADLINE_PENDING);
      expect(root().dataset['motion']).toBe('done');
      expect(screen.queryByRole('button', { name: /Passer/ })).toBeNull();
      // Nothing is left above the screen or hidden.
      expect(work().style.transform).not.toMatch(/translate\(0px, -/);
      expect(work().style.visibility).not.toBe('hidden');
      for (const text of [
        screen.getByText('Dépôt reçu'),
        screen.getByText(/Elle sera accrochée dans la salle Peinture/),
        screen.getByRole('link', { name: 'Suivre mon dépôt' }),
      ]) {
        expect(text.closest('[style*="opacity: 0"]')).toBeNull();
      }
    });

    it('moves the focus to the headline when the page is shown', async () => {
      const heading = await open(PENDING);
      await settleMotion();

      await waitFor(() => {
        expect(document.activeElement).toBe(heading);
      });
    });
  });

  it('says a sent work is deposited, with the three ways out', async () => {
    const heading = await open(PENDING);

    expect(heading).toHaveAccessibleName(HEADLINE_PENDING);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Dépôt reçu')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Elle sera accrochée dans la salle Peinture dès qu’un relecteur l’aura validée. Suivez son parcours depuis votre espace.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Suivre mon dépôt' }),
    ).toHaveAttribute('href', `/contribuer/${PENDING}`);
    expect(
      screen.getByRole('link', { name: 'Déposer une autre œuvre' }),
    ).toHaveAttribute('href', '/contribuer/nouvelle');
    expect(
      screen.getByRole('link', { name: 'Continuer la visite' }),
    ).toHaveAttribute('href', '/musee/peinture/01');
  });

  it('says a published work is hung, with the three ways out', async () => {
    session.reset();
    await session.signIn(REVIEWER);
    const heading = await open('peinture-02');

    expect(heading).toHaveAccessibleName(HEADLINE_PUBLISHED);
    expect(screen.getByText('Œuvre publiée')).toBeInTheDocument();
    expect(
      screen.getByText('Elle est visible dès maintenant dans la salle Peinture.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Voir dans la salle' }),
    ).toHaveAttribute('href', '/musee/peinture/02');
    expect(
      screen.getByRole('link', { name: 'Déposer une autre œuvre' }),
    ).toHaveAttribute('href', '/contribuer/nouvelle');
    expect(
      screen.getByRole('link', { name: 'Retour à mon espace' }),
    ).toHaveAttribute('href', '/mon-espace');
  });

  it('marks the Malagasy thanks, keeps the demo mark and labels the work', async () => {
    const heading = await open(PENDING);

    const thanks = heading.querySelector('[lang="mg"]');
    expect(thanks?.textContent).toBe('Misaotra !');
    expect(screen.getAllByText(/démonstration/i).length).toBeGreaterThan(0);
    expect(screen.getByText('N° KT-2026-0148')).toBeInTheDocument();
    expect(screen.getByText('Hautes Terres, fin du jour')).toBeInTheDocument();
    expect(screen.getByText(/En attente de relecture/)).toBeInTheDocument();
    // The room is decor: assistive technology gets the text and the work only.
    expect(document.querySelector('[data-h="scene"]')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(root().dataset['scene']).toBe('photo');
    expect(root().dataset['stand']).toBe('rail');
  });

  it('keeps the text readable by assistive technology while the sequence plays', async () => {
    const heading = await open(PENDING);

    expect(root().dataset['motion']).toBe('running');
    // Opacity only: nothing takes the text out of the accessibility tree.
    for (const text of [
      heading,
      screen.getByText('Dépôt reçu'),
      screen.getByText(/Elle sera accrochée dans la salle Peinture/),
      screen.getByRole('link', { name: 'Suivre mon dépôt' }),
    ]) {
      expect(text.style.visibility).toBe('');
      expect(text.closest('[aria-hidden="true"], [inert], [hidden]')).toBeNull();
    }
    expect(heading.style.opacity).toBe('0');
    expect(screen.getByRole('button', { name: 'Passer l’animation' })).toBeVisible();
    // The work is out of reach until it has landed.
    expect(work()).toHaveAttribute('inert');
  });

  it('jumps to the final state when the visitor skips', async () => {
    const heading = await open(PENDING);

    fireEvent.click(screen.getByRole('button', { name: 'Passer l’animation' }));

    await waitFor(() => {
      expect(root().dataset['motion']).toBe('done');
    });
    expect(screen.queryByRole('button', { name: /Passer/ })).toBeNull();
    expect(work()).not.toHaveAttribute('inert');
    expect(heading.style.opacity).toBe('1');
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
  });

  it('jumps to the final state when the keyboard reaches an action', async () => {
    const heading = await open(PENDING);
    const primary = screen.getByRole('link', { name: 'Suivre mon dépôt' });

    primary.focus();

    await waitFor(() => {
      expect(root().dataset['motion']).toBe('done');
    });
    expect(screen.queryByRole('button', { name: /Passer/ })).toBeNull();
    // The focus stays where the visitor put it: the headline does not take it.
    // (jsdom drops the focus when GSAP measures an element it cannot lay out,
    // so the browser check covers that it stays on the link itself.)
    await settleMotion();
    expect(document.activeElement).not.toBe(heading);
  });

  it('plays to its end once the picture and its frame are loaded', async () => {
    const heading = await open(PENDING);
    expect(work().dataset['ready']).toBe('false');

    loadImages();
    await waitFor(() => {
      expect(work().dataset['ready']).toBe('true');
    });
    await settleMotion();

    await waitFor(() => {
      expect(root().dataset['motion']).toBe('done');
    });
    expect(work().dataset['kind']).toBe('frame');
    expect(screen.queryByRole('button', { name: /Passer/ })).toBeNull();
    expect(heading).toHaveAccessibleName(HEADLINE_PENDING);
    await waitFor(() => {
      expect(document.activeElement).toBe(heading);
    });
  });

  it('drops the label of the work when its picture cannot be shown', async () => {
    await open(PENDING);

    for (const image of work().querySelectorAll('img[alt]:not([alt=""])')) {
      fireEvent.error(image);
    }

    await waitFor(() => {
      expect(work().dataset['kind']).toBe('label');
    });
    expect(work().dataset['ready']).toBe('true');
    expect(screen.getAllByText('Hautes Terres, fin du jour')).toHaveLength(1);
  });

  it('stands the poster on the plinth when WebGL is missing', async () => {
    session.reset();
    await session.signIn(REVIEWER);
    await open('sculpture-02');

    expect(root().dataset['stand']).toBe('plinth');
    expect(root().dataset['scene']).toBe('tone');
    expect(root().dataset['wall']).toBe('stone');
    expect(work().dataset['kind']).toBe('poster');
    expect(document.querySelector('model-viewer')).toBeNull();
    expect(
      screen.getByAltText(/Vase ancien en céramique à décor peint/),
    ).toHaveAttribute('src', expect.stringContaining('poster.png'));
  });

  it('stands the scanned work on the plinth and lets it be turned once landed', async () => {
    session.reset();
    await session.signIn(REVIEWER);
    await open('sculpture-02', {
      detectWebGL: () => true,
      loadModelViewer: () => Promise.resolve(),
    });

    const viewer = document.querySelector('model-viewer');
    expect(viewer).not.toBeNull();
    expect(work().dataset['kind']).toBe('model');
    expect(viewer).toHaveAttribute('src', expect.stringContaining('_1k.gltf'));
    expect(viewer).toHaveAttribute('loading', 'eager');
    expect(viewer).toHaveAttribute('disable-zoom');
    expect(viewer).toHaveAttribute('interaction-prompt', 'none');
    expect(viewer).not.toHaveAttribute('camera-controls');

    // Stand in for model-viewer: the calls the plinth needs, then its load event.
    Object.assign(viewer ?? {}, {
      getDimensions: () => ({ x: 0.26, y: 0.44, z: 0.26 }),
      getBoundingBoxCenter: () => ({ x: 0, y: 0.22, z: 0 }),
      getFieldOfView: () => 30,
      updateFraming: () => Promise.resolve(),
      jumpCameraToGoal: () => undefined,
    });
    fireEvent(viewer ?? document.body, new Event('load'));
    await waitFor(
      () => {
        expect(work().dataset['ready']).toBe('true');
      },
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Passer l’animation' }));

    await waitFor(() => {
      expect(viewer).toHaveAttribute('camera-controls');
    });
    expect(work()).not.toHaveAttribute('inert');
  });

  it('gives way to the poster when the model fails', async () => {
    session.reset();
    await session.signIn(REVIEWER);
    await open('sculpture-02', {
      detectWebGL: () => true,
      loadModelViewer: () => Promise.reject(new Error('no model-viewer')),
    });

    await waitFor(() => {
      expect(work().dataset['kind']).toBe('poster');
    });
    expect(document.querySelector('model-viewer')).toBeNull();
  });

  it('plays its exit, then leaves through the chosen action', async () => {
    await open(PENDING);
    fireEvent.click(screen.getByRole('button', { name: 'Passer l’animation' }));
    await waitFor(() => {
      expect(root().dataset['motion']).toBe('done');
    });

    fireEvent.click(screen.getByRole('link', { name: 'Suivre mon dépôt' }));

    expect(root().dataset['motion']).toBe('leaving');
    expect(window.location.pathname).toBe(`/contribuer/${PENDING}/accrochage`);
    // The hall is ivory: the screen fades to it, not to black.
    expect(document.querySelector('[data-h="veil"]')).toHaveAttribute(
      'data-tone',
      'hall',
    );
    await settleMotion();
    await waitFor(() => {
      expect(window.location.pathname).toBe(`/contribuer/${PENDING}`);
    });
  });

  it('fades to black when it leaves for the museum', async () => {
    await open(PENDING);
    fireEvent.click(screen.getByRole('button', { name: 'Passer l’animation' }));
    await waitFor(() => {
      expect(root().dataset['motion']).toBe('done');
    });

    fireEvent.click(screen.getByRole('link', { name: 'Continuer la visite' }));

    expect(document.querySelector('[data-h="veil"]')).toHaveAttribute(
      'data-tone',
      'museum',
    );
    await settleMotion();
    await waitFor(() => {
      expect(window.location.pathname).toBe('/musee/peinture/01');
    });
  });
});
