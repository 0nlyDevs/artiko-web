import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '@/i18n/locale';
import type { MuseumPlan as Plan } from '../../lib/museum-data/plan';
import { UNREAD_PLAN } from '../../lib/museum-data/plan';
import { setMuseumPlan } from '../../lib/museum-data/store';
import { MuseumPlan } from './MuseumPlan';

// What the hosted API answers today: three art forms have works, five have none.
const HOSTED: Plan = {
  rooms: [
    { id: 'painting', label: 'Painting', state: 'open' },
    { id: 'sculpture', label: 'Sculpture', state: 'empty' },
    { id: 'photography', label: 'Photography', state: 'open' },
    { id: 'music', label: 'Music', state: 'empty' },
    { id: 'dance', label: 'Dance', state: 'empty' },
    { id: 'oral_arts', label: 'Oral arts', state: 'empty' },
    { id: 'crafts', label: 'Crafts', state: 'open' },
    { id: 'digital', label: 'Digital art', state: 'empty' },
  ],
  artists: [
    { id: 'a1', name: 'Hei', region: 'Analamanga' },
    { id: 'a2', name: 'Rova Rasoanaivo', region: '' },
  ],
  complete: true,
};

function renderPlan(activeRoomSlug = 'peinture') {
  const onClose = vi.fn();
  render(
    <MuseumPlan
      activeRoomSlug={activeRoomSlug}
      titleId="plan-title"
      onClose={onClose}
    />,
  );
  return { onClose };
}

function roomItems(listName = 'Salles'): HTMLElement[] {
  return within(screen.getByRole('list', { name: listName })).getAllByRole(
    'listitem',
  );
}

describe('MuseumPlan', () => {
  beforeEach(() => {
    setLocale('fr');
    setMuseumPlan(HOSTED);
  });

  afterEach(() => {
    setMuseumPlan(null);
    setLocale('en');
  });

  it('draws the eight rooms with their translated names and short descriptions', () => {
    renderPlan();

    expect(
      screen.getByRole('heading', { name: 'Plan du musée' }),
    ).toBeTruthy();
    const items = roomItems();
    expect(items).toHaveLength(8);
    expect(items[0]?.textContent).toContain('Salle 01');
    expect(items[0]?.textContent).toContain('Peinture');
    expect(items[0]?.textContent).toContain('Toiles, dessins, papier');
    expect(items[7]?.textContent).toContain('Salle 08');
    expect(items[7]?.textContent).toContain('Création sur écran');
  });

  it('writes « Entrer » on a room with works and « Accrochage en cours » on an empty one', () => {
    renderPlan();
    const items = roomItems();

    expect(items[2]?.textContent).toContain('Entrer');
    expect(items[6]?.textContent).toContain('Entrer');
    for (const index of [1, 3, 4, 5, 7]) {
      expect(items[index]?.textContent).toContain('Accrochage en cours');
      expect(items[index]?.textContent).not.toContain('Entrer');
    }
  });

  it('follows the probes when they change: no room is hard-coded', () => {
    setMuseumPlan({
      ...HOSTED,
      rooms: HOSTED.rooms.map((room) => ({
        ...room,
        state: room.id === 'dance' ? 'open' : 'empty',
      })),
    });
    renderPlan('musique');
    const items = roomItems();

    expect(items[4]?.textContent).toContain('Entrer');
    expect(within(items[4] as HTMLElement).getByRole('link')).toHaveAttribute(
      'href',
      '/explore?category=dance',
    );
    expect(items[2]?.textContent).toContain('Accrochage en cours');
    expect(within(items[2] as HTMLElement).queryByRole('link')).toBeNull();
  });

  it('opens the demonstration room, or the works of the category in Explore', () => {
    const { onClose } = renderPlan();
    const items = roomItems();
    const link = (index: number) =>
      within(items[index] as HTMLElement).queryByRole('link');

    expect(link(0)).toHaveAttribute('href', '/musee/peinture/01');
    expect(link(0)).toHaveAttribute('aria-current', 'page');
    expect(items[0]?.textContent).toContain('Vous êtes ici');
    expect(link(1)).toHaveAttribute('href', '/musee/sculpture/01');
    expect(link(2)).toHaveAttribute('href', '/explore?category=photography');
    expect(link(6)).toHaveAttribute('href', '/musee/savoir-faire');
    // Empty art forms without a room of their own lead nowhere.
    expect(link(4)).toBeNull();
    expect(link(5)).toBeNull();
    expect(link(7)).toBeNull();

    // A KANTO room is reached without leaving the document, and the plan closes.
    fireEvent.click(link(1) as HTMLElement);
    expect(window.location.pathname).toBe('/musee/sculpture/01');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists the artists with their room, then « Tous les artistes »', () => {
    renderPlan();
    const block = screen.getByRole('region', {
      name: 'Salles d’artistes · chaque artiste a la sienne',
    });
    const links = within(block).getAllByRole('link');

    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAccessibleName('Hei · Analamanga');
    // An artist without a region is named alone.
    expect(links[1]).toHaveAccessibleName('Rova Rasoanaivo');
    expect(links[2]).toHaveAccessibleName('Tous les artistes');
    expect(links[0]).toHaveAttribute('href', '/artists/a1/museum');
    expect(links[2]?.getAttribute('href')).toMatch(/^\/explore/);
  });

  it('links to the hall, the Panthéon of the current room, the publication and the end of the visit', () => {
    renderPlan();

    expect(
      screen.getByRole('link', { name: 'Retour au hall d’accueil' }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: 'Panthéon du mois' }),
    ).toHaveAttribute('href', '/hall-of-fame?category=painting');
    expect(
      screen.getByRole('link', { name: 'Publier une œuvre' }),
    ).toHaveAttribute('href', '/me?tab=publish');
    expect(
      screen.getByRole('link', { name: 'Terminer la visite' }),
    ).toHaveAttribute('href', '/fin-de-visite');
    expect(screen.getByRole('link', { name: 'Mon espace' })).toHaveAttribute(
      'href',
      '/me',
    );
    expect(
      screen.getByRole('link', { name: 'Patrimoine vivant' }),
    ).toHaveAttribute('href', '/heritage');
    expect(screen.getByRole('link', { name: 'Scanner' })).toHaveAttribute(
      'href',
      '/scan',
    );
  });

  it('shows the eight rooms without a state while the server answer has not arrived', () => {
    setMuseumPlan(null);
    renderPlan();
    const list = screen.getByRole('list', { name: 'Salles' });

    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(roomItems()).toHaveLength(8);
    expect(list.textContent).not.toContain('Accrochage en cours');
    expect(screen.queryByRole('status')).toBeNull();
    // The arrow is decoration: the link is named by its words.
    expect(
      screen.getByRole('link', { name: 'Tous les artistes' }),
    ).toBeTruthy();
  });

  it('says so when the API could not be read, and declares no room empty', () => {
    setMuseumPlan(UNREAD_PLAN);
    renderPlan();

    expect(screen.getByRole('status').textContent).toContain(
      'Le musée ne répond pas',
    );
    const list = screen.getByRole('list', { name: 'Salles' });
    expect(list).toHaveAttribute('aria-busy', 'false');
    expect(list.textContent).not.toContain('Accrochage en cours');
    expect(within(list).getAllByRole('link')).toHaveLength(8);
  });

  it('switches language from the plan and closes with its button', () => {
    const { onClose } = renderPlan();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'English' }));
    });
    expect(screen.getByRole('heading', { name: 'Museum plan' })).toBeTruthy();
    expect(roomItems('Rooms')[5]?.textContent).toContain('Oral arts');
    expect(screen.getByRole('navigation')).toHaveAttribute('lang', 'en');

    fireEvent.click(screen.getByRole('button', { name: 'Close · Esc' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
