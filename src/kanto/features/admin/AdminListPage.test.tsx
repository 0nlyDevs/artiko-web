import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { AdminListPage } from './AdminListPage';

describe('AdminListPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn({
      email: 'relecture@kanto.demo',
      password: 'kanto-demo-2026',
    });
    window.history.replaceState(null, '', '/admin');
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('lists the submissions waiting for a review', async () => {
    render(<AdminListPage />);

    expect(
      await screen.findByRole(
        'link',
        { name: 'Hautes Terres, fin du jour' },
        { timeout: 4000 },
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Lamba landy, tissage de soie' }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: /À relire/ })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.queryByRole('link', { name: 'Femme malgache' })).toBeNull();
  });
});
