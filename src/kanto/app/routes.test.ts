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
  it('maps account, contribution and space paths', () => {
    expect(matchRoute('/connexion')).toEqual({ kind: 'login' });
    expect(matchRoute('/inscription')).toEqual({ kind: 'register' });
    expect(matchRoute('/contribuer')).toEqual({ kind: 'contribute' });
    expect(matchRoute('/contribuer/nouvelle')).toEqual({
      kind: 'wizard',
      itemId: null,
      step: 1,
    });
    expect(matchRoute('/contribuer/abc/etape/3')).toEqual({
      kind: 'wizard',
      itemId: 'abc',
      step: 3,
    });
    expect(matchRoute('/contribuer/abc/etape/9')).toEqual({
      kind: 'redirect',
      to: '/contribuer/abc/etape/1',
    });
    expect(matchRoute('/contribuer/abc')).toEqual({
      kind: 'submission',
      itemId: 'abc',
    });
    expect(matchRoute('/mon-espace')).toEqual({ kind: 'space' });
    expect(matchRoute('/mon-espace/profil')).toEqual({ kind: 'profile' });
  });

  it('maps items, verification, scan, admin and the end of the visit', () => {
    expect(matchRoute('/oeuvres')).toEqual({ kind: 'items' });
    expect(matchRoute('/oeuvre/peinture-01')).toEqual({
      kind: 'item',
      itemId: 'peinture-01',
    });
    expect(matchRoute('/verification/x')).toEqual({
      kind: 'verification',
      itemId: 'x',
    });
    expect(matchRoute('/numerisation')).toEqual({ kind: 'scan-new' });
    expect(matchRoute('/numerisation/s1')).toEqual({ kind: 'scan', sessionId: 's1' });
    expect(matchRoute('/numerisation/s1/telephone')).toEqual({
      kind: 'scan-phone',
      sessionId: 's1',
    });
    expect(matchRoute('/admin')).toEqual({ kind: 'admin' });
    expect(matchRoute('/admin/x')).toEqual({ kind: 'admin-item', itemId: 'x' });
    expect(matchRoute('/fin-de-visite')).toEqual({ kind: 'end' });
    expect(matchRoute('/oeuvre')).toEqual({ kind: 'not-found' });
    expect(matchRoute('/numerisation/s1/autre')).toEqual({ kind: 'not-found' });
  });
});

describe('the hanging ceremony route', () => {
  it('maps /contribuer/:id/accrochage to the ceremony of that item', () => {
    expect(matchRoute('/contribuer/abc/accrochage')).toEqual({
      kind: 'hanging',
      itemId: 'abc',
    });
    expect(matchRoute('/contribuer/abc/accrochage/')).toEqual({
      kind: 'hanging',
      itemId: 'abc',
    });
  });

  it('builds the path and reads it back, encoded ids included', () => {
    expect(paths.hanging('abc')).toBe('/contribuer/abc/accrochage');
    expect(paths.hanging('a b/c')).toBe('/contribuer/a%20b%2Fc/accrochage');
    expect(matchRoute(paths.hanging('a b/c'))).toEqual({
      kind: 'hanging',
      itemId: 'a b/c',
    });
  });

  it('keeps the neighbouring contribution routes', () => {
    expect(matchRoute('/contribuer/abc')).toEqual({
      kind: 'submission',
      itemId: 'abc',
    });
    // The send is the third step now: an address of the former fourth step leads there.
    expect(matchRoute('/contribuer/abc/etape/4')).toEqual({
      kind: 'redirect',
      to: '/contribuer/abc/etape/3',
    });
  });

  it('rejects extra segments and the draft that has no id yet', () => {
    expect(matchRoute('/contribuer/abc/accrochage/encore')).toEqual({
      kind: 'not-found',
    });
    expect(matchRoute('/contribuer/nouvelle/accrochage')).toEqual({
      kind: 'not-found',
    });
    expect(matchRoute('/contribuer/abc/autre')).toEqual({ kind: 'not-found' });
  });
});
