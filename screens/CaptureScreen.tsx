import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { StatusBar } from 'expo-status-bar';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Capture } from '../App';

type Mode = 'idle' | 'recording' | 'text';

type Props = {
  captures: Capture[];
  onAddCapture: (text: string, source?: 'voice' | 'text') => void;
  autoStart?: boolean;
  onAutoStartHandled?: () => void;
};

const BAR_DURATIONS = [500, 400, 600, 450, 520];
const BAR_DELAYS = [0, 120, 60, 180, 90];

export default function CaptureScreen({ captures, onAddCapture, autoStart, onAutoStartHandled }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [textInput, setTextInput] = useState('');
  const [interimText, setInterimText] = useState('');

  const accumulatedText = useRef('');
  const manualStop = useRef(false);
  const isRecording = useRef(false);
  const isCancelling = useRef(false);
  const maxDurationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bar1 = useRef(new Animated.Value(0.15)).current;
  const bar2 = useRef(new Animated.Value(0.15)).current;
  const bar3 = useRef(new Animated.Value(0.15)).current;
  const bar4 = useRef(new Animated.Value(0.15)).current;
  const bar5 = useRef(new Animated.Value(0.15)).current;
  const bars = [bar1, bar2, bar3, bar4, bar5];
  const micScale = useRef(new Animated.Value(1)).current;

  useSpeechRecognitionEvent('result', (event) => {
    if (isCancelling.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      accumulatedText.current = (accumulatedText.current + ' ' + transcript).trim();
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!manualStop.current && isRecording.current) {
      // iOS ended the session — restart to keep mic alive
      setTimeout(() => {
        ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
      }, 150);
    } else {
      if (accumulatedText.current) {
        onAddCapture(accumulatedText.current);
        accumulatedText.current = '';
      }
      isRecording.current = false;
      setMode('idle');
      setInterimText('');
    }
  });

  useEffect(() => {
    if (mode === 'recording') {
      Animated.spring(micScale, { toValue: 0.92, useNativeDriver: true, friction: 4 }).start();
      bars.forEach((bar, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, { toValue: 1, duration: BAR_DURATIONS[i], delay: BAR_DELAYS[i], easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(bar, { toValue: 0.15, duration: BAR_DURATIONS[i], easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        ).start();
      });
    } else {
      Animated.spring(micScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
      bars.forEach(bar => {
        bar.stopAnimation();
        Animated.timing(bar, { toValue: 0.15, duration: 200, useNativeDriver: true }).start();
      });
    }
  }, [mode]);

  useEffect(() => {
    if (autoStart) {
      startRecording();
      onAutoStartHandled?.();
    }
  }, [autoStart]);

  async function startRecording() {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) return;
    manualStop.current = false;
    isRecording.current = true;
    isCancelling.current = false;
    accumulatedText.current = '';
    activateKeepAwakeAsync();
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: true });
    setMode('recording');
    maxDurationTimer.current = setTimeout(() => stopRecording(), 10 * 60 * 1000);
  }

  function stopRecording() {
    manualStop.current = true;
    isRecording.current = false;
    deactivateKeepAwake();
    if (maxDurationTimer.current) {
      clearTimeout(maxDurationTimer.current);
      maxDurationTimer.current = null;
    }
    ExpoSpeechRecognitionModule.stop();
  }

  function cancelRecording() {
    isCancelling.current = true;
    manualStop.current = true;
    isRecording.current = false;
    deactivateKeepAwake();
    accumulatedText.current = '';
    if (maxDurationTimer.current) {
      clearTimeout(maxDurationTimer.current);
      maxDurationTimer.current = null;
    }
    ExpoSpeechRecognitionModule.stop();
    setMode('idle');
    setInterimText('');
  }

  function submitText() {
    if (!textInput.trim()) return;
    onAddCapture(textInput.trim(), 'text');
    setTextInput('');
    setMode('idle');
  }

  const lastCapture = captures[0] ?? null;
  const displayText = interimText
    ? (accumulatedText.current + ' ' + interimText).trim()
    : accumulatedText.current;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.appName}>memcapture</Text>

      {lastCapture && (
        <View style={styles.lastCapture}>
          <Text style={styles.lastCaptureLabel}>Last captured</Text>
          <Text style={styles.lastCaptureText}>{lastCapture.text}</Text>
          <Text style={styles.lastCaptureTime}>
            {new Date(lastCapture.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      )}

      {captures.length > 1 && (
        <Text style={styles.captureCount}>{captures.length} captures saved</Text>
      )}

      <KeyboardAvoidingView
        style={styles.captureArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {mode === 'text' ? (
          <View style={styles.textInputArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Type your note..."
              placeholderTextColor="#999"
              value={textInput}
              onChangeText={setTextInput}
              multiline
              autoFocus
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitText}>
              <Text style={styles.submitBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode('idle')}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {mode === 'recording' && displayText ? (
              <Text style={styles.interimText}>{displayText}</Text>
            ) : null}

            <Animated.View style={{ transform: [{ scale: micScale }], marginBottom: 24 }}>
              <TouchableOpacity
                style={[styles.micButton, mode === 'recording' && styles.micButtonActive]}
                onPress={mode === 'recording' ? stopRecording : startRecording}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={mode === 'recording' ? 'stop' : 'mic'}
                  size={40}
                  color="#fff"
                />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.waveContainer}>
              {bars.map((bar, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.waveBar,
                    mode === 'recording' && styles.waveBarActive,
                    { transform: [{ scaleY: bar }] },
                  ]}
                />
              ))}
            </View>

            <Text style={styles.micHint}>
              {mode === 'recording' ? 'Tap to stop' : 'Tap to speak'}
            </Text>

            {mode === 'recording' && (
              <TouchableOpacity style={styles.cancelRecordBtn} onPress={cancelRecording}>
                <Text style={styles.cancelRecordText}>Discard</Text>
              </TouchableOpacity>
            )}

            {mode === 'idle' && (
              <TouchableOpacity style={styles.textToggle} onPress={() => setMode('text')}>
                <Text style={styles.textToggleLabel}>Type instead</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f7',
  },
  appName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 16,
    letterSpacing: -0.3,
  },
  lastCapture: {
    margin: 24,
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  lastCaptureLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastCaptureText: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  lastCaptureTime: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 6,
  },
  captureCount: {
    fontSize: 12,
    color: '#bbb',
    textAlign: 'center',
    marginBottom: 4,
  },
  captureArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interimText: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 28,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  micButtonActive: {
    backgroundColor: '#e03131',
    shadowColor: '#e03131',
    shadowOpacity: 0.35,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 40,
    marginBottom: 16,
  },
  waveBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    backgroundColor: '#ddd',
  },
  waveBarActive: {
    backgroundColor: '#e03131',
  },
  micHint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
  textToggle: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
  },
  textToggleLabel: {
    fontSize: 14,
    color: '#555',
  },
  textInputArea: {
    width: '100%',
    paddingHorizontal: 24,
    gap: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  submitBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 8,
  },
  cancelBtnText: {
    color: '#999',
    fontSize: 14,
  },
  cancelRecordBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelRecordText: {
    fontSize: 14,
    color: '#bbb',
  },
});
