import { describe, expect, it } from 'vitest';
import { demoSubmissions, publishedItems } from '../../lib/api/mock/fixtures';
import type { Item } from '../../lib/api/types';
import {
  hangingAlt,
  hangingCartel,
  hangingCopy,
  hangingRoom,
  hangingSources,
  hangingStand,
  hangingStatus,
} from './hanging-content';

function fixture(id: string): Item {
  const item = [...publishedItems(), ...demoSubmissions()].find(
    (candidate) => candidate.id === id,
  );
  if (item === undefined) {
    throw new Error(`no fixture ${id}`);
  }
  return item;
}

const pending = fixture('sub-hautes-terres');
const published = fixture('peinture-02');
const scanned = fixture('sculpture-02');

describe('hangingStatus', () => {
  it('gives a ceremony to a published work and to one waiting for its review', () => {
    expect(hangingStatus(published)).toBe('published');
    expect(hangingStatus(pending)).toBe('pending');
  });

  it('gives none to a draft, a refused work or one sent back for changes', () => {
    expect(hangingStatus(fixture('sub-sinibe'))).toBeNull();
    expect(hangingStatus(fixture('sub-paysage-genere'))).toBeNull();
    expect(hangingStatus(fixture('sub-lamba'))).toBeNull();
  });

  it('gives none to an approved work that was taken down', () => {
    expect(hangingStatus({ ...published, publication: 'unpublished' })).toBeNull();
    expect(hangingStatus({ ...published, publication: 'draft' })).toBeNull();
  });
});

describe('hangingCopy', () => {
  it('says a published work is hung and leads to it in its room', () => {
    expect(hangingCopy(published)).toEqual({
      status: 'published',
      eyebrow: 'Œuvre publiée',
      thanks: 'Misaotra !',
      lines: ['Votre œuvre est', 'accrochée.'],
      paragraph: 'Elle est visible dès maintenant dans la salle Peinture.',
      primary: { label: 'Voir dans la salle', to: '/musee/peinture/02' },
      secondary: { label: 'Déposer une autre œuvre', to: '/contribuer/nouvelle' },
      tertiary: { label: 'Retour à mon espace', to: '/mon-espace' },
    });
  });

  it('says a sent work is deposited, not hung, and leads to its follow-up', () => {
    expect(hangingCopy(pending)).toEqual({
      status: 'pending',
      eyebrow: 'Dépôt reçu',
      thanks: 'Misaotra !',
      lines: ['Votre œuvre est', 'déposée.'],
      paragraph:
        'Elle sera accrochée dans la salle Peinture dès qu’un relecteur l’aura validée. Suivez son parcours depuis votre espace.',
      primary: { label: 'Suivre mon dépôt', to: '/contribuer/sub-hautes-terres' },
      secondary: { label: 'Déposer une autre œuvre', to: '/contribuer/nouvelle' },
      tertiary: { label: 'Continuer la visite', to: '/musee/peinture/01' },
    });
  });

  it('never claims a hanging for a work that is only sent', () => {
    const copy = hangingCopy(pending);
    expect(`${copy?.eyebrow ?? ''} ${copy?.lines.join(' ') ?? ''}`).not.toMatch(
      /accrochée|publiée/i,
    );
  });

  it('has no copy for a status without ceremony', () => {
    expect(hangingCopy(fixture('sub-sinibe'))).toBeNull();
    expect(hangingCopy(fixture('sub-lamba'))).toBeNull();
    expect(hangingCopy(fixture('sub-paysage-genere'))).toBeNull();
  });

  it('names the room of the medium', () => {
    const craft: Item = { ...pending, medium: 'craft' };
    const music: Item = { ...pending, medium: 'music' };
    expect(hangingCopy(craft)?.paragraph).toContain('la salle Savoir-faire');
    expect(hangingCopy(music)?.paragraph).toContain('la salle Musique');
    expect(hangingCopy(scanned)?.paragraph).toContain('la salle Sculpture');
  });
});

describe('hangingRoom', () => {
  it('uses the red room photograph for a painting and a wall tone elsewhere', () => {
    expect(hangingRoom(pending)).toMatchObject({
      name: 'Peinture',
      wallTone: 'red',
      usesRedRoomScene: true,
    });
    expect(hangingRoom(scanned)).toMatchObject({
      name: 'Sculpture',
      wallTone: 'stone',
      usesRedRoomScene: false,
    });
    expect(hangingRoom({ ...pending, medium: 'craft' }).wallTone).toBe('ochre');
    expect(hangingRoom({ ...pending, medium: 'music' }).wallTone).toBe('indigo');
  });

  it('leads to the work when the room hangs it, to the room otherwise', () => {
    expect(hangingRoom(scanned).path).toBe('/musee/sculpture/02');
    // A published contribution that the room data does not hang yet.
    const unplaced: Item = { ...published, id: 'new-work', room: null };
    expect(hangingRoom(unplaced).path).toBe('/musee/peinture/01');
    // A room without any work opens on its own address.
    expect(hangingRoom({ ...unplaced, medium: 'music' }).path).toBe(
      '/musee/musique',
    );
  });
});

describe('hangingStand', () => {
  it('is a plinth for a ready 3D model', () => {
    expect(hangingStand(scanned)).toBe('plinth');
  });

  it('is a picture rail when the main media is an image', () => {
    expect(hangingStand(pending)).toBe('rail');
    expect(
      hangingStand({
        ...scanned,
        model3d: { contentId: scanned.id, status: 'processing', variants: null },
      }),
    ).toBe('rail');
  });

  it('is a wall label for a work with neither', () => {
    expect(hangingStand(fixture('sub-sinibe'))).toBe('label');
  });
});

describe('hangingSources', () => {
  it('offers the model, then its poster and the photographs', () => {
    const sources = hangingSources(scanned);
    expect(sources.model).toBe(scanned.model3d.variants?.glb1k);
    expect(sources.images[0]).toBe(scanned.model3d.variants?.poster);
  });

  it('puts the main image first and has no model for a picture', () => {
    const second = { ...pending.media[0], id: 'second', url: '/second.jpg', primary: false };
    const first = { ...pending.media[0], id: 'first', url: '/first.jpg', primary: true };
    const sources = hangingSources({
      ...pending,
      media: [second, first] as Item['media'],
    });
    expect(sources).toEqual({ model: null, images: ['/first.jpg', '/second.jpg'] });
  });

  it('has nothing to show for a work without media', () => {
    expect(hangingSources(fixture('sub-sinibe'))).toEqual({
      model: null,
      images: [],
    });
  });
});

describe('hangingCartel and hangingAlt', () => {
  it('labels the work with its deposit number, title, author and medium', () => {
    expect(hangingCartel(pending, 'pending')).toEqual({
      number: 'KT-2026-0148',
      title: 'Hautes Terres, fin du jour',
      author: 'Rasoa Haingo',
      medium: 'Peinture',
      note: 'En attente de relecture',
      isDemo: true,
    });
    expect(hangingCartel(published, 'published').note).toBeNull();
  });

  it('names an untitled work', () => {
    const untitled: Item = { ...pending, title: ' ', author: '' };
    expect(hangingCartel(untitled, 'pending').title).toBe('Sans titre');
    expect(hangingAlt(untitled)).toBe('Œuvre sans titre');
    expect(hangingAlt(pending)).toBe('Hautes Terres, fin du jour, Rasoa Haingo');
  });
});
