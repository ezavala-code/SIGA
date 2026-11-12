import { afterEach, expect, it, vi } from 'vitest';
import {
  advanceSessionGeneration,
  getSessionGeneration,
  isSessionRequestCurrent,
  privateFetch,
  setUnauthorizedHandler,
} from './privateFetch';

afterEach(() => {
  setUnauthorizedHandler(undefined);
  vi.unstubAllGlobals();
});

it('ignora un 401 tardío de una sesión anterior', async () => {
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    ),
  );
  const unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
  const generation = getSessionGeneration();
  const pending = privateFetch('/api/privado');
  expect(isSessionRequestCurrent(generation)).toBe(true);
  advanceSessionGeneration();
  expect(isSessionRequestCurrent(generation)).toBe(false);
  finish(new Response(null, { status: 401 }));
  await pending;
  expect(unauthorized).not.toHaveBeenCalled();
});

it('aborta la señal en vuelo y descarta el cuerpo JSON cuando cambia la sesión', async () => {
  let capturedSignal: AbortSignal | null | undefined;
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          capturedSignal = init?.signal;
          finish = resolve;
        }),
    ),
  );
  const pending = privateFetch('/api/privado');
  expect(capturedSignal?.aborted).toBe(false);
  advanceSessionGeneration();
  expect(capturedSignal?.aborted).toBe(true);
  finish(new Response(JSON.stringify({ secreto: 'usuario-a' }), { status: 200 }));
  const response = await pending;
  await expect(response.json()).rejects.toThrow(/descartada por cambio de sesión/i);
});

it('notifica un 401 de la sesión vigente', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 401 })),
  );
  const unauthorized = vi.fn();
  setUnauthorizedHandler(unauthorized);
  await privateFetch('/api/privado');
  expect(unauthorized).toHaveBeenCalledOnce();
});
