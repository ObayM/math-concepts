import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RichText from '@/components/lesson/RichText';

describe('lesson links in prose', () => {
  it('link to the lesson by key', () => {
    render(<RichText>{'Rusty? Try [vectors in 3D](lesson:vec-7) first.'}</RichText>);
    const a = screen.getByRole('link', { name: 'vectors in 3D' });
    expect(a.getAttribute('href')).toBe('/l/vec-7');
  });

  it('leave any other link as plain text', () => {
    render(<RichText>{'[click](https://example.com)'}</RichText>);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
