import React from 'react';
import { render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Rect, Circle } from 'react-native-svg';
import App from '../../App';

import * as Components from '@/components';
import * as Constants from '@/constants';
import * as Store from '@/store';
import * as Types from '@/types';
import * as Utils from '@/utils';
import { add } from '@/utils/dummyMath';

describe('Milestone 1 Empirical Challenge & Stress Suite', () => {
  describe('1. TypeScript & Jest Path Alias Resolution (@/* -> ./src/*)', () => {
    it('successfully imports barrel files via @/* alias without module resolution errors', () => {
      expect(Components).toBeDefined();
      expect(Constants).toBeDefined();
      expect(Store).toBeDefined();
      expect(Types).toBeDefined();
      expect(Utils).toBeDefined();
    });

    it('resolves deep path alias imports (@/utils/dummyMath)', () => {
      expect(add(10, 25)).toBe(35);
    });
  });

  describe('2. AsyncStorage Mock Operational Integrity', () => {
    beforeEach(async () => {
      await AsyncStorage.clear();
    });

    it('handles setItem, getItem, and returns null for missing keys', async () => {
      const missing = await AsyncStorage.getItem('non_existent_key');
      expect(missing).toBeNull();

      await AsyncStorage.setItem('player_name', 'Lucia');
      const saved = await AsyncStorage.getItem('player_name');
      expect(saved).toBe('Lucia');
    });

    it('handles overwrite and removeItem', async () => {
      await AsyncStorage.setItem('stat_dinero', '50');
      await AsyncStorage.setItem('stat_dinero', '75');
      let val = await AsyncStorage.getItem('stat_dinero');
      expect(val).toBe('75');

      await AsyncStorage.removeItem('stat_dinero');
      val = await AsyncStorage.getItem('stat_dinero');
      expect(val).toBeNull();
    });

    it('handles multiSet, multiGet, getAllKeys, and multiRemove', async () => {
      const pairs: [string, string][] = [
        ['k1', 'v1'],
        ['k2', 'v2'],
        ['k3', 'v3'],
      ];
      await AsyncStorage.multiSet(pairs);

      const keys = await AsyncStorage.getAllKeys();
      expect(keys).toEqual(expect.arrayContaining(['k1', 'k2', 'k3']));

      const retrieved = await AsyncStorage.multiGet(['k1', 'k2', 'k_missing']);
      expect(retrieved).toEqual([
        ['k1', 'v1'],
        ['k2', 'v2'],
        ['k_missing', null],
      ]);

      await AsyncStorage.multiRemove(['k1', 'k3']);
      const remainingKeys = await AsyncStorage.getAllKeys();
      expect(remainingKeys).toEqual(['k2']);
    });

    it('handles large nested JSON payloads correctly', async () => {
      const gameState = {
        generation: 2,
        activePartner: 'partnerB',
        partnerA: { name: 'Lucia', isAlive: false, causeOfDeath: 'arrested' },
        partnerB: { name: 'Mateo', isAlive: true, causeOfDeath: null },
        stats: { dinero: 80, policia: 20, estres: 45, respeto: 90 },
        flags: { hotel_lavado: true, cartel_war: false },
        history: Array.from({ length: 50 }, (_, i) => ({ cardId: `card_${i}`, choice: 'left' })),
      };

      const serialized = JSON.stringify(gameState);
      await AsyncStorage.setItem('vice_shores_state', serialized);

      const raw = await AsyncStorage.getItem('vice_shores_state');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toEqual(gameState);
      expect(parsed.history).toHaveLength(50);
    });
  });

  describe('3. Reanimated Worklet & Animation Mocks', () => {
    it('has global __reanimatedWorkletInit initialized as a mock function', () => {
      const g = global as unknown as { __reanimatedWorkletInit?: (...args: unknown[]) => void };
      expect(g.__reanimatedWorkletInit).toBeDefined();
      expect(typeof g.__reanimatedWorkletInit).toBe('function');
      // Calling it should not throw
      expect(() => g.__reanimatedWorkletInit?.()).not.toThrow();
    });

    it('supports useSharedValue, withTiming, withSpring, runOnJS without crashing in component render', () => {
      const AnimatedTestComponent = () => {
        const offset = useSharedValue(0);
        const style = useAnimatedStyle(() => {
          return {
            transform: [{ translateX: offset.value }],
          };
        });

        // Trigger animation helper calls to ensure they do not throw in node env
        const trigger = () => {
          offset.value = withTiming(100, { duration: 300 });
          offset.value = withSpring(50);
          runOnJS(() => {})();
        };
        trigger();

        return <Animated.View testID="animated-box" style={style} />;
      };

      const { getByTestId } = render(<AnimatedTestComponent />);
      expect(getByTestId('animated-box')).toBeTruthy();
    });
  });

  describe('4. UI & Graphics Component Support', () => {
    it('renders root App component without errors', () => {
      const { getByText } = render(<App />);
      expect(getByText('VICE SHORES')).toBeTruthy();
      expect(getByText('Dual Protagonist Engine Initialized')).toBeTruthy();
    });

    it('renders React Native SVG primitives without crashing', () => {
      const SvgComponent = () => (
        <Svg width={100} height={100} testID="svg-root">
          <Rect x={0} y={0} width={50} height={50} fill="#FF007F" />
          <Circle cx={25} cy={25} r={20} fill="#00F0FF" />
        </Svg>
      );

      const { getByTestId } = render(<SvgComponent />);
      expect(getByTestId('svg-root')).toBeTruthy();
    });
  });
});
