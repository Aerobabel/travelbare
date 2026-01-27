import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext'; // Dynamic Themes
import { supabase } from '../../lib/supabase';

export default function PhoneScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme(); // Use Global Theme
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // E.164 Format helper (Simplified)
  const formattedPhone = useMemo(() => {
    const digits = phone.replace(/\D/g, '');
    return digits.length > 0 ? `+${digits}` : '+';
  }, [phone]);

  const isValid = phone.replace(/\D/g, '').length >= 8;

  const onChangePhone = (t) => {
    // Just store raw input, format on display
    setPhone(t);
  };

  const sendCode = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: { channel: 'sms', shouldCreateUser: true },
    });
    setLoading(false);
    if (error) return alert(error.message);
    router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
  };

  // Dynamic Styles
  const isDark = theme === 'dark';
  const headerPillBg = isDark ? '#1C1C1E' : '#F2F2F7'; // iOS System Grays
  const headerText = colors.text;
  const placeholderColor = isDark ? '#8E8E93' : '#8E8E93';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Header Row */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { borderColor: isDark ? '#3A3A3C' : '#E5E5EA', backgroundColor: isDark ? 'transparent' : '#fff' }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Pill Title */}
        <View style={[styles.headerPill, { backgroundColor: headerPillBg }]}>
          <Text style={[styles.headerTitle, { color: headerText }]}>Your Phone</Text>
        </View>

        {/* Spacer for centering */}
        <View style={{ width: 44 }} />
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.centerBlock}>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>Enter your mobile number</Text>

          {/* Centered Input Area */}
          <View style={styles.inputWrapper}>
            {/* The Plus Icon */}
            {phone.length === 0 && (
              <View style={styles.placeholderContainer}>
                <Ionicons name="add" size={24} color={colors.text} />
              </View>
            )}

            <TextInput
              value={phone}
              onChangeText={onChangePhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoFocus
              placeholder=""
              caretHidden={true}
              selectionColor={colors.transparent}
              style={[styles.phoneInput, { color: colors.text }]}
            />
          </View>
        </View>

        {/* Bottom Button */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: '#007AFF', opacity: (!isValid || loading) ? 0.6 : 1 }]}
          onPress={sendCode}
          disabled={!isValid || loading}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{loading ? 'Sending...' : 'Send Code'}</Text>
        </TouchableOpacity>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    height: 50,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Raleway_600SemiBold',
  },

  body: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 20, // Space above keyboard
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Center vertically
    marginTop: -80, // Offset slightly up visual balance
  },
  sub: {
    fontSize: 18,
    fontFamily: 'Raleway_400Regular',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.6,
  },
  inputWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 60,
  },
  placeholderContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneInput: {
    fontSize: 32,
    fontFamily: 'Raleway_700Bold',
    textAlign: 'center',
    width: '100%',
    minWidth: 200,
  },
  btn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Raleway_600SemiBold',
  },
});
