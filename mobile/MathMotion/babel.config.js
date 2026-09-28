module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Must stay last in the plugins list -- Reanimated 4 moved its worklet
  // transform into react-native-worklets, and it rewrites worklets after
  // every other transform has already run.
  plugins: ['react-native-worklets/plugin'],
};
