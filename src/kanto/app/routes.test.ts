import { describe, expect, it } from 'vitest';
import { matchRoute, paths } from './routes';

describe('matchRoute', () => {
  it('maps the root to the home screen', () => {
    expect(matchRoute('/')).toEqual({ kind: 'home' });
  });

  it('resolves an artwork URL to its room and index', () => {
    const route = matchRoute('/musee/peinture/03');
    expect(route.kind).toBe('gallery');
    if (route.kind === 'gallery') {
      expect(route.room.slug).toBe('peinture');
      expect(route.artworkIndex).toBe(2);
    }
  });

  it('redirects a bare room with artworks to its first artwork', () => {
    expect(matchRoute('/musee/peinture')).toEqual({
      kind: 'redirect',
      to: '/musee/peinture/01',
    });
  });

  it('shows a room without artworks as in preparation', () => {
    const route = matchRoute('/musee/savoir-faire');
    expect(route.kind).toBe('gallery');
    if (route.kind === 'gallery') {
      expect(route.artworkIndex).toBeNull();
    }
  });

  it('sends the former /galerie address to the museum entrance', () => {
    expect(matchRoute('/galerie')).toEqual({
      kind: 'redirect',
      to: '/musee/peinture/01',
    });
    expect(matchRoute('/galerie/salle-2')).toEqual({
      kind: 'redirect',
      to: '/musee/peinture/01',
    });
  });

  it('redirects an unknown artwork number back to the room', () => {
    expect(matchRoute('/musee/peinture/99')).toEqual({
      kind: 'redirect',
      to: '/musee/peinture/01',
    });
  });

  it('rejects unknown rooms and extra segments', () => {
    expect(matchRoute('/musee/cuisine')).toEqual({ kind: 'not-found' });
    expect(matchRoute('/musee/peinture/01/extra')).toEqual({
      kind: 'not-found',
    });
  });
});

describe('matchRoute for the hall pages', () => {
  it('sends the old account, deposit and space addresses to the real pages', () => {
    expect(matchRoute('/connexion')).toEqual({ kind: 'redirect', to: '/sign-in' });
    expect(matchRoute('/inscription')).toEqual({ kind: 'redirect', to: '/sign-up' });
    expect(matchRoute('/mon-espace')).toEqual({ kind: 'redirect', to: '/me' });
    expect(matchRoute('/mon-espace/profil')).toEqual({ kind: 'redirect', to: '/me?tab=profile' });
    expect(matchRoute('/contribuer')).toEqual({ kind: 'redirect', to: '/me?tab=publish' });
    expect(matchRoute('/contribuer/nouvelle')).toEqual({ kind: 'redirect', to: '/me?tab=publish' });
    expect(paths.login('/musee')).toBe('/sign-in?next=%2Fmusee');
  });


  it('sends the simulated pages to their real counterparts and keeps the end of the visit', () => {
    expect(matchRoute('/oeuvres')).toEqual({ kind: 'redirect', to: '/explore' });
    expect(matchRoute('/oeuvre/abc')).toEqual({ kind: 'redirect', to: '/explore' });
    expect(matchRoute('/verification/abc')).toEqual({ kind: 'redirect', to: '/me' });
    expect(matchRoute('/numerisation')).toEqual({ kind: 'redirect', to: '/me?tab=publish' });
    expect(matchRoute('/admin')).toEqual({ kind: 'redirect', to: '/' });
    expect(matchRoute('/fin-de-visite')).toEqual({ kind: 'end' });
  });

});


