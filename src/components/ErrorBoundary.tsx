import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>{this.state.error.message}</Text>
          <Pressable
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            accessibilityRole="button"
            accessibilityLabel="Restart the app"
          >
            <Text style={styles.btnText}>Restart</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#fafaf7',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  title: {
    fontSize: 20, fontWeight: '600', color: '#1a1a17', marginBottom: 10,
  },
  body: {
    fontSize: 13, color: '#75756d', textAlign: 'center', marginBottom: 28,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: '#1a1a17', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 100,
  },
  btnText: { color: '#fafaf7', fontSize: 14, fontWeight: '600' },
});
