import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateTripModal({ visible, onClose, onSave }) {
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState(1); // 1=Details, 2=Dates, 3=Media

    // Form Data
    const [city, setCity] = useState('');
    const [desc, setDesc] = useState('');
    const [coverImage, setCoverImage] = useState(null);

    // Dates
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const reset = () => {
        setStep(1);
        setCity('');
        setDesc('');
        setCoverImage(null);
        setStartDate(null);
        setEndDate(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setCoverImage(result.assets[0].uri);
        }
    };

    const handleDayPress = (day) => {
        if (!startDate || (startDate && endDate)) {
            setStartDate(day.dateString);
            setEndDate(null);
        } else {
            // Logic for range
            if (day.dateString < startDate) {
                setStartDate(day.dateString);
            } else {
                setEndDate(day.dateString);
            }
        }
    };

    const getMarkedDates = () => {
        const marks = {};
        if (startDate) marks[startDate] = { startingDay: true, color: '#3E6FFF', textColor: 'white' };
        if (endDate) marks[endDate] = { endingDay: true, color: '#3E6FFF', textColor: 'white' };

        if (startDate && endDate) {
            let start = new Date(startDate);
            const end = new Date(endDate);
            while (start < end) {
                start.setDate(start.getDate() + 1);
                const str = start.toISOString().split('T')[0];
                if (str === endDate) break;
                marks[str] = { color: '#1C2533', textColor: '#d0d7de' };
            }
        }
        return marks;
    };

    const handleSave = () => {
        const newTrip = {
            id: Date.now().toString(),
            city: city || 'New Trip',
            hotel: { name: desc || 'Custom Trip', desc: 'User added trip', image: coverImage },
            period: startDate && endDate ? `${startDate} – ${endDate}` : 'Dates TBD',
            status: 'planned', // or past
            startDate,
            endDate
        };
        onSave(newTrip);
        handleClose();
    };

    // Steps Rendering
    return (
        <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
            <View style={[styles.container, { paddingTop: insets.top }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
                        <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {step === 1 ? 'Trip Details' : step === 2 ? 'Select Dates' : 'Add Memories'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {step === 1 && (
                        <View style={styles.form}>
                            <Text style={styles.label}>Where did you go / are going?</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="City, Country"
                                placeholderTextColor="#667085"
                                value={city}
                                onChangeText={setCity}
                                autoFocus
                            />

                            <Text style={[styles.label, { marginTop: 20 }]}>Trip Title / Description</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Summer Vacation '25"
                                placeholderTextColor="#667085"
                                value={desc}
                                onChangeText={setDesc}
                            />
                        </View>
                    )}

                    {step === 2 && (
                        <View style={styles.form}>
                            <Calendar
                                theme={{
                                    backgroundColor: '#0E141C',
                                    calendarBackground: '#0E141C',
                                    textSectionTitleColor: '#b6c1cd',
                                    dayTextColor: '#d9e1e8',
                                    todayTextColor: '#3E6FFF',
                                    selectedDayBackgroundColor: '#3E6FFF',
                                    selectedDayTextColor: '#ffffff',
                                    monthTextColor: 'white',
                                    arrowColor: 'white',
                                }}
                                markedDates={getMarkedDates()}
                                markingType={'period'}
                                onDayPress={handleDayPress}
                            />
                            <Text style={styles.hint}>Select start and end date</Text>
                        </View>
                    )}

                    {step === 3 && (
                        <View style={styles.form}>
                            <Text style={styles.label}>Cover Photo</Text>
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                {coverImage ? (
                                    <Image source={{ uri: coverImage }} style={styles.previewImage} />
                                ) : (
                                    <View style={styles.placeholderC}>
                                        <Ionicons name="image-outline" size={40} color="#667085" />
                                        <Text style={styles.placeholderText}>Tap to select photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Footer Actions */}
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.footer}>
                    {step > 1 && (
                        <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.secondaryBtn}>
                            <Text style={styles.secondaryBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.primaryBtn, step === 1 && !city && { opacity: 0.5 }]}
                        disabled={step === 1 && !city}
                        onPress={() => {
                            if (step < 3) setStep(step + 1);
                            else handleSave();
                        }}
                    >
                        <Text style={styles.primaryBtnText}>
                            {step === 3 ? 'Save Trip' : 'Next'}
                        </Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0E141C' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1C222C', justifyContent: 'center', alignItems: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '700', fontFamily: 'Raleway_700Bold' },
    content: { flex: 1, padding: 20 },

    form: { gap: 12 },
    label: { color: '#9BA4B4', fontSize: 14, marginBottom: 8, fontFamily: 'Raleway_700Regular' },
    input: {
        backgroundColor: '#1E2A3A',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#2A3340'
    },

    hint: { color: '#667085', fontSize: 12, textAlign: 'center', marginTop: 12 },

    imagePicker: {
        height: 200,
        backgroundColor: '#1E2A3A',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#2A3340',
        borderStyle: 'dashed',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
    },
    placeholderC: { alignItems: 'center', gap: 8 },
    placeholderText: { color: '#667085' },
    previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

    footer: { padding: 20, flexDirection: 'row', gap: 12, borderTopWidth: 1, borderColor: '#1C222C' },
    primaryBtn: { flex: 1, height: 50, backgroundColor: '#3E6FFF', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { width: 100, height: 50, backgroundColor: '#1C222C', borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    secondaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
