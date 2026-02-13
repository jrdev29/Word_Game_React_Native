import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Vibration,
  Animated,
  Dimensions,
} from 'react-native';
import { VocabularyManager } from '../utils/vocabularyManager';
import { AdsterraBanner } from '../components/AdsterraAd';

const { width } = Dimensions.get('window');

export default function AnagramScreen({ route, navigation }) {
  const { level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentWord, setCurrentWord] = useState(null);
  const [scrambledLetters, setScrambledLetters] = useState([]);
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [correctLetters, setCorrectLetters] = useState([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [gamesPlayed, setGamesPlayed] = useState(0);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    loadNewWord();
  }, [level]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const loadNewWord = async () => {
    const word = VocabularyManager.getRandomWord(level);
    
    if (word && word.word.length >= 3) {
      setCurrentWord(word);
      setScrambledLetters(scrambleWord(word.word));
      setSelectedLetters([]);
      setCorrectLetters([]);
      setIsCorrect(false);
      setShowHint(false);
    }
  };

  const scrambleWord = (word) => {
    const letters = word.toUpperCase().split('').map((letter, index) => ({
      id: `${letter}-${index}-${Math.random()}`,
      letter,
      originalIndex: index,
    }));

    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    // Ensure it's actually scrambled (not same as original)
    let attempts = 0;
    while (letters.map(l => l.letter).join('') === word.toUpperCase() && attempts < 10) {
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      attempts++;
    }

    return letters;
  };

  const handleLetterPress = (letter) => {
    if (isCorrect) return;

    Vibration.vibrate(30);
    
    // Remove from scrambled, add to selected
    setScrambledLetters(scrambledLetters.filter(l => l.id !== letter.id));
    setSelectedLetters([...selectedLetters, letter]);

    // Check if word is complete
    if (selectedLetters.length + 1 === currentWord.word.length) {
      checkAnswer([...selectedLetters, letter]);
    }
  };

  const handleSelectedLetterPress = (letter, index) => {
    if (isCorrect) return;

    Vibration.vibrate(30);
    
    // Remove from selected, add back to scrambled
    const newSelected = selectedLetters.filter((_, i) => i !== index);
    setSelectedLetters(newSelected);
    setScrambledLetters([...scrambledLetters, letter]);
  };

  const checkAnswer = async (letters) => {
    const userAnswer = letters.map(l => l.letter).join('');
    const correctAnswer = currentWord.word.toUpperCase();

    if (userAnswer === correctAnswer) {
      // Correct!
      Vibration.vibrate([0, 50, 50, 100]);
      setIsCorrect(true);
      setCorrectLetters(letters);
      
      // Success animation
      Animated.sequence([
        Animated.timing(successAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(successAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Calculate score
      const baseScore = currentWord.word.length * 10;
      const timeBonus = Math.max(0, 60 - timer);
      const streakBonus = streak * 5;
      const hintPenalty = hintsUsed * 10;
      const totalScore = baseScore + timeBonus + streakBonus - hintPenalty;
      
      setScore(score + totalScore);
      setStreak(streak + 1);
      
      // Mark as discovered
      await VocabularyManager.markDiscovered(currentWord.id, level);
      
      // Update stats
      const stats = await VocabularyManager.getGameStats('anagram');
      await VocabularyManager.updateGameStats('anagram', {
        solved: (stats.solved || 0) + 1,
        totalScore: (stats.totalScore || 0) + totalScore,
        bestStreak: Math.max(stats.bestStreak || 0, streak + 1),
        gamesPlayed: (stats.gamesPlayed || 0) + 1,
      });
    } else {
      // Wrong - shake animation
      Vibration.vibrate(200);
      setStreak(0);
      
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  };

  const useHint = () => {
    if (showHint || isCorrect) return;
    
    setShowHint(true);
    setHintsUsed(hintsUsed + 1);
    Vibration.vibrate(50);
    
    // Auto-hide hint after 5 seconds
    setTimeout(() => {
      setShowHint(false);
    }, 5000);
  };

  const shuffleScrambled = () => {
    if (isCorrect) return;
    
    Vibration.vibrate(30);
    const shuffled = [...scrambledLetters];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setScrambledLetters(shuffled);
  };

  const clearSelected = () => {
    if (isCorrect) return;
    
    Vibration.vibrate(30);
    setScrambledLetters([...scrambledLetters, ...selectedLetters]);
    setSelectedLetters([]);
  };

  const nextWord = () => {
    setGamesPlayed(gamesPlayed + 1);
    setTimer(0);
    setHintsUsed(0);
    loadNewWord();
  };

  const skipWord = () => {
    setStreak(0);
    setGamesPlayed(gamesPlayed + 1);
    setTimer(0);
    setHintsUsed(0);
    loadNewWord();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(isDark);

  if (!currentWord) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>⏱ Time</Text>
          <Text style={styles.statValue}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>⭐ Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>🔥 Streak</Text>
          <Text style={styles.statValue}>{streak}</Text>
        </View>
      </View>

      {/* Word Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Level:</Text>
          <Text style={styles.infoValue}>{level}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Letters:</Text>
          <Text style={styles.infoValue}>{currentWord.word.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category:</Text>
          <Text style={styles.infoValue}>{currentWord.category}</Text>
        </View>
      </View>

      {/* Definition */}
      <View style={styles.definitionCard}>
        <Text style={styles.definitionLabel}>📖 Definition:</Text>
        <Text style={styles.definitionText}>{currentWord.definition}</Text>
        
        {showHint && (
          <View style={styles.hintBox}>
            <Text style={styles.hintLabel}>💡 Hint:</Text>
            <Text style={styles.hintText}>{currentWord.hint}</Text>
            <Text style={styles.hintExample}>Example: {currentWord.example}</Text>
          </View>
        )}
      </View>

      {/* Selected Letters (Answer Area) */}
      <View style={styles.answerSection}>
        <Text style={styles.sectionTitle}>Your Answer:</Text>
        <Animated.View 
          style={[
            styles.answerContainer,
            isCorrect && styles.answerContainerCorrect,
            { transform: [{ translateX: shakeAnim }, { scale: successAnim }] }
          ]}
        >
          {Array.from({ length: currentWord.word.length }).map((_, index) => {
            const letter = isCorrect ? correctLetters[index] : selectedLetters[index];
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerSlot,
                  letter && styles.answerSlotFilled,
                  isCorrect && styles.answerSlotCorrect,
                ]}
                onPress={() => letter && !isCorrect && handleSelectedLetterPress(letter, index)}
                disabled={isCorrect}
              >
                <Text style={[
                  styles.answerSlotText,
                  letter && styles.answerSlotTextFilled,
                  isCorrect && styles.answerSlotTextCorrect,
                ]}>
                  {letter ? letter.letter : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={clearSelected}
          disabled={isCorrect || selectedLetters.length === 0}
        >
          <Text style={styles.actionButtonText}>🗑 Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={shuffleScrambled}
          disabled={isCorrect}
        >
          <Text style={styles.actionButtonText}>🔀 Shuffle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={useHint}
          disabled={isCorrect || showHint}
        >
          <Text style={styles.actionButtonTextPrimary}>💡 Hint</Text>
        </TouchableOpacity>
      </View>

      {/* Scrambled Letters */}
      <View style={styles.lettersSection}>
        <Text style={styles.sectionTitle}>Available Letters:</Text>
        <View style={styles.lettersContainer}>
          {scrambledLetters.map((letter) => (
            <TouchableOpacity
              key={letter.id}
              style={styles.letterTile}
              onPress={() => handleLetterPress(letter)}
              disabled={isCorrect}
            >
              <Text style={styles.letterTileText}>{letter.letter}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Success Message */}
      {isCorrect && (
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Correct!</Text>
          <Text style={styles.successWord}>{currentWord.word}</Text>
          <Text style={styles.successDefinition}>{currentWord.definition}</Text>
          
          <View style={styles.successStats}>
            <View style={styles.successStat}>
              <Text style={styles.successStatLabel}>Time</Text>
              <Text style={styles.successStatValue}>{formatTime(timer)}</Text>
            </View>
            <View style={styles.successStat}>
              <Text style={styles.successStatLabel}>Hints</Text>
              <Text style={styles.successStatValue}>{hintsUsed}</Text>
            </View>
            <View style={styles.successStat}>
              <Text style={styles.successStatLabel}>Streak</Text>
              <Text style={styles.successStatValue}>{streak}</Text>
            </View>
          </View>

          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.successButton, styles.successButtonPrimary]}
              onPress={nextWord}
            >
              <Text style={styles.successButtonTextPrimary}>➡️ Next Word</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Skip Button */}
      {!isCorrect && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={skipWord}
        >
          <Text style={styles.skipButtonText}>⏭ Skip Word (Resets Streak)</Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      {gamesPlayed === 0 && !isCorrect && (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📖 How to Play:</Text>
          <Text style={styles.instructionText}>• Read the definition carefully</Text>
          <Text style={styles.instructionText}>• Tap letters to build the word</Text>
          <Text style={styles.instructionText}>• Tap selected letters to remove them</Text>
          <Text style={styles.instructionText}>• Use shuffle to rearrange letters</Text>
          <Text style={styles.instructionText}>• Build streaks for bonus points!</Text>
        </View>
      )}

      {/* Ad Banner */}
      <AdsterraBanner adKey="YOUR_BANNER_KEY_HERE" />
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginTop: 4,
  },

  // Info Card
  infoCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: isDark ? '#f3f4f6' : '#1f2937',
    fontWeight: 'bold',
  },

  // Definition
  definitionCard: {
    backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDark ? '#3b82f6' : '#2563eb',
  },
  definitionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#93c5fd' : '#1e40af',
    marginBottom: 8,
  },
  definitionText: {
    fontSize: 15,
    color: isDark ? '#bfdbfe' : '#1e3a8a',
    lineHeight: 22,
  },
  hintBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#3b82f6' : '#93c5fd',
  },
  hintLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: isDark ? '#fbbf24' : '#f59e0b',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: isDark ? '#bfdbfe' : '#1e3a8a',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  hintExample: {
    fontSize: 13,
    color: isDark ? '#93c5fd' : '#3730a3',
    fontStyle: 'italic',
  },

  // Answer Section
  answerSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  answerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    borderRadius: 12,
    minHeight: 70,
    elevation: 2,
  },
  answerContainerCorrect: {
    backgroundColor: isDark ? '#064e3b' : '#d1fae5',
  },
  answerSlot: {
    width: 50,
    height: 50,
    backgroundColor: isDark ? '#3f3f46' : '#f3f4f6',
    borderWidth: 2,
    borderColor: isDark ? '#52525b' : '#d1d5db',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  answerSlotFilled: {
    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
    borderColor: isDark ? '#2563eb' : '#1e40af',
    borderStyle: 'solid',
  },
  answerSlotCorrect: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  answerSlotText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#6b7280' : '#9ca3af',
  },
  answerSlotTextFilled: {
    color: '#ffffff',
  },
  answerSlotTextCorrect: {
    color: '#ffffff',
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  actionButtonSecondary: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  actionButtonPrimary: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  actionButtonTextPrimary: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Letters Section
  lettersSection: {
    marginBottom: 16,
  },
  lettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    borderRadius: 12,
    minHeight: 100,
    elevation: 2,
  },
  letterTile: {
    width: 50,
    height: 50,
    backgroundColor: isDark ? '#8b5cf6' : '#a855f7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  letterTileText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Success Card
  successCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  successEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  successWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#3b82f6' : '#2563eb',
    marginBottom: 8,
  },
  successDefinition: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  successStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  successStat: {
    alignItems: 'center',
  },
  successStatLabel: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 4,
  },
  successStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#3b82f6' : '#2563eb',
  },
  successButtons: {
    width: '100%',
  },
  successButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
  },
  successButtonPrimary: {
    backgroundColor: '#10b981',
  },
  successButtonTextPrimary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Skip Button
  skipButton: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: isDark ? '#3b82f6' : '#2563eb',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark ? '#93c5fd' : '#1e40af',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 13,
    color: isDark ? '#bfdbfe' : '#1e3a8a',
    marginBottom: 6,
    lineHeight: 18,
  },
});