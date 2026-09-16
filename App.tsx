import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import OnboardingScreen from './screens/OnboardingScreen';
import CaptureScreen from './screens/CaptureScreen';
import NotesScreen from './screens/NotesScreen';
import { processNote, NoteCategory } from './services/gemini';

type Capture = {
  id: string;
  text: string;
  rawText?: string;
  createdAt: number;
  category?: string; // legacy — kept for backwards compat with stored notes
  categories?: NoteCategory[];
  tags?: string[];
  topics?: string[];
  entities?: string[];
  processing?: boolean;
  processingFailed?: boolean;
  errorMessage?: string;
};

const STORAGE_KEY = 'memcapture:captures';
const ONBOARDING_KEY = 'memcapture:onboarding_complete';

export async function loadCaptures(): Promise<Capture[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function persistCaptures(captures: Capture[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(captures));
}

export type { Capture };

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [autoStart, setAutoStart] = useState(false);
  const [activeTab, setActiveTab] = useState<'capture' | 'notes'>('capture');

  useEffect(() => {
    Promise.all([
      loadCaptures(),
      AsyncStorage.getItem(ONBOARDING_KEY),
    ]).then(([savedCaptures, onboardingFlag]) => {
      setCaptures(savedCaptures);
      setOnboardingComplete(onboardingFlag === 'true');
    });

    Linking.getInitialURL().then(url => {
      if (url?.startsWith('memcapture://')) {
        setActiveTab('capture');
        setAutoStart(true);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url?.startsWith('memcapture://')) {
        setActiveTab('capture');
        setAutoStart(true);
      }
    });

    return () => sub.remove();
  }, []);

  async function completeOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingComplete(true);
  }

  function editCapture(id: string, text: string) {
    setCaptures(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, text } : c);
      persistCaptures(updated);
      return updated;
    });
  }

  function deleteCapture(id: string) {
    setCaptures(prev => {
      const updated = prev.filter(c => c.id !== id);
      persistCaptures(updated);
      return updated;
    });
  }

  async function addCapture(text: string, source: 'voice' | 'text' = 'voice') {
    if (!text.trim()) return;
    const newCapture: Capture = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: Date.now(),
      processing: true,
    };

    setCaptures(prev => [newCapture, ...prev]);
    await persistCaptures([newCapture, ...captures]);

    processNote(text.trim(), source).then(async (metadata) => {
      setCaptures(prev => {
        const enriched = prev.map(c =>
          c.id === newCapture.id ? {
            ...c,
            rawText: c.text,
            text: metadata.cleanedText,
            categories: metadata.categories,
            tags: metadata.tags,
            topics: metadata.topics,
            entities: metadata.entities,
            processing: false,
            processingFailed: false,
          } : c
        );
        persistCaptures(enriched);
        return enriched;
      });
    }).catch((err) => {
      const errorMsg = err?.message ?? 'Unknown error';
      setCaptures(prev => {
        const failed = prev.map(c =>
          c.id === newCapture.id ? { ...c, processing: false, processingFailed: true, errorMessage: errorMsg } : c
        );
        persistCaptures(failed);
        return failed;
      });
    });
  }

  if (onboardingComplete === null) return <View style={styles.loading} />;
  if (!onboardingComplete) return <OnboardingScreen onComplete={completeOnboarding} />;

  return (
    <View style={styles.root}>
      <View style={styles.screen}>
        {activeTab === 'capture'
          ? <CaptureScreen captures={captures} onAddCapture={addCapture} autoStart={autoStart} onAutoStartHandled={() => setAutoStart(false)} />
          : <NotesScreen captures={captures} onEditCapture={editCapture} onDeleteCapture={deleteCapture} />
        }
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('capture')}>
          <Ionicons name="mic" size={24} color={activeTab === 'capture' ? '#1a1a1a' : '#bbb'} />
          <Text style={[styles.tabLabel, activeTab === 'capture' && styles.tabLabelActive]}>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('notes')}>
          <Ionicons name="list" size={24} color={activeTab === 'notes' ? '#1a1a1a' : '#bbb'} />
          <Text style={[styles.tabLabel, activeTab === 'notes' && styles.tabLabelActive]}>Notes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#f9f9f7',
  },
  root: {
    flex: 1,
    backgroundColor: '#f9f9f7',
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#ebebeb',
    backgroundColor: '#fff',
    paddingBottom: 20,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    color: '#bbb',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#1a1a1a',
  },
});
