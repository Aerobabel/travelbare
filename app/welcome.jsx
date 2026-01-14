// app/welcome.jsx
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { supabase } from '../lib/supabase'; // lib is next to app/

export default function Welcome() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // show logo briefly
        await new Promise((resolve) => setTimeout(resolve, 2500));
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (!mounted) return;
        router.replace(session ? '/(tabs)' : '/(auth)/sign-in');
      } catch (err) {
        console.warn('Failed to bootstrap session', err);
        if (!mounted) return;
        router.replace('/(auth)/sign-in');
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  return (
    <View style={styles.wrap}>
      <Image source={require('@/assets/images/Logo.png')} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0E141C' },
  logo: { width: 75, height: 38 },
});
