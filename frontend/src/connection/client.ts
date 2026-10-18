// Minimal GraphQL client: POST for queries/mutations, EventSource (graphql-yoga SSE) for
// subscriptions. /graphql is proxied to the backend by vite.config.ts.

const ENDPOINT = "/graphql";

export class GraphQLRequestError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string; extensions?: { code?: string } }[];
}

export async function request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as GraphQLResponse<T>;
  if (body.errors?.length) throw new GraphQLRequestError(body.errors[0].message, body.errors[0].extensions?.code);
  if (!body.data) throw new GraphQLRequestError(`Empty response (${res.status})`);
  return body.data;
}

/** Subscribe over SSE. Returns an unsubscribe function; EventSource reconnects on its own. */
export function subscribe<T>(
  query: string,
  variables: Record<string, unknown>,
  onData: (data: T) => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  const params = new URLSearchParams({ query, variables: JSON.stringify(variables) });
  const source = new EventSource(`${ENDPOINT}?${params}`);
  source.addEventListener("next", (e) => {
    const body = JSON.parse((e as MessageEvent<string>).data) as GraphQLResponse<T>;
    if (body.data) onData(body.data);
  });
  source.onopen = () => onStatus?.(true);
  source.onerror = () => onStatus?.(false);
  return () => source.close();
}
