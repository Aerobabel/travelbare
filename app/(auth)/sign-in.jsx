// app/(auth)/sign-in.jsx
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const { height: H } = Dimensions.get('window');
const HALF = Math.round(H * 0.6);

// Palette
const BG   = 'rgba(14, 26, 48, 0.95)';
const BLUE = '#16283aff';
const TEXT = '#E6EDF3';

const USE_PROXY_FOR_AUTH = Constants.appOwnership === 'expo';

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(null); // 'google' | 'apple' | 'phone' | null

  const redirectTo = useMemo(
    () =>
      makeRedirectUri({
        scheme: 'nuviatravel',
        path: 'redirect',
        useProxy: USE_PROXY_FOR_AUTH,
      }),
    []
  );

  const createSessionFromUrl = async (url) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (errorCode) throw new Error(errorCode);
    const { access_token, refresh_token, code } = params;

    if (access_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      return true;
    }
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session) router.replace('/(tabs)');
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace('/(tabs)');
    });
    return () => subscription?.unsubscribe();
  }, [router]);

  const signInWithOAuth = async (provider) => {
    try {
      setLoading(provider);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;

      const authUrl = data?.url;
      if (!authUrl) throw new Error('No auth URL returned from Supabase.');

      const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
      if (res.type === 'success' && res.url) await createSessionFromUrl(res.url);
    } catch (err) {
      console.warn(err);
      alert(err?.message ?? 'Sign-in failed.');
    } finally {
      setLoading(null);
    }
  };

  const goPhone = () => {
    setLoading('phone');
    router.push('/(auth)/phone');
    setLoading(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top hero (no cropping) */}
      <View style={[styles.hero, { height: HALF }]}>
        <Image
          source={require('@/assets/images/authBg.png')}
          style={styles.heroImg}
          resizeMode="contain"
        />
        <LinearGradient
          colors={['transparent', 'rgba(11,23,44,0.4)', BG]}
          locations={[0, 0.6, 1]}
          style={styles.fade}
        />
      </View>

      {/* Logo under hero */}
      <View style={styles.logoWrap}>
        <Image
          source={require('@/assets/images/Logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Buttons – no wrapper card, just spacing */}
      <View style={styles.buttons}>
        <PrimaryButton
          onPress={() => signInWithOAuth('google')}
          loading={loading === 'google'}
          icon={<Ionicons name="logo-google" size={18} color={TEXT} style={styles.iconGap} />}
          label="Sign Up with Google"
        />
        <PrimaryButton
          onPress={() => signInWithOAuth('apple')}
          loading={loading === 'apple'}
          icon={<Ionicons name="logo-apple" size={18} color={TEXT} style={styles.iconGap} />}
          label="Sign Up with Apple"
        />
        <PrimaryButton
          onPress={goPhone}
          loading={loading === 'phone'}
          icon={<Ionicons name="call-outline" size={18} color={TEXT} style={styles.iconGap} />}
          label="Sign Up with Phone"
        />
      </View>
    </SafeAreaView>
  );
}

function PrimaryButton({ onPress, loading, icon, label }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} disabled={!!loading}>
      {loading ? <ActivityIndicator color="#fff" /> : (<>
        {icon}
        <Text style={styles.btnText}>{label}</Text>
      </>)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG, justifyContent: 'flex-end' },

  hero: { width: '100%', position: 'relative' },
  heroImg: { width: '100%', height: '100%', alignSelf: 'center' },
  fade: { ...StyleSheet.absoluteFillObject },

  logoWrap: { alignItems: 'center', marginTop: 8, marginBottom: 58 },
  logo: { width: 120, height: 44 },

  // transparent container replacing the old "card"
  buttons: {
    paddingHorizontal: 16,
    marginBottom: 18,
    gap: 10,
  },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: BLUE,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Raleway_400Regular' },
  iconGap: { marginRight: 8 },
});
