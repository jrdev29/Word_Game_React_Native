import AsyncStorage from '@react-native-async-storage/async-storage';
import vocabularyData from '../data/vocabulary.json';
import paragraphsData from '../data/paragraphs.json';

const STORAGE_KEY = '@wordGameProgress';

const getDefaultProgress = () => ({
  discoveredWords: {
    A1: [],
    A2: [],
    B1: [],
    B2: [],
    C1: [],
    C2: []
  },
  gameStats: {
    typingSpeed: { highScore: 0, gamesPlayed: 0, totalWPM: 0, averageWPM: 0 },
    wordGuess: { correctAnswers: 0, totalGuesses: 0, gamesPlayed: 0 },
    wordSearch: { gamesWon: 0, totalTime: 0 },
    wordPuzzle: { solved: 0, attempts: 0 },
    spellingBee: { correctWords: 0, totalWords: 0 },
    anagram: { solved: 0, attempts: 0 }
  },
  achievements: [],
  lastPlayed: null
});

export const VocabularyManager = {
  
  // ==================== PROGRESS MANAGEMENT ====================
  
  async getProgress() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...getDefaultProgress(), ...parsed };
      }
    } catch (error) {
      console.error('Error loading progress:', error);
    }
    return getDefaultProgress();
  },
  
  async saveProgress(progress) {
    try {
      progress.lastPlayed = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      return false;
    }
  },
  
  async markDiscovered(wordId, level) {
    const progress = await this.getProgress();
    if (!progress.discoveredWords[level]) {
      progress.discoveredWords[level] = [];
    }
    if (!progress.discoveredWords[level].includes(wordId)) {
      progress.discoveredWords[level].push(wordId);
      await this.saveProgress(progress);
      return true;
    }
    return false;
  },
  
  async getDiscovered(level) {
    const progress = await this.getProgress();
    return progress.discoveredWords[level] || [];
  },
  
  // ==================== VOCABULARY OPERATIONS ====================
  
  getWordsByLevel(level) {
    return vocabularyData[level] || [];
  },
  
  getRandomWord(level, excludeIds = []) {
    const words = this.getWordsByLevel(level);
    const available = words.filter(w => !excludeIds.includes(w.id));
    
    if (available.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * available.length);
    return available[randomIndex];
  },
  
  getRandomWords(level, count, excludeIds = []) {
    const words = this.getWordsByLevel(level);
    const available = words.filter(w => !excludeIds.includes(w.id));
    
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },
  
  getWordById(wordId) {
    for (const level in vocabularyData) {
      const word = vocabularyData[level].find(w => w.id === wordId);
      if (word) return { ...word, level };
    }
    return null;
  },
  
  // ==================== PARAGRAPH OPERATIONS ====================
  
  getParagraphsByLevel(level) {
    return paragraphsData[level] || [];
  },
  
  getRandomParagraph(level) {
    const paragraphs = this.getParagraphsByLevel(level);
    if (paragraphs.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * paragraphs.length);
    return paragraphs[randomIndex];
  },
  
  // ==================== STATISTICS MANAGEMENT ====================
  
  async updateGameStats(gameName, stats) {
    const progress = await this.getProgress();
    if (!progress.gameStats[gameName]) {
      progress.gameStats[gameName] = {};
    }
    
    progress.gameStats[gameName] = {
      ...progress.gameStats[gameName],
      ...stats
    };
    
    await this.saveProgress(progress);
  },
  
  async getGameStats(gameName) {
    const progress = await this.getProgress();
    return progress.gameStats[gameName] || {};
  },
  
  async getTotalDiscovered() {
    const progress = await this.getProgress();
    let total = 0;
    for (const level in progress.discoveredWords) {
      total += progress.discoveredWords[level].length;
    }
    return total;
  },
  
  getTotalWords() {
    let total = 0;
    for (const level in vocabularyData) {
      total += vocabularyData[level].length;
    }
    return total;
  },
  
  async getLevelProgress(level) {
    const totalWords = this.getWordsByLevel(level).length;
    const discovered = await this.getDiscovered(level);
    return totalWords > 0 ? Math.round((discovered.length / totalWords) * 100) : 0;
  },
  
  async resetProgress() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error resetting progress:', error);
      return false;
    }
  },
};

export default VocabularyManager;