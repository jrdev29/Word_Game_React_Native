import { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useColorScheme,
    Vibration,
    View,
} from 'react-native';
import { VocabularyManager } from '../utils/VocabularyManager';

const { width } = Dimensions.get('window');

// Minimum word length for Spelling Bee
const MIN_WORD_LENGTH = 4;
const HONEYCOMB_SIZE = 7; // 1 center + 6 surrounding

export default function SpellingBeeScreen({ route, navigation }) {
    const { level } = route.params;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [centerLetter, setCenterLetter] = useState('');
    const [outerLetters, setOuterLetters] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [foundWords, setFoundWords] = useState([]);
    const [validWords, setValidWords] = useState([]);
    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info'); // 'success', 'error', 'info', 'pangram'
    const [gameStarted, setGameStarted] = useState(false);
    const [showFoundWords, setShowFoundWords] = useState(false);
    const [timer, setTimer] = useState(0);
    const [hintsUsed, setHintsUsed] = useState(0);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const messageAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        generatePuzzle();
    }, [level]);

    useEffect(() => {
        let interval;
        if (gameStarted && foundWords.length < validWords.length) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameStarted, foundWords.length, validWords.length]);

    const generatePuzzle = () => {
        // Get all words for this level
        const allWords = VocabularyManager.getWordsByLevel(level);

        // Filter words that are at least MIN_WORD_LENGTH characters and only contain letters
        const eligibleWords = allWords.filter(w =>
            w.word.length >= MIN_WORD_LENGTH && /^[a-zA-Z]+$/.test(w.word)
        );

        if (eligibleWords.length < 5) {
            setMessage('Not enough words for this level');
            return;
        }

        // Pick a "pangram" target word (a longer word with many unique letters)
        let pangramWord = null;
        const shuffled = [...eligibleWords].sort(() => Math.random() - 0.5);

        for (const word of shuffled) {
            const uniqueLetters = [...new Set(word.word.toLowerCase().split(''))];
            if (uniqueLetters.length >= 7) {
                pangramWord = word;
                break;
            }
        }

        // If no 7-unique-letter word, pick one with most unique letters
        if (!pangramWord) {
            const sorted = [...eligibleWords].sort((a, b) => {
                const uniqueA = new Set(a.word.toLowerCase().split('')).size;
                const uniqueB = new Set(b.word.toLowerCase().split('')).size;
                return uniqueB - uniqueA;
            });
            pangramWord = sorted[0];
        }

        const uniqueLetters = [...new Set(pangramWord.word.toLowerCase().split(''))];

        // Select 7 letters (or pad if needed)
        let selectedLetters;
        if (uniqueLetters.length >= 7) {
            // Shuffle and take 7
            const shuffledLetters = [...uniqueLetters].sort(() => Math.random() - 0.5);
            selectedLetters = shuffledLetters.slice(0, 7);
        } else {
            // Use all unique letters and pad with common consonants
            const padding = 'rstlnedcm'.split('').filter(l => !uniqueLetters.includes(l));
            selectedLetters = [...uniqueLetters];
            while (selectedLetters.length < 7 && padding.length > 0) {
                selectedLetters.push(padding.shift());
            }
        }

        // Center letter is the first one
        const center = selectedLetters[0];
        const outer = selectedLetters.slice(1);

        // Find all valid words from vocabulary that can be formed with these letters
        const letterSet = new Set(selectedLetters);
        const possibleWords = eligibleWords.filter(w => {
            const wordLetters = w.word.toLowerCase().split('');
            // Must contain center letter
            if (!wordLetters.includes(center)) return false;
            // All letters must be from our set
            return wordLetters.every(l => letterSet.has(l));
        });

        // Calculate max possible score
        let totalMaxScore = 0;
        for (const w of possibleWords) {
            totalMaxScore += calculateWordScore(w.word, selectedLetters);
        }

        setCenterLetter(center.toUpperCase());
        setOuterLetters(outer.map(l => l.toUpperCase()));
        setValidWords(possibleWords);
        setMaxScore(totalMaxScore);
        setFoundWords([]);
        setCurrentInput('');
        setScore(0);
        setTimer(0);
        setGameStarted(false);
        setHintsUsed(0);
        setMessage(`Find ${possibleWords.length} words using these letters!`);
        setMessageType('info');
    };

    const calculateWordScore = (word, allLetters) => {
        if (word.length === 4) return 1;
        let points = word.length;

        // Pangram bonus: uses all 7 letters
        const wordLetters = new Set(word.toLowerCase().split(''));
        if (allLetters && allLetters.every(l => wordLetters.has(l))) {
            points += 7; // Pangram bonus
        }

        return points;
    };

    const isPangram = (word) => {
        const wordLetters = new Set(word.toLowerCase().split(''));
        const allLetters = [centerLetter.toLowerCase(), ...outerLetters.map(l => l.toLowerCase())];
        return allLetters.every(l => wordLetters.has(l));
    };

    const handleLetterPress = (letter) => {
        if (!gameStarted) setGameStarted(true);

        Vibration.vibrate(20);
        setCurrentInput(currentInput + letter);
    };

    const handleDelete = () => {
        if (currentInput.length > 0) {
            Vibration.vibrate(20);
            setCurrentInput(currentInput.slice(0, -1));
        }
    };

    const handleShuffle = () => {
        Vibration.vibrate(30);
        const shuffled = [...outerLetters].sort(() => Math.random() - 0.5);
        setOuterLetters(shuffled);
    };

    const showMessage = (text, type = 'info') => {
        setMessage(text);
        setMessageType(type);

        // Animate message
        messageAnim.setValue(0);
        Animated.sequence([
            Animated.timing(messageAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.delay(1500),
            Animated.timing(messageAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubmit = async () => {
        if (currentInput.length < MIN_WORD_LENGTH) {
            showMessage('Too short (min 4 letters)', 'error');
            doShake();
            setCurrentInput('');
            return;
        }

        // Check if center letter is used
        if (!currentInput.includes(centerLetter)) {
            showMessage(`Must include center letter "${centerLetter}"`, 'error');
            doShake();
            setCurrentInput('');
            return;
        }

        // Check if already found
        if (foundWords.includes(currentInput.toLowerCase())) {
            showMessage('Already found!', 'error');
            doShake();
            setCurrentInput('');
            return;
        }

        // Check if it's a valid word
        const matchedWord = validWords.find(
            w => w.word.toLowerCase() === currentInput.toLowerCase()
        );

        if (matchedWord) {
            // Valid word found!
            const allLetters = [centerLetter.toLowerCase(), ...outerLetters.map(l => l.toLowerCase())];
            const wordScore = calculateWordScore(matchedWord.word, allLetters);
            const wordIsPangram = isPangram(matchedWord.word);

            setFoundWords([...foundWords, currentInput.toLowerCase()]);
            setScore(score + wordScore);

            if (wordIsPangram) {
                showMessage(`🎊 PANGRAM! +${wordScore} points!`, 'pangram');
                Vibration.vibrate([0, 100, 100, 100, 100, 200]);
            } else {
                const messages = ['Nice!', 'Great!', 'Awesome!', 'Well done!', '👍'];
                showMessage(`${messages[Math.floor(Math.random() * messages.length)]} +${wordScore}`, 'success');
                Vibration.vibrate([0, 50, 50, 100]);
            }

            // Success animation
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();

            // Mark as discovered
            await VocabularyManager.markDiscovered(matchedWord.id, level);

            // Check if all words found
            if (foundWords.length + 1 === validWords.length) {
                showMessage('🏆 Amazing! You found ALL words!', 'pangram');
                finishGame();
            }
        } else {
            showMessage('Not in word list', 'error');
            doShake();
        }

        setCurrentInput('');
    };

    const doShake = () => {
        Vibration.vibrate(100);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const useHint = () => {
        const remaining = validWords.filter(w => !foundWords.includes(w.word.toLowerCase()));
        if (remaining.length === 0) return;

        const randomWord = remaining[Math.floor(Math.random() * remaining.length)];
        const firstTwo = randomWord.word.substring(0, 2).toUpperCase();

        showMessage(`💡 Try a word starting with "${firstTwo}..."`, 'info');
        setHintsUsed(hintsUsed + 1);
        Vibration.vibrate(50);
    };

    const finishGame = async () => {
        const stats = await VocabularyManager.getGameStats('spellingBee');
        await VocabularyManager.updateGameStats('spellingBee', {
            correctWords: (stats.correctWords || 0) + foundWords.length + 1,
            totalWords: (stats.totalWords || 0) + validWords.length,
            gamesPlayed: (stats.gamesPlayed || 0) + 1,
            bestScore: Math.max(stats.bestScore || 0, score),
        });
    };

    const getRank = () => {
        if (maxScore === 0) return { name: 'Beginner', emoji: '🌱' };
        const pct = (score / maxScore) * 100;

        if (pct >= 100) return { name: 'Queen Bee', emoji: '👑' };
        if (pct >= 70) return { name: 'Genius', emoji: '🧠' };
        if (pct >= 50) return { name: 'Amazing', emoji: '⭐' };
        if (pct >= 40) return { name: 'Great', emoji: '🎯' };
        if (pct >= 25) return { name: 'Nice', emoji: '👍' };
        if (pct >= 15) return { name: 'Solid', emoji: '💪' };
        if (pct >= 5) return { name: 'Good Start', emoji: '🌟' };
        return { name: 'Beginner', emoji: '🌱' };
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const rank = getRank();
    const styles = createStyles(isDark);
    const hexSize = Math.min((width - 80) / 5, 60);

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
                    <Text style={styles.statLabel}>✓ Found</Text>
                    <Text style={styles.statValue}>{foundWords.length}/{validWords.length}</Text>
                </View>
            </View>

            {/* Rank Progress */}
            <View style={styles.rankCard}>
                <Text style={styles.rankEmoji}>{rank.emoji}</Text>
                <Text style={styles.rankName}>{rank.name}</Text>
                <View style={styles.rankProgressBar}>
                    <View
                        style={[
                            styles.rankProgressFill,
                            { width: `${maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0}%` }
                        ]}
                    />
                </View>
                <Text style={styles.rankProgressText}>
                    {maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}% of max score
                </Text>
            </View>

            {/* Message Banner */}
            {message ? (
                <Animated.View style={[
                    styles.messageBanner,
                    messageType === 'success' && styles.messageBannerSuccess,
                    messageType === 'error' && styles.messageBannerError,
                    messageType === 'pangram' && styles.messageBannerPangram,
                    {
                        opacity: messageAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.7, 1],
                        })
                    }
                ]}>
                    <Text style={[
                        styles.messageText,
                        messageType === 'pangram' && styles.messageTextPangram,
                    ]}>
                        {message}
                    </Text>
                </Animated.View>
            ) : null}

            {/* Current Input */}
            <Animated.View style={[
                styles.inputContainer,
                { transform: [{ translateX: shakeAnim }] }
            ]}>
                <Text style={styles.inputText}>
                    {currentInput.split('').map((letter, i) => (
                        <Text
                            key={i}
                            style={letter === centerLetter ? styles.inputLetterCenter : styles.inputLetter}
                        >
                            {letter}
                        </Text>
                    ))}
                    {currentInput.length === 0 && (
                        <Text style={styles.inputPlaceholder}>Type a word...</Text>
                    )}
                </Text>
            </Animated.View>

            {/* Honeycomb Layout */}
            <Animated.View style={[
                styles.honeycomb,
                { transform: [{ scale: scaleAnim }] }
            ]}>
                {/* Top Row: 2 hexagons */}
                <View style={styles.hexRow}>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[0])}
                    >
                        <Text style={styles.hexText}>{outerLetters[0]}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[1])}
                    >
                        <Text style={styles.hexText}>{outerLetters[1]}</Text>
                    </TouchableOpacity>
                </View>

                {/* Middle Row: 3 hexagons (with center) */}
                <View style={styles.hexRow}>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[2])}
                    >
                        <Text style={styles.hexText}>{outerLetters[2]}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexCenter]}
                        onPress={() => handleLetterPress(centerLetter)}
                    >
                        <Text style={styles.hexTextCenter}>{centerLetter}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[3])}
                    >
                        <Text style={styles.hexText}>{outerLetters[3]}</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Row: 2 hexagons */}
                <View style={styles.hexRow}>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[4])}
                    >
                        <Text style={styles.hexText}>{outerLetters[4]}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.hexButton, styles.hexOuter]}
                        onPress={() => handleLetterPress(outerLetters[5])}
                    >
                        <Text style={styles.hexText}>{outerLetters[5]}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                    <Text style={styles.actionButtonText}>⌫ Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={handleShuffle}>
                    <Text style={styles.actionButtonText}>🔀 Shuffle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonPrimary]}
                    onPress={handleSubmit}
                    disabled={currentInput.length < MIN_WORD_LENGTH}
                >
                    <Text style={styles.actionButtonTextPrimary}>✓ Enter</Text>
                </TouchableOpacity>
            </View>

            {/* Hint Button */}
            <TouchableOpacity
                style={styles.hintButton}
                onPress={useHint}
                disabled={foundWords.length === validWords.length}
            >
                <Text style={styles.hintButtonText}>💡 Get Hint ({hintsUsed} used)</Text>
            </TouchableOpacity>

            {/* Found Words Toggle */}
            <TouchableOpacity
                style={styles.foundWordsToggle}
                onPress={() => setShowFoundWords(!showFoundWords)}
            >
                <Text style={styles.foundWordsToggleText}>
                    {showFoundWords ? '🔼 Hide' : '🔽 Show'} Found Words ({foundWords.length})
                </Text>
            </TouchableOpacity>

            {/* Found Words List */}
            {showFoundWords && foundWords.length > 0 && (
                <View style={styles.foundWordsContainer}>
                    {foundWords.map((word, index) => {
                        const wordData = validWords.find(w => w.word.toLowerCase() === word);
                        const wordIsPangram = isPangram(word);

                        return (
                            <View key={index} style={[
                                styles.foundWordChip,
                                wordIsPangram && styles.foundWordChipPangram,
                            ]}>
                                <Text style={[
                                    styles.foundWordText,
                                    wordIsPangram && styles.foundWordTextPangram,
                                ]}>
                                    {wordIsPangram ? '🌟 ' : ''}{word}
                                </Text>
                                {wordData && (
                                    <Text style={styles.foundWordDef}>{wordData.definition}</Text>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}

            {/* All words found celebration */}
            {foundWords.length === validWords.length && validWords.length > 0 && (
                <View style={styles.celebrationCard}>
                    <Text style={styles.celebrationEmoji}>🏆</Text>
                    <Text style={styles.celebrationTitle}>Queen Bee!</Text>
                    <Text style={styles.celebrationText}>
                        You found all {validWords.length} words!
                    </Text>

                    <View style={styles.celebrationStats}>
                        <View style={styles.celebrationStat}>
                            <Text style={styles.celebrationStatLabel}>Score</Text>
                            <Text style={styles.celebrationStatValue}>{score}</Text>
                        </View>
                        <View style={styles.celebrationStat}>
                            <Text style={styles.celebrationStatLabel}>Time</Text>
                            <Text style={styles.celebrationStatValue}>{formatTime(timer)}</Text>
                        </View>
                        <View style={styles.celebrationStat}>
                            <Text style={styles.celebrationStatLabel}>Hints</Text>
                            <Text style={styles.celebrationStatValue}>{hintsUsed}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.playAgainButton}
                        onPress={generatePuzzle}
                    >
                        <Text style={styles.playAgainText}>🔄 New Puzzle</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Instructions */}
            {!gameStarted && (
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsTitle}>🐝 How to Play:</Text>
                    <Text style={styles.instructionText}>• Create words using the given letters</Text>
                    <Text style={styles.instructionText}>• Every word must include the center letter</Text>
                    <Text style={styles.instructionText}>• Words must be at least 4 letters long</Text>
                    <Text style={styles.instructionText}>• Letters can be reused in a word</Text>
                    <Text style={styles.instructionText}>• Use all 7 letters for a PANGRAM bonus! 🌟</Text>
                </View>
            )}
        </ScrollView>
    );
}

const createStyles = (isDark) => StyleSheet.create({
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

    // Rank
    rankCard: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
    },
    rankEmoji: {
        fontSize: 32,
        marginBottom: 4,
    },
    rankName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isDark ? '#eab308' : '#ca8a04',
        marginBottom: 8,
    },
    rankProgressBar: {
        width: '100%',
        height: 8,
        backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 6,
    },
    rankProgressFill: {
        height: '100%',
        backgroundColor: '#eab308',
        borderRadius: 4,
    },
    rankProgressText: {
        fontSize: 12,
        color: isDark ? '#9ca3af' : '#6b7280',
    },

    // Message
    messageBanner: {
        backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
        padding: 12,
        borderRadius: 10,
        marginBottom: 12,
        alignItems: 'center',
    },
    messageBannerSuccess: {
        backgroundColor: isDark ? '#064e3b' : '#d1fae5',
    },
    messageBannerError: {
        backgroundColor: isDark ? '#7f1d1d' : '#fecaca',
    },
    messageBannerPangram: {
        backgroundColor: '#eab308',
    },
    messageText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: isDark ? '#bfdbfe' : '#1e3a8a',
    },
    messageTextPangram: {
        color: '#ffffff',
    },

    // Input
    inputContainer: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        borderWidth: 2,
        borderColor: isDark ? '#3f3f46' : '#e5e7eb',
    },
    inputText: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 4,
        textAlign: 'center',
    },
    inputLetter: {
        color: isDark ? '#f3f4f6' : '#1f2937',
    },
    inputLetterCenter: {
        color: '#eab308',
    },
    inputPlaceholder: {
        color: isDark ? '#6b7280' : '#9ca3af',
        fontSize: 16,
        letterSpacing: 0,
    },

    // Honeycomb
    honeycomb: {
        alignItems: 'center',
        marginBottom: 20,
        paddingVertical: 8,
    },
    hexRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginVertical: -4,
    },
    hexButton: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        borderRadius: 32,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    hexOuter: {
        backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    },
    hexCenter: {
        backgroundColor: '#eab308',
        width: 72,
        height: 72,
        borderRadius: 36,
        elevation: 5,
    },
    hexText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: isDark ? '#f3f4f6' : '#1f2937',
    },
    hexTextCenter: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    // Actions
    actionBar: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
        elevation: 2,
    },
    actionButtonPrimary: {
        backgroundColor: '#eab308',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: isDark ? '#f3f4f6' : '#1f2937',
    },
    actionButtonTextPrimary: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    // Hint
    hintButton: {
        backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
    },
    hintButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: isDark ? '#93c5fd' : '#1e40af',
    },

    // Found Words
    foundWordsToggle: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12,
        elevation: 1,
    },
    foundWordsToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: isDark ? '#9ca3af' : '#6b7280',
    },
    foundWordsContainer: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        elevation: 2,
    },
    foundWordChip: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#3f3f46' : '#e5e7eb',
    },
    foundWordChipPangram: {
        backgroundColor: isDark ? '#422006' : '#fef3c7',
        borderRadius: 8,
        marginBottom: 4,
    },
    foundWordText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: isDark ? '#f3f4f6' : '#1f2937',
        textTransform: 'capitalize',
    },
    foundWordTextPangram: {
        color: '#eab308',
    },
    foundWordDef: {
        fontSize: 12,
        color: isDark ? '#9ca3af' : '#6b7280',
        marginTop: 4,
        fontStyle: 'italic',
    },

    // Celebration
    celebrationCard: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 4,
        borderWidth: 2,
        borderColor: '#eab308',
    },
    celebrationEmoji: {
        fontSize: 60,
        marginBottom: 12,
    },
    celebrationTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#eab308',
        marginBottom: 8,
    },
    celebrationText: {
        fontSize: 16,
        color: isDark ? '#d1d5db' : '#4b5563',
        textAlign: 'center',
        marginBottom: 16,
    },
    celebrationStats: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 20,
    },
    celebrationStat: {
        alignItems: 'center',
    },
    celebrationStatLabel: {
        fontSize: 12,
        color: isDark ? '#9ca3af' : '#6b7280',
        marginBottom: 4,
    },
    celebrationStatValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: isDark ? '#eab308' : '#ca8a04',
    },
    playAgainButton: {
        backgroundColor: '#eab308',
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
        backgroundColor: isDark ? '#422006' : '#fef3c7',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#eab308',
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: isDark ? '#fbbf24' : '#92400e',
        marginBottom: 10,
    },
    instructionText: {
        fontSize: 13,
        color: isDark ? '#fcd34d' : '#78350f',
        marginBottom: 6,
        lineHeight: 18,
    },
});
