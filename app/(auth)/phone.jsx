// app/(auth)/phone.jsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const BLUE = '#0A84FF', BG = '#0C111A', TEXT = '#E6EDF3', SUB = '#9BA4B4', CARD = '#121826';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('+'); // E.164
  const [loading, setLoading] = useState(false);

  const isValid = useMemo(() => phone.replace(/\D/g, '').length >= 8, [phone]);

  const onChangePhone = (t) => {
    // keep a single leading '+' and digits only
    const digits = t.replace(/\D/g, '');
    setPhone('+' + digits);
  };

  const sendCode = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: { channel: 'sms', shouldCreateUser: true },
    });
    setLoading(false);
    if (error) return alert(error.message);
    router.push({ pathname: '/(auth)/otp', params: { phone } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      {/* Header: back + centered title */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Phone</Text>
      </View>

      {/* Body */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={16}
      >
        <View style={styles.centerBlock}>
          <Text style={styles.sub}>Enter your mobile number</Text>

          {/* Big centered phone input (transparent, no borders) */}
          <TextInput
            value={phone}
            onChangeText={onChangePhone}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoFocus
            style={styles.phoneInput}
            selectionColor={TEXT}
          />
        </View>

        {/* Button pinned above keyboard */}
        <TouchableOpacity
          style={[styles.btn, !isValid && { opacity: 0.6 }]}
          onPress={sendCode}
          disabled={!isValid || loading}
        >
          <Text style={styles.btnText}>{loading ? 'Sending…' : 'Send Code'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: BG,
  },
  backBtn: { position: 'absolute', left: 8, top: 10, padding: 6 },
  headerTitle: { color: TEXT, fontSize: 16, fontWeight: '700' },

  body: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingBottom: 12 },
  centerBlock: { alignItems: 'center', marginTop: 12 },
  sub: { color: SUB, marginBottom: 18, fontSize: 14 },

  phoneInput: {
    color: TEXT,
    fontSize: 28,
    textAlign: 'center',
    paddingVertical: 88,
    paddingHorizontal: 12,
    backgroundColor: 'transparent', // transparent like the mock
  },

  btn: {
    backgroundColor: BLUE,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
