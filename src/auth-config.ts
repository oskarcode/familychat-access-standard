/** A migration guard, not a supported authentication option.
 * Old deployments must not silently fall back from identity-provider login to password setup. */
export function hasRetiredAuthConfig(env: object): boolean {
  return ("ACCESS_ISSUER" in env && Boolean(env.ACCESS_ISSUER)) ||
    ("ACCESS_AUDIENCE" in env && Boolean(env.ACCESS_AUDIENCE)) ||
    ("AUTH_MODE" in env && Boolean(env.AUTH_MODE) && env.AUTH_MODE !== "app");
}
