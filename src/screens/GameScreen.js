import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import AnagramScreen from './AnagramScreen';
import CrosswordScreen from './CrosswordScreen';
import SpellingBeeScreen from './SpellingBeeScreen';
import WordGuessScreen from './WordGuessScreen';
import WordSearchScreen from './WordSearchScreen';

export default function GameScreen({ route, navigation }) {
  const { gameId, gameName, level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Render appropriate game based on gameId
  const renderGame = () => {
    switch (gameId) {
      case 'wordGuess':
        return <WordGuessScreen route={route} navigation={navigation} />;

      case 'wordSearch':
        return <WordSearchScreen route={route} navigation={navigation} />;

      case 'anagram':
        return <AnagramScreen route={route} navigation={navigation} />;

      case 'wordPuzzle':
        return <CrosswordScreen route={route} navigation={navigation} />;

      case 'spellingBee':
        return <SpellingBeeScreen route={route} navigation={navigation} />;

      default:
        return <ComingSoonScreen gameName={gameName} navigation={navigation} />;
    }
  };

  const styles = createStyles(isDark);

  return (
    <View style={styles.container}>
      {renderGame()}
    </View>
  );
}

// Coming Soon Screen for games not yet implemented
function ComingSoonScreen({ gameName, navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = createStyles(isDark);

  return (
    <View style={[styles.container, styles.centered]}>
      <View style={styles.comingSoonCard}>
        <Text style={styles.comingSoonEmoji}>🚧</Text>
        <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
        <Text style={styles.comingSoonText}>
          {gameName} is under development and will be available soon.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Coming Soon
  comingSoonCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  comingSoonEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});