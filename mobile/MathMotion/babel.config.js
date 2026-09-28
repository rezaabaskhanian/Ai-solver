module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must stay last in the plugins list -- react-native-reanimated's own
  // requirement, since it rewrites worklets after every other transform
  // has already run.
  plugins: ['react-native-reanimated/plugin'],
};
