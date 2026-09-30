import { isARSupportedOnDevice } from '@reactvision/react-viro';

// Many phones sold in Iran have no ARCore (no Google Play Services for
// AR), and opening ViroARSceneNavigator there closes the app. Anything
// but a clear "supported" — a rejection, a missing native module, or no
// answer within the timeout — counts as unsupported, so the caller falls
// back to the plain Solution screen. Checked once per app run.
const CHECK_TIMEOUT_MS = 3000;

let cached: Promise<boolean> | null = null;

export function isArSupported(): Promise<boolean> {
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
