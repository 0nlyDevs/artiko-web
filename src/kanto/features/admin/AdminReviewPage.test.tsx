import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDemoData } from '../../lib/api';
import { session } from '../../lib/session/session';
import { AdminReviewPage } from './AdminReviewPage';

describe('AdminReviewPage', () => {
  beforeEach(async () => {
    resetDemoData();
    session.reset();
    await session.signIn({
      email: 'relecture@kanto.demo',
      password: 'kanto-demo-2026',
    });
    window.history.replaceState(null, '', '/admin/sub-hautes-terres');
  });

  afterEach(() => {
    session.reset();
    resetDemoData();
  });

  it('refuses a decision without a rationale', async () => {
    render(<AdminReviewPage itemId="sub-hautes-terres" />);
    await screen.findByRole(
      'heading',
      { name: 'Hautes Terres, fin du jour' },
      { timeout: 4000 },
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Accepter et publier' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Expliquez la décision/,
    );
  });

  it('approves a submission and publishes it', async () => {
    render(<AdminReviewPage itemId="sub-hautes-terres" />);
    await screen.findByRole(
      'heading',
      { name: 'Hautes Terres, fin du jour' },
      { timeout: 4000 },
    );

    fireEvent.change(screen.getByLabelText(/Justification/), {
      target: {
        value: 'Photographies cohérentes avec la description, droits déclarés.',
      },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Accepter et publier' }),
    );

    expect(
      await screen.findByText(
        /acceptée et publiée dans le musée/,
        {},
        { timeout: 4000 },
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Publiée dans le musée').length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByRole('link', { name: 'Voir la fiche publique' }),
    ).toBeTruthy();
  });
});
