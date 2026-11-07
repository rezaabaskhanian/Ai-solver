jest.mock('react-native-worklets', () => {
  const actual = jest.requireActual('react-native-worklets');
  return {
    ...actual,
    getUIRuntimeHolder: () => ({}),
  };
});

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

// @reactvision/react-viro needs native AR modules that don't exist in
// Jest; AR screens aren't exercised in tests, so every Viro* component
// renders its children inside a plain View and the manager objects are
// inert stubs. isARSupportedOnDevice reports "unsupported" so the app
// falls back to the plain Solution screen, as on a phone without ARCore.
jest.mock('@reactvision/react-viro', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  const stubComponent = name =>
    forwardRef(function StubViro(props, ref) {
      return createElement(View, { ref, testID: name }, props?.children);
    });
  return {
    __esModule: true,
    ViroARSceneNavigator: stubComponent('ViroARSceneNavigator'),
    ViroARScene: stubComponent('ViroARScene'),
    ViroARImageMarker: stubComponent('ViroARImageMarker'),
    ViroFlexView: stubComponent('ViroFlexView'),
    ViroText: stubComponent('ViroText'),
    ViroMaterials: { createMaterials: () => {} },
    ViroAnimations: { registerAnimations: () => {} },
    ViroARTrackingTargets: { createTargets: () => {} },
    isARSupportedOnDevice: () =>
      Promise.resolve({ isARSupported: false, reason: 'jest' }),
  };
});

// react-native-share reaches for its TurboModule at import time; sharing
// is never exercised in tests, so the default export is an inert stub
// whose open/share resolve like a completed share sheet.
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: () => Promise.resolve({ app: 'jest' }),
    share: () => Promise.resolve({ app: 'jest' }),
    shareSingle: () => Promise.resolve({ success: true }),
    isPackageInstalled: () => Promise.resolve({ isInstalled: false }),
  },
}));

// react-native-view-shot is used to capture screenshot of solution
jest.mock('react-native-view-shot', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef((props, ref) => createElement(View, { ref, testID: 'ViewShot', ...props })),
    captureRef: () => Promise.resolve('mock-uri'),
  };
});

// react-native-vision-camera reaches for native camera modules in Jest;
// camera screens are mocked with inert stubs.
jest.mock('react-native-vision-camera', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    Camera: forwardRef((props, ref) => createElement(View, { ref, testID: 'Camera', ...props })),
    useCameraDevice: () => ({ id: 'back', hasFlash: false }),
    useCameraPermission: () => ({ hasPermission: true, requestPermission: () => Promise.resolve(true) }),
    usePhotoOutput: () => ({}),
  };
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

// Icon fonts and the photo picker are native modules too; in tests an
// icon renders as its name and the picker reports "cancelled".
jest.mock('@react-native-vector-icons/material-icons/static', () => {
  const { createElement } = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    MaterialIcons: ({ name }) => createElement(Text, null, name),
  };
});

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

// lottie-react-native is a native view; in tests an animation renders as
// an empty View (components/common/Celebration.tsx).
jest.mock('lottie-react-native', () => {
  const { createElement, forwardRef } = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: forwardRef((props, ref) => createElement(View, { ref, testID: props.testID })),
  };
});
