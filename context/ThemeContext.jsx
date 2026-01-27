import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import Colors from '../constants/Colors';

const ThemeContext = createContext({
    theme: 'dark', // 'light' | 'dark'
    toggleTheme: (newTheme) => { },
    colors: Colors.dark,
    menuMode: 'System', // 'Light' | 'Dark' | 'System'
});

export const ThemeProvider = ({ children }) => {
    const deviceScheme = useDeviceColorScheme();
    const [menuMode, setMenuMode] = useState('Dark'); // The setting chosen by user
    const [resolvedTheme, setResolvedTheme] = useState('dark');

    useEffect(() => {
        // Load saved preference
        (async () => {
            const savedMode = await AsyncStorage.getItem('app_theme_preference');
            if (savedMode) {
                setMenuMode(savedMode);
            }
        })();
    }, []);

    useEffect(() => {
        // Resolve theme based on mode
        if (menuMode === 'System') {
            setResolvedTheme(deviceScheme === 'light' ? 'light' : 'dark');
        } else {
            setResolvedTheme(menuMode === 'Light' ? 'light' : 'dark');
        }
    }, [menuMode, deviceScheme]);

    const setThemePreference = async (mode) => {
        setMenuMode(mode);
        await AsyncStorage.setItem('app_theme_preference', mode);
    };

    const value = {
        theme: resolvedTheme,
        menuMode,
        setThemePreference,
        colors: Colors[resolvedTheme] || Colors.dark,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
