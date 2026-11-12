let sessionGeneration = 0;
let onUnauthorized: (() => void) | undefined;
const activeControllers = new Set<AbortController>();

export function getSessionGeneration() {
  return sessionGeneration;
}

export function isSessionRequestCurrent(generation: number) {
  return generation === sessionGeneration;
}

export function advanceSessionGeneration() {
  sessionGeneration += 1;
  for (const controller of activeControllers) {
    controller.abort(new DOMException('Sesión reemplazada o cerrada.', 'AbortError'));
  }
  activeControllers.clear();
}

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

function createDiscardedResponse(status: number, headers: Headers): Response {
  const abortError = () =>
    Promise.reject(
      new DOMException('Respuesta privada descartada por cambio de sesión.', 'AbortError'),
    );
  return {
    ok: true,
    status,
    statusText: 'Discarded',
    headers,
    redirected: false,
    type: 'basic',
    url: '',
    body: null,
    bodyUsed: false,
    clone() {
      return createDiscardedResponse(status, headers);
    },
    json: abortError,
    text: abortError,
    blob: abortError,
    arrayBuffer: abortError,
    formData: abortError,
    bytes: abortError,
  } as Response;
}

export async function privateFetch(input: RequestInfo | URL, options?: RequestInit) {
  const generation = sessionGeneration;
  const controller = new AbortController();
  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  activeControllers.add(controller);
  try {
    const response = await fetch(input, { ...options, signal: controller.signal });
    if (!isSessionRequestCurrent(generation)) {
      return createDiscardedResponse(response.status, response.headers);
    }
    if (response.status === 401) onUnauthorized?.();
    return response;
  } finally {
    activeControllers.delete(controller);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}
