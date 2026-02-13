import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  useColorScheme,
  Vibration,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { VocabularyManager } from '../utils/vocabularyManager';
import { AdsterraBanner } from '../components/AdsterraAd';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 9;
const WORD_COUNT = 6;

export default function CrosswordScreen({ route, navigation }) {
  const { level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [grid, setGrid] = useState([]);
  const [words, setWords] = useState([]);
  const [userGrid, setUserGrid] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [direction, setDirection] = useState('across');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [completedWords, setCompletedWords] = useState([]);
  const [timer, setTimer] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [showCluesModal, setShowCluesModal] = useState(false);
  const [errors, setErrors] = useState([]);

  const scrollViewRef = useRef(null);
  const successAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    generateCrossword();
  }, [level]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const generateCrossword = async () => {
    const randomWords = VocabularyManager.getRandomWords(level, WORD_COUNT);
    
    if (randomWords.length < 3) {
      return;
    }

    const sortedWords = randomWords.sort((a, b) => b.word.length - a.word.length);
    const newGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null)
    );

    const placements = [];
    let clueNumber = 1;

    // Place first word horizontally in center
    const firstWord = sortedWords[0].word.toUpperCase();
    const firstRow = Math.floor(GRID_SIZE / 2);
    const firstCol = Math.floor((GRID_SIZE - firstWord.length) / 2);
    
    for (let i = 0; i < firstWord.length; i++) {
      newGrid[firstRow][firstCol + i] = {
        letter: firstWord[i],
        clueNumber: i === 0 ? clueNumber : null,
      };
    }

    placements.push({
      word: sortedWords[0],
      start: { row: firstRow, col: firstCol },
      direction: 'across',
      clueNumber: clueNumber++,
      length: firstWord.length,
      cells: getCellsForWord(firstRow, firstCol, firstWord.length, 'across'),
    });

    // Try to place remaining words with intersections
    for (let i = 1; i < sortedWords.length; i++) {
      const word = sortedWords[i].word.toUpperCase();
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 150) {
        const existingPlacement = placements[Math.floor(Math.random() * placements.length)];
        const intersectionResult = findIntersection(word, existingPlacement, newGrid);

        if (intersectionResult) {
          const { row, col, dir } = intersectionResult;
          
          if (canPlaceWord(newGrid, word, row, col, dir)) {
            placeWordInGrid(newGrid, word, row, col, dir, clueNumber);
            
            placements.push({
              word: sortedWords[i],
              start: { row, col },
              direction: dir,
              clueNumber: clueNumber++,
              length: word.length,
              cells: getCellsForWord(row, col, word.length, dir),
            });
            placed = true;
          }
        }
        attempts++;
      }
    }

    const newUserGrid = Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill('')
    );

    setGrid(newGrid);
    setUserGrid(newUserGrid);
    setWords(placements);
    setCompletedWords([]);
    setSelectedCell(null);
    setSelectedWord(null);
    setHintsUsed(0);
    setScore(0);
    setErrors([]);
    setTimer(0);
  };

  const getCellsForWord = (row, col, length, direction) => {
    const cells = [];
    for (let i = 0; i < length; i++) {
      cells.push({
        row: direction === 'across' ? row : row + i,
        col: direction === 'across' ? col + i : col,
      });
    }
    return cells;
  };

  const findIntersection = (word, existingPlacement, grid) => {
    const existingWord = existingPlacement.word.word.toUpperCase();
    const existingDir = existingPlacement.direction;
    
    for (let i = 0; i < word.length; i++) {
      for (let j = 0; j < existingWord.length; j++) {
        if (word[i] === existingWord[j]) {
          const newDir = existingDir === 'across' ? 'down' : 'across';
          
          let row, col;
          if (existingDir === 'across') {
            row = existingPlacement.start.row - i;
            col = existingPlacement.start.col + j;
          } else {
            row = existingPlacement.start.row + j;
            col = existingPlacement.start.col - i;
          }

          if (newDir === 'across') {
            if (row >= 0 && row < GRID_SIZE && col >= 0 && col + word.length <= GRID_SIZE) {
              return { row, col, dir: newDir };
            }
          } else {
            if (col >= 0 && col < GRID_SIZE && row >= 0 && row + word.length <= GRID_SIZE) {
              return { row, col, dir: newDir };
            }
          }
        }
      }
    }
    return null;
  };

  const canPlaceWord = (grid, word, row, col, direction) => {
    // Check main placement
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;

      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return false;
      }

      const cell = grid[r][c];
      if (cell && cell.letter !== word[i]) {
        return false;
      }
    }

    // Check adjacent cells for isolation
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;

      if (direction === 'across') {
        // Check above and below
        if ((r > 0 && grid[r - 1][c] && !grid[r][c]) || 
            (r < GRID_SIZE - 1 && grid[r + 1][c] && !grid[r][c])) {
          return false;
        }
      } else {
        // Check left and right
        if ((c > 0 && grid[r][c - 1] && !grid[r][c]) || 
            (c < GRID_SIZE - 1 && grid[r][c + 1] && !grid[r][c])) {
          return false;
        }
      }
    }

    return true;
  };

  const placeWordInGrid = (grid, word, row, col, direction, clueNum) => {
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;

      if (!grid[r][c]) {
        grid[r][c] = {
          letter: word[i],
          clueNumber: i === 0 ? clueNum : null,
        };
      } else if (i === 0 && !grid[r][c].clueNumber) {
        grid[r][c].clueNumber = clueNum;
      }
    }
  };

  const handleCellPress = (row, col) => {
    const cell = grid[row][col];
    if (!cell) return;

    Vibration.vibrate(30);

    // Toggle direction if same cell selected
    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      const newDir = direction === 'across' ? 'down' : 'across';
      setDirection(newDir);
      
      // Find word in new direction
      const word = findWordAtCell(row, col, newDir);
      setSelectedWord(word);
    } else {
      setSelectedCell({ row, col });
      
      // Find word at this cell in current direction
      let word = findWordAtCell(row, col, direction);
      if (!word) {
        // Try other direction
        const otherDir = direction === 'across' ? 'down' : 'across';
        word = findWordAtCell(row, col, otherDir);
        if (word) {
          setDirection(otherDir);
        }
      }
      setSelectedWord(word);
    }

    setShowKeyboard(true);
  };

  const findWordAtCell = (row, col, dir) => {
    return words.find(w => {
      if (w.direction !== dir) return false;
      
      return w.cells.some(cell => cell.row === row && cell.col === col);
    });
  };

  const handleLetterInput = (letter) => {
    if (!selectedCell || !letter) return;

    const char = letter.toUpperCase();
    if (!/^[A-Z]$/.test(char)) return;

    const { row, col } = selectedCell;
    const newUserGrid = userGrid.map(r => [...r]);
    newUserGrid[row][col] = char;
    setUserGrid(newUserGrid);

    Vibration.vibrate(20);

    // Check if this letter is correct
    const correctLetter = grid[row][col]?.letter;
    if (char !== correctLetter) {
      // Mark as error
      const errorKey = `${row}-${col}`;
      if (!errors.includes(errorKey)) {
        setErrors([...errors, errorKey]);
        
        // Shake animation
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
      }
    } else {
      // Remove from errors if it was there
      setErrors(errors.filter(e => e !== `${row}-${col}`));
    }

    // Check word completion
    checkWordCompletion(newUserGrid);

    // Move to next cell
    moveToNextCell();
  };

  const moveToNextCell = () => {
    if (!selectedCell || !selectedWord) return;

    const currentIndex = selectedWord.cells.findIndex(
      c => c.row === selectedCell.row && c.col === selectedCell.col
    );

    if (currentIndex < selectedWord.cells.length - 1) {
      const nextCell = selectedWord.cells[currentIndex + 1];
      setSelectedCell(nextCell);
    }
  };

  const handleBackspace = () => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    
    if (userGrid[row][col]) {
      // Clear current cell
      const newUserGrid = userGrid.map(r => [...r]);
      newUserGrid[row][col] = '';
      setUserGrid(newUserGrid);
      
      // Remove from errors
      setErrors(errors.filter(e => e !== `${row}-${col}`));
    } else if (selectedWord) {
      // Move to previous cell
      const currentIndex = selectedWord.cells.findIndex(
        c => c.row === selectedCell.row && c.col === selectedCell.col
      );

      if (currentIndex > 0) {
        const prevCell = selectedWord.cells[currentIndex - 1];
        setSelectedCell(prevCell);
      }
    }

    Vibration.vibrate(20);
  };

  const checkWordCompletion = async (currentUserGrid) => {
    let newCompletedWords = [...completedWords];
    let newScore = score;

    for (const word of words) {
      if (completedWords.includes(word.clueNumber)) continue;

      let isComplete = true;
      for (const cell of word.cells) {
        const userChar = currentUserGrid[cell.row][cell.col];
        const correctChar = grid[cell.row][cell.col].letter;

        if (userChar !== correctChar) {
          isComplete = false;
          break;
        }
      }

      if (isComplete) {
        newCompletedWords.push(word.clueNumber);
        Vibration.vibrate([0, 50, 50, 100]);
        
        // Animate success
        Animated.sequence([
          Animated.timing(successAnim, {
            toValue: 1.15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(successAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();

        // Calculate score
        const wordScore = word.word.word.length * 15;
        const timeBonus = Math.max(0, 300 - timer);
        const hintPenalty = hintsUsed * 15;
        newScore += wordScore + Math.floor(timeBonus / 2) - hintPenalty;

        await VocabularyManager.markDiscovered(word.word.id, level);
      }
    }

    if (newCompletedWords.length > completedWords.length) {
      setCompletedWords(newCompletedWords);
      setScore(newScore);

      if (newCompletedWords.length === words.length) {
        finishGame(newScore);
      }
    }
  };

  const finishGame = async (finalScore) => {
    const stats = await VocabularyManager.getGameStats('wordPuzzle');
    await VocabularyManager.updateGameStats('wordPuzzle', {
      solved: (stats.solved || 0) + 1,
      totalScore: (stats.totalScore || 0) + finalScore,
      bestTime: Math.min(stats.bestTime || 999999, timer),
      gamesPlayed: (stats.gamesPlayed || 0) + 1,
    });
  };

  const revealLetter = () => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;
    const correctLetter = grid[row][col]?.letter;

    if (correctLetter && userGrid[row][col] !== correctLetter) {
      const newUserGrid = userGrid.map(r => [...r]);
      newUserGrid[row][col] = correctLetter;
      setUserGrid(newUserGrid);
      setHintsUsed(hintsUsed + 1);
      
      // Remove from errors
      setErrors(errors.filter(e => e !== `${row}-${col}`));
      
      Vibration.vibrate(50);
      checkWordCompletion(newUserGrid);
      moveToNextCell();
    }
  };

  const revealWord = () => {
    if (!selectedWord) return;

    const newUserGrid = userGrid.map(r => [...r]);
    
    selectedWord.cells.forEach(cell => {
      const correctLetter = grid[cell.row][cell.col]?.letter;
      newUserGrid[cell.row][cell.col] = correctLetter;
    });

    setUserGrid(newUserGrid);
    setHintsUsed(hintsUsed + selectedWord.length);
    
    // Clear errors for this word
    selectedWord.cells.forEach(cell => {
      setErrors(errors.filter(e => e !== `${cell.row}-${cell.col}`));
    });
    
    Vibration.vibrate([0, 50, 100]);
    checkWordCompletion(newUserGrid);
  };

  const checkAnswers = () => {
    const newErrors = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid[row][col] && userGrid[row][col]) {
          if (userGrid[row][col] !== grid[row][col].letter) {
            newErrors.push(`${row}-${col}`);
          }
        }
      }
    }
    
    setErrors(newErrors);
    Vibration.vibrate(100);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cellSize = Math.min((width - 40) / GRID_SIZE, 40);
  const styles = createStyles(isDark, cellSize);

  const acrossClues = words.filter(w => w.direction === 'across');
  const downClues = words.filter(w => w.direction === 'down');

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>⏱ Time</Text>
            <Text style={styles.statValue}>{formatTime(timer)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>✓ Words</Text>
            <Text style={styles.statValue}>{completedWords.length}/{words.length}</Text>
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
            onPress={() => setShowCluesModal(true)}
          >
            <Text style={styles.actionButtonText}>📖 Clues</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={revealLetter}
            disabled={!selectedCell}
          >
            <Text style={styles.actionButtonText}>💡 Letter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={revealWord}
            disabled={!selectedWord}
          >
            <Text style={styles.actionButtonText}>🔓 Word</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={checkAnswers}
          >
            <Text style={styles.actionButtonText}>✓ Check</Text>
          </TouchableOpacity>
        </View>

        {/* Selected Word Info */}
        {selectedWord && (
          <View style={styles.selectedWordInfo}>
            <Text style={styles.selectedWordLabel}>
              {selectedWord.clueNumber}. {selectedWord.direction === 'across' ? '➡️' : '⬇️'}
            </Text>
            <Text style={styles.selectedWordText}>
              {selectedWord.word.definition} ({selectedWord.word.word.length} letters)
            </Text>
          </View>
        )}

        {/* Crossword Grid */}
        <Animated.View style={[
          styles.gridContainer,
          { transform: [{ scale: successAnim }, { translateX: shakeAnim }] }
        ]}>
          {grid.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((cell, colIndex) => {
                const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                const isInSelectedWord = selectedWord?.cells.some(c => c.row === rowIndex && c.col === colIndex);
                const isError = errors.includes(`${rowIndex}-${colIndex}`);
                const isCorrect = cell && userGrid[rowIndex][colIndex] === cell.letter;
                const isFilled = cell && userGrid[rowIndex][colIndex];

                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.gridCell,
                      !cell && styles.gridCellBlocked,
                      isSelected && styles.gridCellSelected,
                      isInSelectedWord && !isSelected && styles.gridCellHighlighted,
                      isError && styles.gridCellError,
                      isCorrect && !isSelected && styles.gridCellCorrect,
                    ]}
                    onPress={() => cell && handleCellPress(rowIndex, colIndex)}
                    disabled={!cell}
                  >
                    {cell?.clueNumber && (
                      <Text style={styles.clueNumberText}>{cell.clueNumber}</Text>
                    )}
                    <Text style={[
                      styles.gridCellText,
                      isCorrect && styles.gridCellTextCorrect,
                      isError && styles.gridCellTextError,
                    ]}>
                      {userGrid[rowIndex][colIndex]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Animated.View>

        {/* Custom Keyboard */}
        {showKeyboard && (
          <View style={styles.keyboardContainer}>
            <View style={styles.keyboardRow}>
              {['Q','W','E','R','T','Y','U','I','O','P'].map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.keyButton}
                  onPress={() => handleLetterInput(letter)}
                >
                  <Text style={styles.keyButtonText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keyboardRow}>
              {['A','S','D','F','G','H','J','K','L'].map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.keyButton}
                  onPress={() => handleLetterInput(letter)}
                >
                  <Text style={styles.keyButtonText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keyboardRow}>
              <TouchableOpacity
                style={[styles.keyButton, styles.keyButtonWide]}
                onPress={handleBackspace}
              >
                <Text style={styles.keyButtonText}>⌫</Text>
              </TouchableOpacity>
              {['Z','X','C','V','B','N','M'].map(letter => (
                <TouchableOpacity
                  key={letter}
                  style={styles.keyButton}
                  onPress={() => handleLetterInput(letter)}
                >
                  <Text style={styles.keyButtonText}>{letter}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.keyButton, styles.keyButtonWide]}
                onPress={() => setShowKeyboard(false)}
              >
                <Text style={styles.keyButtonText}>✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Success */}
        {completedWords.length === words.length && words.length > 0 && (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Puzzle Complete!</Text>
            <Text style={styles.successText}>
              All {words.length} words solved!
            </Text>
            
            <View style={styles.successStats}>
              <View style={styles.successStat}>
                <Text style={styles.successStatLabel}>Time</Text>
                <Text style={styles.successStatValue}>{formatTime(timer)}</Text>
              </View>
              <View style={styles.successStat}>
                <Text style={styles.successStatLabel}>Score</Text>
                <Text style={styles.successStatValue}>{score}</Text>
              </View>
              <View style={styles.successStat}>
                <Text style={styles.successStatLabel}>Hints</Text>
                <Text style={styles.successStatValue}>{hintsUsed}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.playAgainButton}
              onPress={generateCrossword}
            >
              <Text style={styles.playAgainText}>🔄 New Puzzle</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        {timer < 15 && completedWords.length === 0 && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📖 How to Play:</Text>
            <Text style={styles.instructionText}>• Tap a cell to start typing</Text>
            <Text style={styles.instructionText}>• Use the on-screen keyboard to enter letters</Text>
            <Text style={styles.instructionText}>• Tap same cell to switch direction (→/↓)</Text>
            <Text style={styles.instructionText}>• Tap "Clues" to see all definitions</Text>
            <Text style={styles.instructionText}>• Use hints if stuck (costs points)</Text>
          </View>
        )}

        {/* Ad Banner */}
        <AdsterraBanner adKey="YOUR_BANNER_KEY_HERE" />
      </ScrollView>

      {/* Clues Modal */}
      <Modal
        visible={showCluesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCluesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crossword Clues</Text>
              <TouchableOpacity onPress={() => setShowCluesModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.cluesSection}>
                <Text style={styles.cluesTitle}>➡️ Across</Text>
                {acrossClues.map(word => (
                  <TouchableOpacity
                    key={word.clueNumber}
                    style={[
                      styles.clueItem,
                      completedWords.includes(word.clueNumber) && styles.clueItemCompleted,
                    ]}
                    onPress={() => {
                      setSelectedCell(word.start);
                      setSelectedWord(word);
                      setDirection('across');
                      setShowCluesModal(false);
                      setShowKeyboard(true);
                    }}
                  >
                    <Text style={styles.clueNumber}>{word.clueNumber}.</Text>
                    <Text style={[
                      styles.clueText,
                      completedWords.includes(word.clueNumber) && styles.clueTextCompleted,
                    ]}>
                      {word.word.definition} ({word.word.word.length})
                    </Text>
                    {completedWords.includes(word.clueNumber) && (
                      <Text style={styles.clueCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.cluesSection}>
                <Text style={styles.cluesTitle}>⬇️ Down</Text>
                {downClues.map(word => (
                  <TouchableOpacity
                    key={word.clueNumber}
                    style={[
                      styles.clueItem,
                      completedWords.includes(word.clueNumber) && styles.clueItemCompleted,
                    ]}
                    onPress={() => {
                      setSelectedCell(word.start);
                      setSelectedWord(word);
                      setDirection('down');
                      setShowCluesModal(false);
                      setShowKeyboard(true);
                    }}
                  >
                    <Text style={styles.clueNumber}>{word.clueNumber}.</Text>
                    <Text style={[
                      styles.clueText,
                      completedWords.includes(word.clueNumber) && styles.clueTextCompleted,
                    ]}>
                      {word.word.definition} ({word.word.word.length})
                    </Text>
                    {completedWords.includes(word.clueNumber) && (
                      <Text style={styles.clueCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (isDark, cellSize) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1a1a1a' : '#f3f4f6',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
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
    gap: 6,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Selected Word Info
  selectedWordInfo: {
    backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedWordLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#93c5fd' : '#1e40af',
    marginBottom: 4,
  },
  selectedWordText: {
    fontSize: 13,
    color: isDark ? '#bfdbfe' : '#1e3a8a',
  },

  // Grid
  gridContainer: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 4,
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
    backgroundColor: isDark ? '#f9fafb' : '#ffffff',
    borderWidth: 1,
    borderColor: isDark ? '#52525b' : '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridCellBlocked: {
    backgroundColor: isDark ? '#1a1a1a' : '#18181b',
  },
  gridCellSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  gridCellHighlighted: {
    backgroundColor: isDark ? '#bfdbfe' : '#dbeafe',
  },
  gridCellCorrect: {
    backgroundColor: isDark ? '#d1fae5' : '#a7f3d0',
  },
  gridCellError: {
    backgroundColor: '#fecaca',
    borderColor: '#dc2626',
  },
  gridCellText: {
    fontSize: cellSize * 0.5,
    fontWeight: 'bold',
    color: isDark ? '#1f2937' : '#1f2937',
  },
  gridCellTextCorrect: {
    color: '#059669',
  },
  gridCellTextError: {
    color: '#dc2626',
  },
  clueNumberText: {
    position: 'absolute',
    top: 1,
    left: 2,
    fontSize: cellSize * 0.22,
    fontWeight: 'bold',
    color: isDark ? '#6b7280' : '#6b7280',
  },

  // Keyboard
  keyboardContainer: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 8,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 4,
  },
  keyButton: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 6,
    minWidth: 30,
    alignItems: 'center',
  },
  keyButtonWide: {
    paddingHorizontal: 16,
  },
  keyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: isDark ? '#9ca3af' : '#6b7280',
    padding: 5,
  },
  modalScroll: {
    padding: 16,
  },

  // Clues
  cluesSection: {
    marginBottom: 20,
  },
  cluesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 12,
  },
  clueItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: isDark ? '#27272a' : '#f3f4f6',
  },
  clueItemCompleted: {
    backgroundColor: isDark ? '#064e3b' : '#d1fae5',
  },
  clueNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginRight: 8,
    minWidth: 25,
  },
  clueText: {
    flex: 1,
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#4b5563',
    lineHeight: 20,
  },
  clueTextCompleted: {
    color: '#059669',
    textDecorationLine: 'line-through',
  },
  clueCheck: {
    fontSize: 16,
    color: '#10b981',
    marginLeft: 8,
  },

  // Success
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
  successText: {
    fontSize: 16,
    color: isDark ? '#d1d5db' : '#4b5563',
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