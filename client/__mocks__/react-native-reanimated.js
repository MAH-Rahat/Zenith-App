/**
 * Mock for react-native-reanimated
 */

const React = require('react');
const { View, Text } = require('react-native');

const Reanimated = {
  default: {
    call: () => {},
    View,
    Text,
  },
  View,
  Text,
  useSharedValue: (initialValue) => ({ value: initialValue }),
  useAnimatedStyle: (callback) => callback(),
  withTiming: (value) => value,
  withSpring: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  Easing: {
    out: (fn) => fn,
    cubic: () => {},
  },
};

module.exports = Reanimated;
