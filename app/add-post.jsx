// app/add-post.jsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function AddPost() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Check if we are in "Edit Mode"
  const editItem = params.item ? JSON.parse(params.item) : null;
  const isEditing = !!editItem;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: editItem?.title || '',
    price: editItem?.price?.replace('$', '') || '', // remove $ for input
    description: editItem?.subtitle || ''
  });

  const handleSubmit = async () => {
    if (!form.title || !form.price) return Alert.alert('Missing info', 'Please fill in Title and Price');
    
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        Alert.alert("Error", "You must be logged in.");
        setLoading(false);
        return;
    }

    const payload = {
      title: form.title,
      price: `$${form.price}`,
      subtitle: form.description,
      // Only update these on CREATE, not Edit (optional choice)
      ...(!isEditing && {
        category: 'Feed',
        author_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        author_avatar: user.user_metadata?.avatar_url || 'https://i.pravatar.cc/150?u=' + user.id,
        image_url: `https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80`, 
        rating: 0,
        complexity: '3/5',
        dates: 'Flexible',
        user_id: user.id, // ✅ Important: Save the User ID
      })
    };

    let error;

    if (isEditing) {
      // UPDATE existing row
      const { error: updateError } = await supabase
        .from('tours')
        .update(payload)
        .eq('id', editItem.id);
      error = updateError;
    } else {
      // INSERT new row
      const { error: insertError } = await supabase
        .from('tours')
        .insert(payload);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', isEditing ? 'Tour updated!' : 'Tour posted!');
      // Go back to community screen (pop 2 if editing to clear stack, or 1 if new)
      isEditing ? router.dismiss(2) : router.back(); 
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Trip' : 'New Trip'}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Where are you going?</Text>
        <TextInput 
          style={styles.input} 
          placeholder="e.g. Kilimanjaro Hike" 
          placeholderTextColor="#666"
          value={form.title}
          onChangeText={t => setForm({...form, title: t})}
        />

        <Text style={styles.label}>Price Estimate ($)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="2500" 
          placeholderTextColor="#666" 
          keyboardType="numeric"
          value={form.price}
          onChangeText={t => setForm({...form, price: t})}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Share the details..." 
          placeholderTextColor="#666" 
          multiline
          textAlignVertical="top"
          value={form.description}
          onChangeText={t => setForm({...form, description: t})}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
           {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{isEditing ? 'Update Trip' : 'Post Trip'}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 10 },
  headerTitle: { color: 'white', fontSize: 20, fontFamily: 'Raleway_700Bold' },
  form: { padding: 20 },
  label: { color: '#ccc', marginBottom: 8, fontFamily: 'Raleway_600SemiBold', marginTop: 10 },
  input: { backgroundColor: '#1C1F2A', color: 'white', padding: 16, borderRadius: 12, fontFamily: 'Raleway_400Regular', fontSize: 16 },
  textArea: { height: 120 },
  submitBtn: { backgroundColor: '#3E6FFF', marginTop: 30, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontFamily: 'Raleway_700Bold', fontSize: 16 }
});