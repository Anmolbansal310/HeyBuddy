import { useState } from 'react';
import { Linking, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SHORTCUT_ICLOUD_LINK = 'https://www.icloud.com/shortcuts/551fd72c0c534b18b7f0be94fa41feba';

type Props = {
  onComplete: () => void;
};

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2>(1);

  async function handleInstallShortcut() {
    await Linking.openURL(SHORTCUT_ICLOUD_LINK);
    setStep(2);
  }

  async function handleOpenSettings() {
    await Linking.openURL('App-Prefs:');
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>✌️</Text>
          <Text style={styles.title}>Capture with a double tap</Text>
          <Text style={styles.subtitle}>
            Double tap the back of your phone — whatever app you're in — to instantly start capturing. No need to open memcapture.
          </Text>

          <View style={styles.stepCard}>
            <Text style={styles.stepCardLabel}>STEP 1 OF 2</Text>
            <Text style={styles.stepCardTitle}>Install the shortcut</Text>
            <Text style={styles.stepCardDesc}>
              This adds a small automation to your Shortcuts app. It only opens memcapture — nothing else.
            </Text>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleInstallShortcut}>
            <Text style={styles.primaryBtnText}>Install shortcut</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
            <Text style={styles.skipBtnText}>Skip setup</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⚙️</Text>
        <Text style={styles.title}>One last step</Text>
        <Text style={styles.subtitle}>
          Follow these steps in Settings to assign double tap to memcapture.
        </Text>

        <View style={styles.pathCard}>
          <Text style={styles.stepCardLabel}>STEP 2 OF 2 — FOLLOW THESE STEPS</Text>
          <PathStep number="1" text="Tap Accessibility" />
          <PathStep number="2" text="Tap Touch" />
          <PathStep number="3" text="Tap Back Tap" />
          <PathStep number="4" text="Tap Double Tap" />
          <PathStep number="5" text="Scroll down to the Shortcuts section" />
          <PathStep number="6" text="Tap memcapture" highlight />
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenSettings}>
          <Text style={styles.primaryBtnText}>Open Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={onComplete}>
          <Text style={styles.doneBtnText}>Done, it's set up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={onComplete}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function PathStep({ number, text, highlight }: { number: string; text: string; highlight?: boolean }) {
  return (
    <View style={styles.pathStep}>
      <View style={[styles.pathStepNumber, highlight && styles.pathStepNumberHighlight]}>
        <Text style={styles.pathStepNumberText}>{number}</Text>
      </View>
      <Text style={[styles.pathStepText, highlight && styles.pathStepTextHighlight]}>{text}</Text>
      {!highlight && <Text style={styles.pathArrow}>›</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  stepCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  stepCardLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  stepCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepCardDesc: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
  },
  pathCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: 10,
  },
  pathStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pathStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8e8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathStepNumberHighlight: {
    backgroundColor: '#1a1a1a',
  },
  pathStepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  pathStepText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
  },
  pathStepTextHighlight: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  pathArrow: {
    fontSize: 18,
    color: '#ccc',
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  doneBtnText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
  },
  skipBtn: {
    padding: 10,
    marginTop: 4,
  },
  skipBtnText: {
    fontSize: 14,
    color: '#bbb',
  },
});
