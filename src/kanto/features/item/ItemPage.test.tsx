import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { ItemPage } from './ItemPage';

describe('ItemPage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
  });
  afterEach(() => {
    session.reset();
  });

  it('shows a published work with its two review labels and the museum link', async () => {
    render(<ItemPage itemId="peinture-01" />);

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Femme malgache' },
        { timeout: 4000 },
      ),
    ).toBeTruthy();
    expect(screen.getByText(/Vérifié/)).toBeTruthy();
    expect(screen.getByText(/Non relu/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dans le musée' })).toHaveAttribute(
      'href',
      '/musee/peinture/01',
    );
    expect(screen.getByText('Aucun certificat')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /certificat/i })).toBeNull();
  });

  it('answers "introuvable" for an unknown id and for a draft seen by a guest', async () => {
    render(<ItemPage itemId="nulle-part" />);
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /introuvable/ },
        { timeout: 4000 },
      ),
    ).toBeTruthy();
  });

  it('never leaks a draft to a guest', async () => {
    render(<ItemPage itemId="sub-sinibe" />);
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /introuvable/ },
        { timeout: 4000 },
      ),
    ).toBeTruthy();
  });
});
