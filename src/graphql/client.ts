const ENDPOINT =
  'https://www.theinfatuation.com/direct/api/post-search/public/graphql';

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Origin: 'https://www.theinfatuation.com',
  Referer: 'https://www.theinfatuation.com/',
  'User-Agent': 'Mozilla/5.0 (compatible; infatuation-mcp)',
};

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>,
  { timeoutMs = 10_000 }: { timeoutMs?: number } = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: BASE_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    if (isTimeout) {
      throw new Error(`The Infatuation API timed out after ${timeoutMs}ms`);
    }
    throw new Error(`The Infatuation API is unreachable: ${String(err)}`);
  }

  if (!response.ok) {
    throw new Error(
      `The Infatuation API returned HTTP ${response.status} ${response.statusText}`
    );
  }

  let body: GraphQLResponse<T>;
  try {
    body = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error('The Infatuation API returned a non-JSON response');
  }

  if (body.errors?.length) {
    throw new Error(
      `GraphQL errors: ${body.errors.map(e => e.message).join('; ')}`
    );
  }

  if (!body.data) {
    throw new Error('Unexpected API response shape: missing data field');
  }

  return body.data;
}
