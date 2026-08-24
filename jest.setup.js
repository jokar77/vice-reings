jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Silence reanimated warning
global.__reanimatedWorkletInit = jest.fn();
