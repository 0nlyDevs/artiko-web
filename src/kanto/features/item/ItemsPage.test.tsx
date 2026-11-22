import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { ItemsPage } from './ItemsPage';

function itemLinks(): HTMLElement[] {
  return screen
    .getAllByRole('link')
    .filter(
      (link) => link.getAttribute('href')?.startsWith('/oeuvre/') === true,
    );
}

describe('ItemsPage', () => {
  beforeEach(() => {
    resetDemoData();
    session.reset();
  });
  afterEach(() => {
    session.reset();
  });

  it('lists the published works and filters them by medium', async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);

    await screen.findByText('7 œuvres exposées', {}, { timeout: 4000 });
    expect(itemLinks()).toHaveLength(7);

    await user.click(screen.getByRole('button', { name: 'Sculpture' }));
    expect(screen.getByRole('button', { name: 'Sculpture' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(itemLinks()).toHaveLength(3);

    await user.type(screen.getByLabelText('Rechercher'), 'introuvable');
    expect(screen.getByText('Aucune œuvre ne correspond.')).toBeTruthy();
  });
});
