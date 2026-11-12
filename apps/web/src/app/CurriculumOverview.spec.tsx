import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CurriculumOverview } from './CurriculumOverview';

it('permite cambiar y recorrer las pestañas curriculares con teclado', () => {
  render(<CurriculumOverview />);
  const required = screen.getByRole('tab', { name: 'Obligatorias' });
  const optional = screen.getByRole('tab', { name: /Optativas/ });
  expect(required).toHaveAttribute('aria-selected', 'true');
  expect(optional).toHaveAttribute('tabindex', '-1');
  required.focus();
  fireEvent.keyDown(required, { key: 'ArrowRight' });
  expect(optional).toHaveFocus();
  expect(optional).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', optional.id);
  fireEvent.keyDown(optional, { key: 'Home' });
  expect(required).toHaveFocus();
  expect(required).toHaveAttribute('aria-selected', 'true');
});
