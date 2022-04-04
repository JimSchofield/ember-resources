import { trackedFunction } from './tracked-function';

type DataHandler<Response, T> = (data: Response) => T;

let abortController: AbortController;

export function useFetch<Response, T>(ctx: object, urlThunk: () => string): { value: Response } | T;
export function useFetch<Response, T>(
  ctx: object,
  urlThunk: () => string,
  fetchConfig: RequestInit
): { value: Response } | T;
export function useFetch<Response, T>(
  ctx: object,
  urlThunk: () => string,
  dataHandler: DataHandler<Response, T>
): { value: Response } | T;
export function useFetch<Response, T>(
  ctx: object,
  urlThunk: () => string,
  fetchConfig: RequestInit,
  dataHandler: DataHandler<Response, T>
): { value: Response } | T;

export function useFetch<Response, T>(
  ctx: object,
  urlThunk: () => string,
  fetchConfig?: RequestInit,
  dataHandler?: (data: Response) => T
): { value: Response | T } {
  return trackedFunction(ctx, async () => {
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();

    const { signal } = abortController;

    const result = await fetch(urlThunk(), {
      ...(fetchConfig ? { ...fetchConfig } : {}),
      signal,
    });

    const data = (await result.json()) as Response;

    if (dataHandler) {
      return dataHandler(data);
    }

    return data;
  });
}
