module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Reanimated 4 / worklets reach for native modules at import time; their
  // bundled resolver picks the JS-safe (non-.native) source files in Jest.
  resolver: require.resolve('react-native-reanimated/jest/resolver'),
  // The trailing "/" makes each name match a whole package, not a prefix:
  // "react-native" covers only RN itself, so every other react-native-*
  // package that ships ESM/TS (reanimated v4's mock, the drawer's
  // react-native-drawer-layout, worklets) must be listed by name or Jest
  // parses it untransformed and the importing suites fail to run.
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-screens|react-native-gesture-handler|react-native-safe-area-context|@react-native-async-storage|react-native-reanimated|react-native-worklets|react-native-drawer-layout)/)',
  ],
};
