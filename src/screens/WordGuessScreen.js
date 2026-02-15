import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  Vibration,
  View
} from 'react-native';
import { VocabularyManager } from '../utils/VocabularyManager';

const MAX_ATTEMPTS = 6;

export default function WordGuessScreen({ route, navigation }) {
  const { level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [currentWord, setCurrentWord] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState('playing');
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    loadNewWord();
  }, []);

  const loadNewWord = async () => {
    const word = VocabularyManager.getRandomWord(level);
    if (word) {
      setCurrentWord(word);
      setGuesses([]);
      setCurrentGuess('');
      setGameStatus('playing');
      setShowHint(false);
    }
  };

  const handleKeyPress = (key) => {
    if (gameStatus !== 'playing') return;

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'DEL') {
      setCurrentGuess(currentGuess.slice(0, -1));
    } else if (currentGuess.length < currentWord.word.length) {
      setCurrentGuess(currentGuess + key.toLowerCase());
    }
  };

  const submitGuess = async () => {
    if (currentGuess.length !== currentWord.word.length) {
      setShake(true);
      Vibration.vibrate(100);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const newGuesses = [...guesses, currentGuess];
    setGuesses(newGuesses);
    setCurrentGuess('');

    if (currentGuess === currentWord.word) {
      setGameStatus('won');
      setScore(score + 1);
      Vibration.vibrate([0, 100, 100, 100]);

      await VocabularyManager.markDiscovered(currentWord.id, level);

      const stats = await VocabularyManager.getGameStats('wordGuess');
      await VocabularyManager.updateGameStats('wordGuess', {
        correctAnswers: (stats.correctAnswers || 0) + 1,
        totalGuesses: (stats.totalGuesses || 0) + newGuesses.length,
        gamesPlayed: (stats.gamesPlayed || 0) + 1,
      });
    } else if (newGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus('lost');
      Vibration.vibrate(500);

      const stats = await VocabularyManager.getGameStats('wordGuess');
      await VocabularyManager.updateGameStats('wordGuess', {
        totalGuesses: (stats.totalGuesses || 0) + newGuesses.length,
        gamesPlayed: (stats.gamesPlayed || 0) + 1,
      });
    }
  };

  const getLetterStatus = (letter, index, guess) => {
    if (!currentWord) return 'empty';

    const targetWord = currentWord.word;
    if (targetWord[index] === letter) return 'correct';
    if (targetWord.includes(letter)) return 'present';
    return 'absent';
  };

  const renderRow = (guess, rowIndex) => {
    if (!currentWord) return null;

    const isCurrentRow = rowIndex === guesses.length && gameStatus === 'playing';
    const letters = guess ? guess.split('') : [];
    const wordLength = currentWord.word.length;

    return (
      <View key={rowIndex} style={[styles.row, shake && isCurrentRow && styles.shake]}>
        {Array.from({ length: wordLength }).map((_, i) => {
          const letter = letters[i] || (isCurrentRow ? currentGuess[i] : '');
          const status = guess ? getLetterStatus(letters[i], i, guess) : 'empty';

          return (
            <View
              key={i}
              style={[
                styles.tile,
                status === 'correct' && styles.tileCorrect,
                status === 'present' && styles.tilePresent,
                status === 'absent' && styles.tileAbsent,
                letter && !guess && styles.tileFilled,
              ]}
            >
              <Text style={[
                styles.tileLetter,
                (status !== 'empty' || letter) && styles.tileLetterFilled
              ]}>
                {letter?.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderKeyboard = () => {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
    ];

    const getKeyStatus = (key) => {
      if (key === 'ENTER' || key === 'DEL') return 'special';

      for (const guess of guesses) {
        const letters = guess.split('');
        for (let i = 0; i < letters.length; i++) {
          if (letters[i].toLowerCase() === key.toLowerCase()) {
            if (currentWord.word[i] === letters[i]) return 'correct';
            if (currentWord.word.includes(letters[i])) return 'present';
            return 'absent';
          }
        }
      }
      return 'unused';
    };

    return (
      <View style={styles.keyboard}>
        {rows.map((row, i) => (
          <View key={i} style={styles.keyboardRow}>
            {row.map(key => {
              const status = getKeyStatus(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.key,
                    (key === 'ENTER' || key === 'DEL') && styles.keyWide,
                    status === 'correct' && styles.keyCorrect,
                    status === 'present' && styles.keyPresent,
                    status === 'absent' && styles.keyAbsent,
                  ]}
                  onPress={() => handleKeyPress(key)}
                >
                  <Text style={[
                    styles.keyText,
                    status !== 'unused' && status !== 'special' && styles.keyTextLight
                  ]}>
                    {key === 'DEL' ? '⌫' : key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Level</Text>
          <Text style={styles.statValue}>{level}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Length</Text>
          <Text style={styles.statValue}>{currentWord.word.length}</Text>
        </View>
      </View>

      {/* Hint Section */}
      <View style={styles.hintCard}>
        <Text style={styles.hintLabel}>Definition:</Text>
        <Text style={styles.hintText}>{currentWord.definition}</Text>

        <TouchableOpacity
          onPress={() => setShowHint(!showHint)}
          style={styles.hintButton}
        >
          <Text style={styles.hintButtonText}>
            {showHint ? '🔼 Hide Hint' : '🔽 Show Hint'}
          </Text>
        </TouchableOpacity>

        {showHint && (
          <Text style={styles.hintText}>{currentWord.hint}</Text>
        )}
      </View>

      {/* Game Board */}
      <View style={styles.board}>
        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) =>
          renderRow(guesses[i], i)
        )}
      </View>

      {/* Game Status */}
      {gameStatus === 'won' && (
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>Correct!</Text>
          <Text style={styles.resultText}>
            You guessed "{currentWord.word}" in {guesses.length} attempts!
          </Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={loadNewWord}
          >
            <Text style={styles.nextButtonText}>Next Word</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameStatus === 'lost' && (
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>😔</Text>
          <Text style={styles.resultTitle}>Game Over</Text>
          <Text style={styles.resultText}>
            The word was: <Text style={styles.answerText}>{currentWord.word}</Text>
          </Text>
          <Text style={styles.definitionText}>{currentWord.definition}</Text>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={loadNewWord}
          >
            <Text style={styles.nextButtonText}>Try Another Word</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Keyboard */}
      {gameStatus === 'playing' && renderKeyboard()}

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
  },
  statLabel: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginTop: 4,
  },

  // Hint Card
  hintCard: {
    backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  hintLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#93c5fd' : '#1e40af',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: isDark ? '#e0e7ff' : '#1e3a8a',
    marginTop: 8,
  },
  hintButton: {
    marginTop: 8,
  },
  hintButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#c7d2fe' : '#3730a3',
  },

  // Board
  board: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shake: {
    // Add shake animation if needed
  },
  tile: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: isDark ? '#3f3f46' : '#d1d5db',
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    margin: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  tileFilled: {
    borderColor: isDark ? '#6b7280' : '#9ca3af',
    backgroundColor: isDark ? '#3f3f46' : '#f9fafb',
  },
  tileCorrect: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  tilePresent: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  tileAbsent: {
    backgroundColor: isDark ? '#52525b' : '#9ca3af',
    borderColor: isDark ? '#3f3f46' : '#6b7280',
  },
  tileLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#9ca3af' : '#d1d5db',
  },
  tileLetterFilled: {
    color: '#ffffff',
  },

  // Keyboard
  keyboard: {
    marginBottom: 16,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  key: {
    backgroundColor: isDark ? '#52525b' : '#d1d5db',
    padding: 12,
    margin: 2,
    borderRadius: 4,
    minWidth: 30,
    alignItems: 'center',
  },
  keyWide: {
    minWidth: 50,
  },
  keyCorrect: {
    backgroundColor: '#10b981',
  },
  keyPresent: {
    backgroundColor: '#f59e0b',
  },
  keyAbsent: {
    backgroundColor: isDark ? '#3f3f46' : '#9ca3af',
  },
  keyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  keyTextLight: {
    color: '#ffffff',
  },

  // Result Card
  resultCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#10b981' : '#059669',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 16,
    color: isDark ? '#d1d5db' : '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
  },
  answerText: {
    fontWeight: 'bold',
    color: isDark ? '#3b82f6' : '#2563eb',
    fontSize: 18,
  },
  definitionText: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});