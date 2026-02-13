import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Vibration,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { VocabularyManager } from '../utils/vocabularyManager';
import { AdsterraBanner } from '../components/AdsterraAd';

const { width } = Dimensions.get('window');
const GRID_SIZE = 12;
const WORD_COUNT = 6;

export default function WordSearchScreen({ route, navigation }) {
  const { level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [grid, setGrid] = useState([]);
  const [words, setWords] = useState([]);
  const [wordPlacements, setWordPlacements] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [selectedCells, setSelectedCells] = useState([]);
  const [highlightedCells, setHighlightedCells] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showDefinitions, setShowDefinitions] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHintWord, setCurrentHintWord] = useState(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    generatePuzzle();
  }, [level]);

  useEffect(() => {
    let interval;
    if (gameStarted && foundWords.length < words.length) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, foundWords.length, words.length]);

  // Pulse animation for hints
  useEffect(() => {
    if (currentHintWord) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentHintWord]);

  const generatePuzzle = async () => {
    // Get random words for this level
    const randomWords = VocabularyManager.getRandomWords(level, WORD_COUNT);
    if (randomWords.length === 0) {
      Alert.alert('No Words', 'No words available for this level');
      return;
    }

    const wordList = randomWords.map(w => w.word.toUpperCase());
    
    // Create empty grid
    const newGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill('')
    );

    // All possible directions
    const directions = [
      { dx: 1, dy: 0, name: 'horizontal' },      // →
      { dx: 0, dy: 1, name: 'vertical' },        // ↓
      { dx: 1, dy: 1, name: 'diagonal-down' },   // ↘
      { dx: 1, dy: -1, name: 'diagonal-up' },    // ↗
      { dx: -1, dy: 0, name: 'horizontal-rev' }, // ←
      { dx: 0, dy: -1, name: 'vertical-rev' },   // ↑
      { dx: -1, dy: -1, name: 'diagonal-down-rev' }, // ↖
      { dx: -1, dy: 1, name: 'diagonal-up-rev' },    // ↙
    ];

    const placements = [];
    const usedPositions = new Set();

    // Sort words by length (longest first for better placement)
    const sortedWords = [...wordList].sort((a, b) => b.length - a.length);

    sortedWords.forEach(word => {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200;
      
      while (!placed && attempts < maxAttempts) {
        // Random direction
        const direction = directions[Math.floor(Math.random() * directions.length)];
        
        // Random starting position
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        
        if (canPlaceWord(newGrid, word, row, col, direction, usedPositions)) {
          const positions = placeWord(newGrid, word, row, col, direction, usedPositions);
          placements.push({
            word,
            start: { row, col },
            direction,
            positions
          });
          placed = true;
        }
        attempts++;
      }

      if (!placed) {
        console.warn(`Could not place word: ${word}`);
      }
    });

    // Fill empty cells with random letters (weighted towards vowels for realism)
    const letters = 'AABCDEEFGHIIJKLMNOOPQRSTUUVWXYZ';
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (newGrid[i][j] === '') {
          newGrid[i][j] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }

    setGrid(newGrid);
    setWords(randomWords);
    setWordPlacements(placements);
    setFoundWords([]);
    setSelectedCells([]);
    setHighlightedCells([]);
    setScore(0);
    setTimer(0);
    setGameStarted(false);
    setHintsUsed(0);
    setCurrentHintWord(null);
  };

  const canPlaceWord = (grid, word, row, col, direction, usedPositions) => {
    const endRow = row + direction.dy * (word.length - 1);
    const endCol = col + direction.dx * (word.length - 1);

    // Check bounds
    if (endRow < 0 || endRow >= GRID_SIZE || endCol < 0 || endCol >= GRID_SIZE) {
      return false;
    }

    // Check each position
    for (let i = 0; i < word.length; i++) {
      const r = row + direction.dy * i;
      const c = col + direction.dx * i;
      const posKey = `${r},${c}`;

      // Cell must be empty or match the letter
      if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
        return false;
      }

      // Avoid too much overlap
      if (usedPositions.has(posKey) && grid[r][c] !== word[i]) {
        return false;
      }
    }

    return true;
  };

  const placeWord = (grid, word, row, col, direction, usedPositions) => {
    const positions = [];
    
    for (let i = 0; i < word.length; i++) {
      const r = row + direction.dy * i;
      const c = col + direction.dx * i;
      grid[r][c] = word[i];
      
      const posKey = `${r},${c}`;
      usedPositions.add(posKey);
      positions.push({ row: r, col: c });
    }
    
    return positions;
  };

  const handleCellPress = (row, col) => {
    if (!gameStarted) {
      setGameStarted(true);
    }

    setIsSelecting(true);
    setSelectedCells([{ row, col }]);
  };

  const handleCellMove = (row, col) => {
    if (!isSelecting || selectedCells.length === 0) return;

    const firstCell = selectedCells[0];
    const lastCell = selectedCells[selectedCells.length - 1];

    // Determine if this forms a valid line from first cell
    const rowDiff = row - firstCell.row;
    const colDiff = col - firstCell.col;
    
    // Check if direction is consistent
    const isHorizontal = rowDiff === 0;
    const isVertical = colDiff === 0;
    const isDiagonal = Math.abs(rowDiff) === Math.abs(colDiff);

    if (!isHorizontal && !isVertical && !isDiagonal) {
      return; // Not a valid direction
    }

    // Build the path from first to current cell
    const newPath = buildPath(firstCell, { row, col });
    setSelectedCells(newPath);
  };

  const buildPath = (start, end) => {
    const path = [];
    const rowDiff = end.row - start.row;
    const colDiff = end.col - start.col;
    
    const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
    const rowStep = steps === 0 ? 0 : rowDiff / steps;
    const colStep = steps === 0 ? 0 : colDiff / steps;

    for (let i = 0; i <= steps; i++) {
      path.push({
        row: start.row + Math.round(rowStep * i),
        col: start.col + Math.round(colStep * i)
      });
    }

    return path;
  };

  const handleCellRelease = async () => {
    setIsSelecting(false);

    if (selectedCells.length < 2) {
      setSelectedCells([]);
      return;
    }

    const selectedWord = selectedCells
      .map(cell => grid[cell.row][cell.col])
      .join('');

    const selectedWordReverse = selectedWord.split('').reverse().join('');

    // Check if it matches any unfound word
    const matchedWord = words.find(w => {
      const wordUpper = w.word.toUpperCase();
      return (wordUpper === selectedWord || wordUpper === selectedWordReverse) && 
             !foundWords.includes(w.word);
    });

    if (matchedWord) {
      // Word found!
      Vibration.vibrate([0, 50, 50, 100]);
      
      const newFoundWords = [...foundWords, matchedWord.word];
      setFoundWords(newFoundWords);
      
      // Add permanent highlight
      setHighlightedCells([...highlightedCells, ...selectedCells]);
      
      // Calculate score (bonus for less time, bonus for no hints)
      const wordBonus = matchedWord.word.length * 10;
      const timeBonus = Math.max(0, 300 - timer);
      const hintPenalty = hintsUsed * 20;
      const totalScore = score + wordBonus + timeBonus - hintPenalty;
      setScore(Math.max(0, totalScore));
      
      // Mark as discovered
      await VocabularyManager.markDiscovered(matchedWord.id, level);
      
      // Clear hint if this was the hinted word
      if (currentHintWord === matchedWord.word) {
        setCurrentHintWord(null);
      }
      
      // Check if all words found
      if (newFoundWords.length === words.length) {
        setTimeout(() => finishGame(), 500);
      }
    } else {
      // Wrong selection - shake animation
      Vibration.vibrate(100);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }

    setSelectedCells([]);
  };

  const useHint = () => {
    const remainingWords = words.filter(w => !foundWords.includes(w.word));
    
    if (remainingWords.length === 0) return;

    const randomWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
    setCurrentHintWord(randomWord.word);
    setHintsUsed(hintsUsed + 1);
    
    Vibration.vibrate(50);

    // Auto-clear hint after 10 seconds
    setTimeout(() => {
      if (currentHintWord === randomWord.word) {
        setCurrentHintWord(null);
      }
    }, 10000);
  };

  const finishGame = async () => {
    const stats = await VocabularyManager.getGameStats('wordSearch');
    await VocabularyManager.updateGameStats('wordSearch', {
      gamesWon: (stats.gamesWon || 0) + 1,
      totalTime: (stats.totalTime || 0) + timer,
      gamesPlayed: (stats.gamesPlayed || 0) + 1,
      bestScore: Math.max(stats.bestScore || 0, score),
    });
  };

  const isCellSelected = (row, col) => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  const isCellHighlighted = (row, col) => {
    return highlightedCells.some(cell => cell.row === row && cell.col === col);
  };

  const isCellInHint = (row, col) => {
    if (!currentHintWord) return false;
    
    const placement = wordPlacements.find(p => p.word === currentHintWord.toUpperCase());
    if (!placement) return false;
    
    return placement.positions.some(pos => pos.row === row && pos.col === col);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cellSize = Math.min((width - 40) / GRID_SIZE, 35);
  const styles = createStyles(isDark, cellSize);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>⏱ Time</Text>
          <Text style={styles.statValue}>{formatTime(timer)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>✓ Found</Text>
          <Text style={styles.statValue}>{foundWords.length}/{words.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>⭐ Score</Text>
          <Text style={styles.statValue}>{score}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={useHint}
          disabled={foundWords.length === words.length}
        >
          <Text style={styles.actionButtonText}>💡 Hint ({hintsUsed})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowDefinitions(!showDefinitions)}
        >
          <Text style={styles.actionButtonText}>
            {showDefinitions ? '📖 Hide' : '📚 Show'} Definitions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Word List */}
      <View style={styles.wordListContainer}>
        <Text style={styles.wordListTitle}>🎯 Find these words:</Text>
        <View style={styles.wordList}>
          {words.map((word, index) => {
            const isFound = foundWords.includes(word.word);
            const isHinted = currentHintWord === word.word;
            
            return (
              <Animated.View
                key={word.id}
                style={[
                  styles.wordChipContainer,
                  isHinted && {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <View style={[
                  styles.wordChip,
                  isFound && styles.wordChipFound,
                  isHinted && styles.wordChipHinted,
                ]}>
                  <Text style={[
                    styles.wordChipText,
                    isFound && styles.wordChipTextFound,
                    isHinted && styles.wordChipTextHinted,
                  ]}>
                    {isFound ? '✓ ' : ''}{word.word}
                  </Text>
                </View>
                
                {showDefinitions && (
                  <Text style={styles.wordDefinition}>{word.definition}</Text>
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Grid */}
      <Animated.View 
        style={[
          styles.gridContainer,
          { transform: [{ translateX: shakeAnim }] }
        ]}
      >
        {grid.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.gridRow}>
            {row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const isHighlighted = isCellHighlighted(rowIndex, colIndex);
              const isHint = isCellInHint(rowIndex, colIndex);

              return (
                <TouchableOpacity
                  key={`${rowIndex}-${colIndex}`}
                  style={[
                    styles.gridCell,
                    isSelected && styles.gridCellSelected,
                    isHighlighted && styles.gridCellHighlighted,
                    isHint && styles.gridCellHint,
                  ]}
                  onPressIn={() => handleCellPress(rowIndex, colIndex)}
                  onPressOut={handleCellRelease}
                  onMoveShouldSetResponder={() => true}
                  onResponderMove={(e) => {
                    const { locationX, locationY } = e.nativeEvent;
                    const col = Math.floor(locationX / (cellSize + 2));
                    const row = Math.floor(locationY / (cellSize + 2));
                    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
                      handleCellMove(rowIndex + row - Math.floor(locationY / (cellSize + 2)), 
                                     colIndex + col - Math.floor(locationX / (cellSize + 2)));
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.gridCellText,
                    (isSelected || isHighlighted) && styles.gridCellTextSelected,
                    isHint && styles.gridCellTextHint,
                  ]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Game Over */}
      {foundWords.length === words.length && words.length > 0 && (
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>Congratulations!</Text>
          <Text style={styles.resultText}>
            You found all {words.length} words in {formatTime(timer)}!
          </Text>
          
          <View style={styles.resultStatsContainer}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>Final Score</Text>
              <Text style={styles.resultStatValue}>{score}</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>Time</Text>
              <Text style={styles.resultStatValue}>{formatTime(timer)}</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatLabel}>Hints Used</Text>
              <Text style={styles.resultStatValue}>{hintsUsed}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.playAgainButton}
            onPress={generatePuzzle}
          >
            <Text style={styles.playAgainText}>🔄 Play Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Instructions */}
      {!gameStarted && (
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📖 How to Play:</Text>
          <Text style={styles.instructionText}>• Tap and drag to select letters in any direction</Text>
          <Text style={styles.instructionText}>• Words can go →, ↓, ↘, ↗ (and reverse)</Text>
          <Text style={styles.instructionText}>• Use hints if you're stuck (costs points)</Text>
          <Text style={styles.instructionText}>• Find all words to win!</Text>
        </View>
      )}

      {/* Ad Banner */}
      <AdsterraBanner adKey="YOUR_BANNER_KEY_HERE" />
    </ScrollView>
  );
}

const createStyles = (isDark, cellSize) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
  },
  content: {
    padding: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statLabel: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginTop: 4,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Word List
  wordListContainer: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  wordListTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 10,
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChipContainer: {
    marginBottom: 4,
  },
  wordChip: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wordChipFound: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  wordChipHinted: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  wordChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  wordChipTextFound: {
    color: '#ffffff',
  },
  wordChipTextHinted: {
    color: '#ffffff',
  },
  wordDefinition: {
    fontSize: 11,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },

  // Grid
  gridContainer: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 6,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 12,
    elevation: 3,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    width: cellSize,
    height: cellSize,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#3f3f46' : '#f9fafb',
    margin: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: isDark ? '#52525b' : '#e5e7eb',
  },
  gridCellSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  gridCellHighlighted: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  gridCellHint: {
    backgroundColor: '#fbbf24',
    borderColor: '#f59e0b',
  },
  gridCellText: {
    fontSize: cellSize * 0.45,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  gridCellTextSelected: {
    color: '#ffffff',
  },
  gridCellTextHint: {
    color: '#ffffff',
  },

  // Results
  resultCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 4,
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
    marginBottom: 16,
  },
  resultStatsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  resultStat: {
    alignItems: 'center',
  },
  resultStatLabel: {
    fontSize: 12,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 4,
  },
  resultStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#3b82f6' : '#2563eb',
  },
  playAgainButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 2,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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