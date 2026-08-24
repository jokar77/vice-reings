import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Unit Test Infrastructure Sanity', () => {
  it('should pass basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBe(true);
  });

  it('should properly mock AsyncStorage operations', async () => {
    await AsyncStorage.setItem('test_key', 'test_value');
    const value = await AsyncStorage.getItem('test_key');
    expect(value).toBe('test_value');
  });

  it('should have reanimated mock initialized', () => {
    expect((global as unknown as { __reanimatedWorkletInit?: unknown }).__reanimatedWorkletInit).toBeDefined();
  });
});
