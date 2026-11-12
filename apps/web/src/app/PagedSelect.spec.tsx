import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PagedSelect } from './PagedSelect';

it('alcanza registros posteriores y conserva el valor al cambiar el filtro', async () => {
  const fetchPage = vi.fn(async (q: string, page: number, pageSize: number) => ({
    items: q === '' && page === 3 ? [{ id: '201', nombre: 'Opción 201' }] : [],
    page,
    pageSize,
    total: q ? 0 : 201,
  }));
  function Form() {
    const [value, setValue] = useState('historico');
    return (
      <PagedSelect
        id="test"
        label="Plan"
        value={value}
        onChange={setValue}
        fetchPage={fetchPage}
        queryKey={['test']}
        optionLabel={(item) => item.nombre}
        fallback={{ id: 'historico', label: 'Plan histórico' }}
      />
    );
  }
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Form />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText('Plan')).toHaveValue('historico');
  const navigation = screen.getByRole('navigation', { name: 'Opciones de plan' });
  await waitFor(() =>
    expect(within(navigation).getByRole('button', { name: 'Siguiente' })).toBeEnabled(),
  );
  fireEvent.click(within(navigation).getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(within(navigation).getByText(/Página 2 de 3/)).toBeInTheDocument());
  await waitFor(() =>
    expect(within(navigation).getByRole('button', { name: 'Siguiente' })).toBeEnabled(),
  );
  fireEvent.click(within(navigation).getByRole('button', { name: 'Siguiente' }));
  await screen.findByRole('option', { name: 'Opción 201' });
  fireEvent.change(screen.getByLabelText('Plan'), { target: { value: '201' } });
  fireEvent.change(screen.getByLabelText('Buscar plan'), { target: { value: 'sin resultados' } });
  await waitFor(() =>
    expect(fetchPage).toHaveBeenLastCalledWith('sin resultados', 1, 100, expect.any(AbortSignal)),
  );
  expect(screen.getByLabelText('Plan')).toHaveValue('201');
  expect(screen.getByRole('option', { name: 'Opción 201' })).toBeInTheDocument();
});
