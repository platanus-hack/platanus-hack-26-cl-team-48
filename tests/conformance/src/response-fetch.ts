export type Responses = Readonly<
  Record<
    string,
    {
      readonly status?: number;
      readonly body: unknown;
    }
  >
>;

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

export function createResponseFetch(responses: Responses = {}) {
  return (url: string): Promise<Response> => {
    const response = Object.hasOwn(responses, url) ? responses[url] : undefined;
    return Promise.resolve(
      new Response(
        typeof response?.body === "string" ? response.body : JSON.stringify(response?.body),
        { status: response === undefined ? HTTP_NOT_FOUND : (response.status ?? HTTP_OK) },
      ),
    );
  };
}

export function parseResponses(value: unknown): Responses {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("Expected responses object in case file");
  return Object.fromEntries(
    Object.entries(value).map(([url, response]: [string, unknown]) => [
      url,
      parseResponse(response),
    ]),
  );
}

function parseResponse(value: unknown): Responses[string] {
  if (typeof value !== "object" || value === null || !("body" in value))
    throw new Error("Expected response body in case file");
  if (!("status" in value) || value.status === undefined) return { body: value.body };
  if (typeof value.status !== "number" || !Number.isInteger(value.status))
    throw new Error("Expected integer response status in case file");
  return { body: value.body, status: value.status };
}
