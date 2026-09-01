export const GITHUB_BLOCKED = "BLOCKED/CONFIGURATION_REQUIRED";

export function githubOauthReady(clientId?: string | null, clientSecret?: string | null) {
  return Boolean(clientId?.trim() && clientSecret?.trim());
}
