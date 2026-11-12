import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { CatalogPage } from '@siga/contracts';

type Option = { id: string };

export function PagedSelect<T extends Option>({
  id,
  label,
  value,
  onChange,
  fetchPage,
  queryKey,
  optionLabel,
  include = () => true,
  fallback,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  fetchPage: (
    query: string,
    page: number,
    size: number,
    signal?: AbortSignal,
  ) => Promise<CatalogPage<T>>;
  queryKey: string[];
  optionLabel: (item: T) => string;
  include?: (item: T) => boolean;
  fallback?: { id: string; label: string } | null;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<{ id: string; label: string } | null>(null);
  const options = useQuery({
    queryKey: [...queryKey, search, page],
    queryFn: ({ signal }) => fetchPage(search, page, 100, signal),
    placeholderData: keepPreviousData,
  });
  const items = options.data?.items.filter(include) ?? [];
  const selected = chosen?.id === value ? chosen : fallback?.id === value ? fallback : null;
  return (
    <>
      <label htmlFor={`${id}-search`}>Buscar {label.toLowerCase()}</label>
      <input
        id={`${id}-search`}
        maxLength={120}
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      {options.isError && (
        <p role="alert">No se pudieron consultar las opciones de {label.toLowerCase()}.</p>
      )}
      <nav aria-label={`Opciones de ${label.toLowerCase()}`}>
        <button
          type="button"
          disabled={page <= 1 || options.isFetching}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </button>
        <span>
          {' '}
          Página {page} de {Math.max(1, Math.ceil((options.data?.total ?? 0) / 100))} ·{' '}
          {options.data?.total ?? 0} resultados{' '}
        </span>
        <button
          type="button"
          disabled={!options.data || options.isFetching || page * 100 >= options.data.total}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </nav>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        required
        value={value}
        disabled={options.isFetching && !selected}
        onChange={(event) => {
          const item = items.find((option) => option.id === event.target.value);
          setChosen(item ? { id: item.id, label: optionLabel(item) } : null);
          onChange(event.target.value);
        }}
      >
        <option value="">Selecciona una opción</option>
        {value && selected && !items.some((item) => item.id === value) && (
          <option value={value}>{selected.label}</option>
        )}
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {optionLabel(item)}
          </option>
        ))}
      </select>
    </>
  );
}
