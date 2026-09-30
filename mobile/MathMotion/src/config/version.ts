import { version } from '../../package.json';

// The app version has one source: "version" in package.json. The
// Android build reads it too (android/app/build.gradle → versionName,
// and versionCode = major*10000 + minor*100 + patch), so a release is
// bumped there only — e.g. 1.0.0 → 1.0.1 for a Cafe Bazaar update.
export const APP_VERSION: string = version;
