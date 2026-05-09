import { Image, StyleSheet, View } from 'react-native';

// A subtle monochromatic noise pattern (base64)
// This is a 64x64 pixel noise texture tile
const NOISE_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5gIeDhg0y5x4swAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABhklEQVRo3u2a3XLDIAyE8/Z9/2f2tN320h8IGL82h2m8MzqJLHwkISH/Pj8/P/8fPs/z/X6/3+/v9/t+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+/1+v9/v9/v9fr/f7/f7/X6/3+/3+32/3+/3+30/P//3F8+fReF30v/OAAAAAElFTkSuQmCC';

export const NoiseTexture = ({ opacity = 0.1, style }) => {
    return (
        <View style={[
            StyleSheet.absoluteFill,
            { opacity, overflow: 'hidden', zIndex: -1 },
            style
        ]} pointerEvents="none">
            <Image
                source={{ uri: NOISE_BASE64 }}
                style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'repeat',
                }}
            />
        </View>
    );
};
