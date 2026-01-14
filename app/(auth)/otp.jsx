import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

const BLUE = '#0A84FF', BG='#0C111A', TEXT='#E6EDF3', SUB='#9BA4B4';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(50);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const verify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: String(phone),
      token: code,
      type: 'sms',
    });
    setLoading(false);
    if (error) return alert(error.message);
    // session is now set, root layout will redirect to /(tabs)
  };

  const resend = async () => {
    if (timer > 0) return;
    setTimer(50);
    await supabase.auth.signInWithOtp({ phone: String(phone), options:{ channel:'sms' } });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Your Phone</Text>
      <Text style={{ color: SUB, marginBottom: 24 }}>
        We sent a code to your phone: {phone}
      </Text>

      <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()}>
        <View style={styles.dotsRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={[styles.dot, code[i] ? styles.dotFilled : null]} />
          ))}
        </View>
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="number-pad"
        style={{ height: 0, width: 0, opacity: 0 }}
        autoFocus
      />

      <TouchableOpacity style={styles.btn} onPress={verify} disabled={loading || code.length < 6}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>{loading ? 'Verifying…' : 'Continue'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={resend} style={{ marginTop: 18 }}>
        <Text style={{ color: SUB, textAlign:'center' }}>
          {timer > 0 ? `Send another code in 0:${String(timer).padStart(2,'0')}` : 'Resend code'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ flex:1, backgroundColor: BG, padding:24, paddingTop:90 },
  title:{ color: TEXT, fontSize:18, fontWeight:'700', marginBottom:6 },
  dotsRow:{ flexDirection:'row', justifyContent:'center', gap:12, marginVertical:20 },
  dot:{ width:14, height:14, borderRadius:7, borderWidth:1, borderColor:'#334155' },
  dotFilled:{ backgroundColor:'#fff' },
  btn:{ backgroundColor: BLUE, padding:16, alignItems:'center', borderRadius:12, marginTop:12 },
});
