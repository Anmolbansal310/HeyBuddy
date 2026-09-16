import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import { Capture } from '../App';

type Props = {
  captures: Capture[];
  onEditCapture: (id: string, text: string) => void;
  onDeleteCapture: (id: string) => void;
};

type ViewMode = 'all' | 'categories';

const TILE_COLORS = [
  '#fef3e2',
  '#e8f4fd',
  '#f0fdf4',
  '#fdf0f0',
  '#f5f0ff',
  '#fff7ed',
  '#f0fffe',
  '#fdf4ff',
];

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${time}`;
}

export default function NotesScreen({ captures, onEditCapture, onDeleteCapture }: Props) {
  const [view, setView] = useState<ViewMode>('all');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [editText, setEditText] = useState('');

  const fuse = useMemo(() => new Fuse(captures, {
    keys: [
      { name: 'text', weight: 2 },
      { name: 'categories.name', weight: 1.5 },
      { name: 'category', weight: 1.5 },
      { name: 'topics', weight: 1.5 },
      { name: 'entities', weight: 1.5 },
      { name: 'tags', weight: 1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  }), [captures]);

  const allResults = useMemo(() => {
    if (!query.trim()) return captures;
    return fuse.search(query).map(r => r.item);
  }, [query, captures, fuse]);

  const allCategories = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; count: number }>();
    for (const capture of captures) {
      if (capture.categories) {
        for (const cat of capture.categories) {
          const existing = map.get(cat.name);
          if (existing) {
            existing.count++;
          } else {
            map.set(cat.name, { name: cat.name, icon: cat.icon, count: 1 });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [captures]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return allCategories;
    const q = query.toLowerCase();
    return allCategories.filter(c => c.name.toLowerCase().includes(q));
  }, [query, allCategories]);

  const categoryNotes = useMemo(() => {
    if (!selectedCategory) return [];
    const notes = captures.filter(c =>
      c.categories?.some(cat => cat.name === selectedCategory)
    );
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(n => n.text.toLowerCase().includes(q));
  }, [selectedCategory, captures, query]);

  function switchView(v: ViewMode) {
    setView(v);
    setQuery('');
    setSelectedCategory(null);
  }

  function openCategory(name: string) {
    setSelectedCategory(name);
    setQuery('');
  }

  function backToCategories() {
    setSelectedCategory(null);
    setQuery('');
  }

  const searchPlaceholder = selectedCategory
    ? `Search in ${selectedCategory}…`
    : view === 'categories'
    ? 'Search categories…'
    : 'Search notes…';

  function openNoteActions(item: Capture) {
    Alert.alert('', undefined, [
      {
        text: 'Edit',
        onPress: () => {
          setEditingCapture(item);
          setEditText(item.text);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Delete note?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDeleteCapture(item.id) },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function renderNoteCard({ item }: { item: Capture }) {
    const categoryBadges = item.categories?.slice(0, 2) ?? [];
    return (
      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          {item.processing ? (
            <View style={styles.processingBadge}>
              <Text style={styles.processingBadgeText}>processing…</Text>
            </View>
          ) : item.processingFailed ? (
            <View style={styles.failedBadge}>
              <Text style={styles.failedBadgeText}>{item.errorMessage ?? 'unprocessed'}</Text>
            </View>
          ) : categoryBadges.length > 0 ? (
            categoryBadges.map(cat => (
              <View key={cat.name} style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{cat.name}</Text>
              </View>
            ))
          ) : item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          ) : null}
          <Text style={styles.noteTime}>{formatDate(item.createdAt)}</Text>
          <TouchableOpacity onPress={() => openNoteActions(item)} style={styles.moreBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>
        <Text style={styles.noteText} numberOfLines={4}>{item.text}</Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map(tag => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>
    );
  }

  let content;

  if (view === 'all') {
    content = allResults.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {query.trim() ? 'No notes match your search.' : 'No notes yet. Start capturing!'}
        </Text>
      </View>
    ) : (
      <FlatList
        key="all"
        data={allResults}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={renderNoteCard}
      />
    );
  } else if (selectedCategory) {
    content = (
      <>
        <TouchableOpacity style={styles.backButton} onPress={backToCategories}>
          <Ionicons name="chevron-back" size={18} color="#1a1a1a" />
          <Text style={styles.backText}>{selectedCategory}</Text>
        </TouchableOpacity>
        {categoryNotes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {query.trim() ? 'No notes match your search.' : 'No notes in this category.'}
            </Text>
          </View>
        ) : (
          <FlatList
            key="category-detail"
            data={categoryNotes}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={renderNoteCard}
          />
        )}
      </>
    );
  } else {
    content = filteredCategories.length === 0 ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {query.trim() ? 'No categories match.' : 'No categories yet. Capture some notes!'}
        </Text>
      </View>
    ) : (
      <FlatList
        key="categories-grid"
        data={filteredCategories}
        keyExtractor={item => item.name}
        numColumns={2}
        contentContainerStyle={styles.tileList}
        columnWrapperStyle={styles.tileRow}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: TILE_COLORS[index % TILE_COLORS.length] }]}
            onPress={() => openCategory(item.name)}
          >
            <Ionicons name={item.icon as any} size={36} color="#444" />
            <Text style={styles.tileName}>{item.name}</Text>
            <Text style={styles.tileCount}>{item.count} {item.count === 1 ? 'note' : 'notes'}</Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Notes</Text>

      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segment, view === 'all' && styles.segmentActive]}
          onPress={() => switchView('all')}
        >
          <Text style={[styles.segmentText, view === 'all' && styles.segmentTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, view === 'categories' && styles.segmentActive]}
          onPress={() => switchView('categories')}
        >
          <Text style={[styles.segmentText, view === 'categories' && styles.segmentTextActive]}>Categories</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color="#aaa" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor="#bbb"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      {content}

      <Modal
        visible={editingCapture !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingCapture(null)}
      >
        <KeyboardAvoidingView
          style={styles.editModal}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditingCapture(null)}>
              <Text style={styles.editCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Note</Text>
            <TouchableOpacity onPress={() => {
              if (editingCapture && editText.trim()) {
                onEditCapture(editingCapture.id, editText.trim());
                setEditingCapture(null);
              }
            }}>
              <Text style={styles.editSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            scrollEnabled
          />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f7' },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.5,
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#efefed',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  segmentTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefed',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1a1a1a' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 1, backgroundColor: '#ebebeb' },
  noteCard: { paddingVertical: 14 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6, flexWrap: 'wrap', flex: 1 },
  moreBtn: { marginLeft: 'auto' },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f0f0ee',
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '600', color: '#555' },
  processingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fef9e7',
  },
  processingBadgeText: { fontSize: 11, fontWeight: '500', color: '#d4a017' },
  failedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fdf0f0',
  },
  failedBadgeText: { fontSize: 11, fontWeight: '500', color: '#cc4444' },
  noteTime: { fontSize: 12, color: '#aaa' },
  noteText: { fontSize: 15, color: '#1a1a1a', lineHeight: 22 },
  tagsRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  tag: { fontSize: 12, color: '#aaa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#bbb', textAlign: 'center' },
  editModal: { flex: 1, backgroundColor: '#f9f9f7' },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ebebeb',
  },
  editTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  editCancel: { fontSize: 16, color: '#999' },
  editSave: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 24,
    padding: 20,
    textAlignVertical: 'top',
  },
  tileList: { paddingHorizontal: 16, paddingBottom: 24 },
  tileRow: { gap: 12, marginBottom: 12 },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start',
    gap: 8,
    minHeight: 130,
  },
  tileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  tileCount: {
    fontSize: 13,
    color: '#888',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 2,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
