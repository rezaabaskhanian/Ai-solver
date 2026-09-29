import { Platform } from 'react-native';

// The Go API's default port from backend/docker-compose.yml. Android's
// emulator can't reach the host machine via "localhost" (that resolves to
// the emulator itself), so it needs the special 10.0.2.2 alias; iOS
// simulators share the host's network namespace and can use localhost
// directly. A real device needs the host machine's LAN IP here instead.
const DEV_API_HOST = Platform.select({ android: '10.0.2.2', default: 'localhost' });

// Release builds talk to production (backend/docker-compose.prod.yaml,
// behind Arvan + Traefik); debug builds keep hitting the local go-api.
const PROD_API_BASE_URL = 'https://api.mathmotion.ir';

// Flip to true to point a debug build (Metro, emulator) at production
// instead of a local go-api -- e.g. to test Scan end-to-end without
// running the backend locally. Keep false in commits.
const USE_PROD_API_IN_DEV = true;

export const API_BASE_URL =
  __DEV__ && !USE_PROD_API_IN_DEV ? `http://${DEV_API_HOST}:8080` : PROD_API_BASE_URL;

export const REQUEST_TIMEOUT_MS = 15000;

// Must match the Cafe Bazaar product created in Pishkhan (the developer
// panel) and the Go API's BAZAAR_PRODUCT_ID (defaults the same way in
// backend/go-api/cmd/api/main.go) — see mobile/MathMotion/APP.md.
export const PREMIUM_PRODUCT_ID = 'mathmotion_premium_unlock';
