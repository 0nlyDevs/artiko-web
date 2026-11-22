import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QrCode, qrPath } from './QrCode';

describe('QrCode', () => {
  it('renders an accessible svg with one path of dark modules', () => {
    const { container } = render(
      <QrCode value="https://example.org/scan/abc" label="Code à scanner" />,
    );
    const svg = screen.getByRole('img', { name: 'Code à scanner' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    expect(path?.getAttribute('d')).toMatch(/^M\d+ \d+h1v1h-1z/);
  });

  it('adds a quiet zone around the modules', () => {
    const { modules } = qrPath('KANTO');
    expect(modules).toBeGreaterThanOrEqual(21 + 8);
  });
});
