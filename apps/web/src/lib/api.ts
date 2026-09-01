export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { message?: string; code?: string },
  ) {
    super(body.message ?? "Pedido recusado.");
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body != null && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }
  return body as T;
}

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
};
