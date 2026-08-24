import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VICE SHORES</Text>
      <Text style={styles.subtitle}>Dual Protagonist Engine Initialized</Text>
      <StatusBar style="light" hidden={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF007F',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    color: '#00F0FF',
    marginTop: 8,
  },
});
