import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LoadingScreenImg from '../../assets/images/LoadingScreen.png';
import { supabase } from '../../lib/supabase';

// Ensure WebBrowser finishes cleanly
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

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
    }, []);

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
        <View style={styles.container}>
            <StatusBar hidden />

            {/* Background PNG */}
            <Image
                source={LoadingScreenImg}
                style={[StyleSheet.absoluteFill, { width: width, height: height }]}
                resizeMode="cover"
            />

            {/* Content */}
            <View style={styles.content}>

                {/* Spacer to push buttons down since Logo is gone */}
                <View style={{ flex: 1 }} />

                {/* Bottom Buttons */}
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
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Raleway_600SemiBold' }}>Continue as Guest</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Fallback
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingBottom: 60, // Space from bottom
        paddingHorizontal: 20,
    },
    buttonContainer: {
        gap: 16,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    glassButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(20, 25, 30, 0.6)', // Semi-transparent dark
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    icon: {
        marginRight: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
});
