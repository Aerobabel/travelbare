
export const GlassStyles = {
    // Dark Mode (Primary)
    dark: {
        blurIntensity: 50, // Reduced to show more background detail (transparency)
        backgroundColor: 'rgba(255, 255, 255, 0.01)', // Almost zero opacity to let blur do the work
        borderColor: 'rgba(255, 255, 255, 0.15)', // Crisp, thin border for the "surface tension" look
        borderWidth: 1, // Keep it thin
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, // Darker shadow to lift it off the background
        shadowRadius: 12,
    },
    // Light Mode
    light: {
        blurIntensity: 90,
        backgroundColor: 'rgba(255, 255, 255, 0.65)', // Frosted glass look
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    }
};

export const getGlassStyle = (theme = 'dark') => {
    const style = GlassStyles[theme] || GlassStyles.dark;
    return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        // iOS specific shadow for glass depth
        shadowColor: style.shadowColor,
        shadowOffset: style.shadowOffset,
        shadowOpacity: style.shadowOpacity,
        shadowRadius: style.shadowRadius,
    };
};

export const getGlassTextStyle = (theme = 'dark') => {
    const isDark = theme === 'dark';
    return {
        textShadowColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        color: isDark ? '#FFFFFF' : '#000000',
    };
};
