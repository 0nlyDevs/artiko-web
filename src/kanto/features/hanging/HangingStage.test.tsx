import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setForcedReducedMotion } from '../../lib/motion/reduced-motion';
import { settleMotion } from '../../test/motion';
import type { HangingCartel } from './hanging-content';
import type { HangingStageProps, HangingStageSlots } from './HangingStage';
import { HangingStage } from './HangingStage';

/*
 * The stage driven by something else than a museum item: what the publication
 * of the application gives it from a Work returned by the API.
 */
const cartel: HangingCartel = {
  number: '',
  reference: 'Empreinte 3F9A…C21E',
  title: 'Hautes Terres, fin du jour',
  author: 'Rova Rasoanaivo',
  medium: 'Peinture',
  note: null,
  isDemo: false,
};

function stage(props: Partial<HangingStageProps> = {}) {
  const left: string[] = [];
  let handed: HangingStageSlots | null = null;
  render(
    <HangingStage
      status="published"
      landmarks="overlay"
      stand="rail"
      sources={{ model: null, images: ['https://api.test/media/work.jpg'] }}
      cartel={cartel}
      alt="Hautes Terres, fin du jour, Rova Rasoanaivo"
      wall={{ tone: 'red', photo: true }}
      copy={{
        eyebrow: 'Œuvre publiée',
        thanks: 'Misaotra !',
        lines: ['Votre œuvre est', 'accrochée.'],
        paragraph: 'Elle est visible dès maintenant dans votre salle.',
      }}
      labels={{ skip: 'Skip', skipAria: 'Skip the animation' }}
      detectWebGL={() => false}
      brand={(slots) => <span className={slots.classes.logo}>KANTO</span>}
      actions={(slots) => {
        handed = slots;
        return (
          <>
            <a href="#room" className={slots.classes.primary}>
              Voir dans ma salle
            </a>
            <button
              type="button"
              className={slots.classes.secondary}
              onClick={() => {
                void slots.leave('hall').then(() => left.push('another'));
              }}
            >
              Publier une autre œuvre
            </button>
          </>
        );
      }}
      {...props}
    />,
  );
  return { left, slots: () => handed };
}

describe('HangingStage', () => {
  beforeEach(() => {
    setForcedReducedMotion(true);
  });

  afterEach(() => {
    setForcedReducedMotion(null);
    vi.useRealTimers();
  });

  it('hangs a work that is not a museum item, with the copy it is given', async () => {
    stage();
    await settleMotion();

    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      /Misaotra !\s+Votre œuvre est\s+accrochée\./,
    );
    expect(screen.getByText('Misaotra !')).toHaveAttribute('lang', 'mg');
    expect(screen.getByText('Œuvre publiée')).toBeInTheDocument();
    expect(
      screen.getByText('Elle est visible dès maintenant dans votre salle.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: 'Hautes Terres, fin du jour, Rova Rasoanaivo',
      }),
    ).toHaveAttribute('src', 'https://api.test/media/work.jpg');
  });

  it('shows the reference of the work in place of a deposit number', async () => {
    stage();
    await settleMotion();

    expect(screen.getByText('Empreinte 3F9A…C21E')).toBeInTheDocument();
    expect(screen.queryByText(/^N°/)).toBeNull();
    expect(screen.queryByText('Œuvre de démonstration')).toBeNull();
  });

  it('draws the actions it is handed, links and buttons alike', async () => {
    const { slots } = stage();
    await settleMotion();

    expect(
      screen.getByRole('link', { name: 'Voir dans ma salle' }),
    ).toHaveAttribute('href', '#room');
    expect(
      screen.getByRole('button', { name: 'Publier une autre œuvre' }),
    ).toBeInTheDocument();
    const classes = slots()?.classes;
    expect(classes?.primary).toBeTruthy();
    expect(classes?.secondary).toBeTruthy();
    expect(classes?.more).toBeTruthy();
  });

  it('fades the stage before an action leaves it', async () => {
    const { left } = stage();
    await settleMotion();

    fireEvent.click(
      screen.getByRole('button', { name: 'Publier une autre œuvre' }),
    );
    expect(left).toEqual([]);
    await settleMotion();
    await vi.waitFor(() => {
      expect(left).toEqual(['another']);
    });
    expect(
      document.querySelector<HTMLElement>('[data-motion]')?.dataset['motion'],
    ).toBe('leaving');
  });

  it('adds no banner and no main landmark over a page that has its own', async () => {
    stage();
    await settleMotion();

    expect(document.querySelector('header')).toBeNull();
    expect(document.querySelector('main')).toBeNull();
  });

  it('keeps its landmarks when it is the page', async () => {
    stage({ landmarks: 'page' });
    await settleMotion();

    expect(document.querySelector('header')).not.toBeNull();
    expect(document.querySelector('main')).not.toBeNull();
  });

  it('leaves the title of the tab alone unless it is given one', async () => {
    document.title = 'My space | KANTO';
    stage();
    await settleMotion();

    expect(document.title).toBe('My space | KANTO');
  });

  it('names the skip control in the language of its host', () => {
    setForcedReducedMotion(false);
    stage();

    expect(
      screen.getByRole('button', { name: 'Skip the animation' }),
    ).toHaveTextContent('Skip');
  });

  it('drops the wall label for a work without a picture', async () => {
    stage({ stand: 'label', sources: { model: null, images: [] } });
    await settleMotion();

    expect(
      document.querySelector<HTMLElement>('[data-h="work"]')?.dataset['kind'],
    ).toBe('label');
    expect(screen.getByText('Hautes Terres, fin du jour')).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
