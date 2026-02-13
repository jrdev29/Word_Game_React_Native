import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { VocabularyManager } from '../utils/vocabularyManager';

export default function VocabularyScreen({ route }) {
  const { level } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [discovered, setDiscovered] = useState([]);
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVocabulary();
  }, [level]);

  const loadVocabulary = async () => {
    setLoading(true);
    const words = VocabularyManager.getWordsByLevel(level);
    const discoveredIds = await VocabularyManager.getDiscovered(level);
    const discoveredWords = words.filter(w => discoveredIds.includes(w.id));

    setAllWords(words);
    setDiscovered(discoveredWords);
    setLoading(false);
  };

  // Get unique categories
  const categories = ['all', ...new Set(discovered.map(w => w.category).filter(Boolean))];

  // Filter words
  const filteredWords = discovered.filter(word => {
    const matchesSearch =
      word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.definition.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === 'all' || word.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const progress = allWords.length > 0
    ? Math.round((discovered.length / allWords.length) * 100)
    : 0;

  const styles = createStyles(isDark);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading vocabulary...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My {level} Vocabulary</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]}>
              {progress > 10 && (
                <Text style={styles.progressText}>{progress}%</Text>
              )}
            </View>
          </View>
          <Text style={styles.progressLabel}>
            {discovered.length} / {allWords.length} words discovered
          </Text>
        </View>
      </View>

      {discovered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>No words discovered yet</Text>
          <Text style={styles.emptyText}>
            Start playing games to unlock vocabulary!
          </Text>
        </View>
      ) : (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search words..."
              placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterButton,
                  filterCategory === cat && styles.filterButtonActive,
                ]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterCategory === cat && styles.filterButtonTextActive,
                ]}>
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Word Count */}
          <Text style={styles.wordCount}>
            Showing {filteredWords.length} {filteredWords.length === 1 ? 'word' : 'words'}
          </Text>

          {/* Word Cards */}
          {filteredWords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No words match your search</Text>
            </View>
          ) : (
            <View style={styles.wordsContainer}>
              {filteredWords.map((word, index) => (
                <View key={word.id} style={styles.wordCard}>
                  <View style={styles.wordHeader}>
                    <Text style={styles.wordText}>{word.word}</Text>
                    {word.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {word.category}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.definitionText}>
                    {word.definition}
                  </Text>

                  {word.example && (
                    <View style={styles.exampleContainer}>
                      <Text style={styles.exampleText}>"{word.example}"</Text>
                    </View>
                  )}

                  {word.hint && (
                    <View style={styles.hintContainer}>
                      <Text style={styles.hintLabel}>Hint:</Text>
                      <Text style={styles.hintText}>{word.hint}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}

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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 16,
  },

  // Progress
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 24,
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  progressText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },

  // Search
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    borderWidth: 2,
    borderColor: isDark ? '#3f3f46' : '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: isDark ? '#f3f4f6' : '#1f2937',
  },

  // Filter
  filterContainer: {
    marginBottom: 12,
    maxHeight: 50,
  },
  filterButton: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#f3f4f6' : '#1f2937',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },

  // Word Count
  wordCount: {
    fontSize: 14,
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 16,
  },

  // Words Container
  wordsContainer: {
    marginBottom: 16,
  },
  wordCard: {
    backgroundColor: isDark ? '#27272a' : '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: isDark ? '#3b82f6' : '#2563eb',
  },
  categoryBadge: {
    backgroundColor: isDark ? '#3f3f46' : '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#6b7280',
    textTransform: 'uppercase',
  },

  // Definition
  definitionText: {
    fontSize: 16,
    color: isDark ? '#d1d5db' : '#4b5563',
    marginBottom: 12,
    lineHeight: 24,
  },

  // Example
  exampleContainer: {
    backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: isDark ? '#3b82f6' : '#2563eb',
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: isDark ? '#bfdbfe' : '#1e3a8a',
    lineHeight: 20,
  },

  // Hint
  hintContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#3f3f46' : '#e5e7eb',
  },
  hintLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: isDark ? '#9ca3af' : '#6b7280',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: isDark ? '#d1d5db' : '#4b5563',
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: isDark ? '#f3f4f6' : '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: isDark ? '#9ca3af' : '#6b7280',
    textAlign: 'center',
  },
});