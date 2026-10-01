import { isARSupportedOnDevice } from '@reactvision/react-viro';

// Many phones sold in Iran have no ARCore (no Google Play Services for
// AR), and opening ViroARSceneNavigator there closes the app. Anything
// but a clear "supported" — a rejection, a missing native module, or no
// answer within the timeout — counts as unsupported, so the caller falls
// back to the plain Solution screen. Checked once per app run.
const CHECK_TIMEOUT_MS = 3000;

// Off for now: on a phone that reported ARCore as supported, opening
// ViroARSceneNavigator still closed the app right after a scan was solved
// (the solve itself succeeded — it was in History). A native crash can't
// be caught from JS, so scans go to the plain Solution screen until the
// Viro crash is understood from a device logcat. Flip back to true then.
const AR_SOLUTION_ENABLED = false;

let cached: Promise<boolean> | null = null;

export function isArSupported(): Promise<boolean> {
  if (!AR_SOLUTION_ENABLED) {
    return Promise.resolve(false);
  }
  if (!cached) {
    const check = isARSupportedOnDevice().then(
      response => response.isARSupported === true,
      () => false,
    );
    const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), CHECK_TIMEOUT_MS));
    cached = Promise.race([check, timeout]);
  }
  return cached;
}
