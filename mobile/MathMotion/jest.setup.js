import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

// react-native-reanimated's real implementation reaches for a native
// module that doesn't exist in Jest's environment (RootNavigator eagerly
// imports every screen, including Solution/Quiz's StepCard, so this mock
// is needed even for tests that never touch the Animation Engine
// directly) -- this is Software Mansion's own documented Jest setup.
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// @cafebazaar/react-native-poolakey constructs a NativeEventEmitter at
// import time, which throws immediately in Jest's environment (no
// native module is ever registered there). We never exercise real
// purchases in this smoke test, so a stub is enough.
jest.mock('@cafebazaar/react-native-poolakey', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
    purchaseProduct: jest.fn(),
    getPurchasedProducts: jest.fn(() => Promise.resolve([])),
    getInAppSkuDetails: jest.fn(() => Promise.resolve([])),
  },
  useBazaar: jest.fn(),
  DisconnectedError: class DisconnectedError extends Error {},
  ItemNotFoundError: class ItemNotFoundError extends Error {},
  BazaarNotFoundError: class BazaarNotFoundError extends Error {},
}));
