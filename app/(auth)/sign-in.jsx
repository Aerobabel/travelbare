import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import NuviaLoadingScreen from '../../components/NuviaLoadingScreen';
import { supabase } from '../../lib/supabase';

// Ensure WebBrowser finishes cleanly
WebBrowser.maybeCompleteAuthSession();

const redirectTo = makeRedirectUri({
    scheme: 'nuviatravel',
    path: 'auth/callback',
});

export default function SignInScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Listen for Auth State Changes (Handles redirects automatically)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.replace('/(tabs)');
            }
        });
        return () => subscription.unsubscribe();
    }, [router]);

    const handleSignIn = async (provider) => {
        if (provider === 'phone') {
            router.push('/(auth)/phone'); // Redirect to existing phone screen
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: redirectTo,
                    skipBrowserRedirect: true, // We handle the browser open manually
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

                // Manual fallback if redirect doesn't auto-trigger deep link listener
                if (result.type === 'success' && result.url) {
                    const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');

                    if (accessToken && refreshToken) {
                        const { error } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        if (!error) {
                            router.replace('/(tabs)');
                            return;
                        }
                    }
                }

                if (result.type !== 'success') {
                    setLoading(false);
                }
                // If success, the onAuthStateChange listener above handles the navigation
            } else {
                setLoading(false);
            }

        } catch (error) {
            Alert.alert("Sign In Error", error.message);
            setLoading(false);
        }
    };

    return (
        <NuviaLoadingScreen contentStyle={styles.content}>
            <View style={styles.contentInner}>
                <View style={styles.buttonContainer}>
                    {loading && <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 20 }} />}

                    {/* Google */}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleSignIn('google')} disabled={loading}>
                        <BlurView intensity={30} tint="dark" style={styles.glassButton}>
                            <Ionicons name="logo-google" size={20} color="#fff" style={styles.icon} />
                            <Text style={styles.buttonText}>Sign Up with Google</Text>
                        </BlurView>
                    </TouchableOpacity>

                    {/* Apple */}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleSignIn('apple')} disabled={loading}>
                        <BlurView intensity={30} tint="dark" style={styles.glassButton}>
                            <Ionicons name="logo-apple" size={22} color="#fff" style={styles.icon} />
                            <Text style={styles.buttonText}>Sign Up with Apple</Text>
                        </BlurView>
                    </TouchableOpacity>

                    {/* Phone */}
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleSignIn('phone')} disabled={loading}>
                        <BlurView intensity={30} tint="dark" style={styles.glassButton}>
                            <Text style={styles.buttonText}>Sign Up with Phone</Text>
                        </BlurView>
                    </TouchableOpacity>

                    {/* Guest Mode Link */}
                    <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={() => router.replace('/(tabs)')}>
                        <Text style={styles.guestText}>Continue as Guest</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </NuviaLoadingScreen>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingBottom: 58,
        paddingHorizontal: 22,
    },
    contentInner: {
        width: '100%',
        alignItems: 'center',
    },
    buttonContainer: {
        gap: 12,
        width: '100%',
        maxWidth: 330,
        alignSelf: 'center',
    },
    glassButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    icon: {
        position: 'absolute',
        left: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 13,
        fontFamily: 'Raleway-SemiBold',
    },
    guestText: {
        color: 'rgba(255,255,255,0.64)',
        fontSize: 13,
        fontFamily: 'Raleway-SemiBold',
    },
});
