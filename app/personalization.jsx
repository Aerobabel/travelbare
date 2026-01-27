import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function Personalization() {
    const router = useRouter();
    const { menuMode, setThemePreference, colors, theme } = useTheme();
    const [language, setLanguage] = useState('English');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.circleBtn, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.headerPill, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Personalization</Text>
                </View>
                <View style={styles.spacer} />
            </View>

            <View style={styles.content}>

                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Theme</Text>
                    <View style={[styles.segmentContainer, { backgroundColor: colors.pillBackground, borderColor: colors.pillBorder }]}>
                        {['Light', 'Dark', 'System'].map((t) => {
                            const isActive = menuMode === t;
                            const activeBg = theme === 'dark' ? '#2A313C' : '#FFFFFF';
                            const activeTxt = theme === 'dark' ? '#fff' : '#000';

                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.segmentBtn,
                                        isActive && { backgroundColor: activeBg, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
                                    ]}
                                    onPress={() => setThemePreference(t)}
                                >
                                    <Text style={[
                                        styles.segmentText,
                                        { color: colors.textSecondary },
                                        isActive && { color: activeTxt, fontWeight: '600' }
                                    ]}>
                                        {t}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Language Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Language</Text>
                    <TouchableOpacity style={[styles.languageBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                        <Text style={[styles.languageText, { color: colors.text }]}>{language}</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                </View>

            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 40,
    },
    circleBtn: {
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
        borderWidth: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: 'Raleway_600SemiBold',
    },
    spacer: { width: 44 },

    content: {
        paddingHorizontal: 20,
        gap: 32,
    },
    section: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 16,
        fontFamily: 'Raleway',
    },

    // Segmented Control
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 30,
        padding: 4,
        borderWidth: 1,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 26,
    },
    segmentText: {
        fontSize: 15,
        fontFamily: 'Raleway',
    },

    // Language Button
    languageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
    },
    languageText: {
        fontSize: 16,
        fontFamily: 'Raleway',
    },
});
