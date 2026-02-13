import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import WordGuessScreen from './WordGuessScreen';
import WordSearchScreen from './WordSearchScreen';
import AnagramScreen from './AnagramScreen';
import { AdsterraInterstitial } from '../components/AdsterraAd';

export default function GameScreen({ route, navigation }) {
  const { gameId, gameName, level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [showInterstitial, setShowInterstitial] = useState(false);

  // Show interstitial ad when entering game
  React.useEffect(() => {
    // Show ad on game load (first time only per session)
    const shouldShowAd = Math.random() < 0.3; // 30% chance
    if (shouldShowAd) {
      setShowInterstitial(true);
    }
  }, [gameId]);

  const handleAdClose = () => {
    setShowInterstitial(false);
  };

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
        return <ComingSoonScreen gameName={gameName} navigation={navigation} />;
      
      case 'spellingBee':
        return <ComingSoonScreen gameName={gameName} navigation={navigation} />;
      
      default:
        return <ComingSoonScreen gameName={gameName} navigation={navigation} />;
    }
  };

  const styles = createStyles(isDark);

  return (
    <View style={styles.container}>
      {renderGame()}
      
      {/* Interstitial Ad (shown occasionally) */}
      {showInterstitial && (
        <AdsterraInterstitial
          adKey="YOUR_POPUNDER_KEY_HERE"
          onAdLoad={() => console.log('Interstitial loaded')}
          onAdClose={handleAdClose}
        />
      )}
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