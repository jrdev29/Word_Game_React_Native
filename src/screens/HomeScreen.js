import { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { VocabularyManager } from '../utils/vocabularyManager';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [progress, setProgress] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState('A1');

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const prog = await VocabularyManager.getProgress();
    setProgress(prog);
  };

  const games = [
    { id: 'wordGuess', name: 'Word Guess', icon: '🎯', color: '#10b981', active: true },
    { id: 'wordSearch', name: 'Word Search', icon: '🔍', color: '#8b5cf6', active: true },
    { id: 'anagram', name: 'Anagram', icon: '✨', color: '#ec4899', active: true },
    { id: 'wordPuzzle', name: 'Crossword', icon: '📝', color: '#f59e0b', active: true },
    { id: 'spellingBee', name: 'Spelling Bee', icon: '🐝', color: '#eab308', active: true },
  ];

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  const styles = createStyles(isDark);

  if (!progress) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Level Selector */}
      <View style={styles.levelContainer}>
        <Text style={styles.sectionTitle}>Select Level</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.levelRow}>
            {levels.map(level => {
              const total = VocabularyManager.getWordsByLevel(level).length;
              const discovered = progress.discoveredWords[level]?.length || 0;
              const isSelected = selectedLevel === level;

              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.levelButton,
                    isSelected && styles.levelButtonActive,
                  ]}
                  onPress={() => setSelectedLevel(level)}
                >
                  <Text style={[
                    styles.levelText,
                    isSelected && styles.levelTextActive,
                  ]}>
                    {level}
                  </Text>
                  <Text style={[
                    styles.levelSubtext,
                    isSelected && styles.levelSubtextActive,
                  ]}>
                    {discovered}/{total}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${total > 0 ? (discovered / total) * 100 : 0}%` }
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Progress Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Progress</Text>
        <Text style={styles.summaryValue}>
          {Object.values(progress.discoveredWords).flat().length} / {VocabularyManager.getTotalWords()}
        </Text>
        <Text style={styles.summarySubtext}>words discovered</Text>
      </View>

      {/* My Vocabulary Button */}
      <TouchableOpacity
        style={[styles.vocabCard, { backgroundColor: '#6366f1' }]}
        onPress={() => navigation.navigate('Vocabulary', { level: selectedLevel })}
      >
        <Text style={styles.vocabIcon}>📚</Text>
        <Text style={styles.vocabTitle}>My Vocabulary</Text>
        <Text style={styles.vocabSubtext}>View your discovered words</Text>
      </TouchableOpacity>

      {/* Games Grid */}
      <Text style={styles.sectionTitle}>Choose a Game</Text>
      <View style={styles.gamesGrid}>
        {games.map(game => (
          <TouchableOpacity
            key={game.id}
            style={[
              styles.gameCard,
              !game.active && styles.gameCardDisabled,
            ]}
            onPress={() => {
              if (game.active) {
                navigation.navigate('Game', {
                  gameId: game.id,
                  gameName: game.name,
                  level: selectedLevel,
                });
              }
            }}
            disabled={!game.active}
          >
            <Text style={styles.gameIcon}>{game.icon}</Text>
            <Text style={styles.gameName}>{game.name}</Text>
            {!game.active && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
            {game.active && (
              <View style={[styles.playBadge, { backgroundColor: game.color }]}>
                <Text style={styles.playText}>▶ Play</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
  },
  content: {
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: isDark ? '#d1d5db' : '#6b7280',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 12,
  },

  // Level Selector
  levelContainer: {
    marginBottom: 20,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  levelButton: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  levelButtonActive: {
    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
    borderColor: isDark ? '#3b82f6' : '#2563eb',
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  levelTextActive: {
    color: '#ffffff',
  },
  levelSubtext: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
  },
  levelSubtextActive: {
    color: '#e0e7ff',
  },
  progressBar: {
    width: '100%',
    height: 3,
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginVertical: 8,
  },
  summarySubtext: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },

  // Vocabulary Card
  vocabCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  vocabIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  vocabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  vocabSubtext: {
    fontSize: 14,
    color: '#e0e7ff',
  },

  // Games Grid
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gameCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    width: (width - 44) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  gameCardDisabled: {
    opacity: 0.5,
  },
  gameIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonBadge: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  playBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  playText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});