import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function FavoritesScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Join Favorites with Tours
    const { data, error } = await supabase
      .from('favorites')
      .select('tour_id, tours(*)') // Get the tour details
      .eq('user_id', user.id);

    if (!error) {
      // Flatten the structure
      setPosts(data.map(f => f.tours));
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.title}>My Favorites</Text>
        <View style={{width: 24}} />
      </View>

      {loading ? <ActivityIndicator color="#3E6FFF" /> : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push({ pathname: '/post-details', params: { item: JSON.stringify(item) } })}
            >
              <Image source={{ uri: item.image_url }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardPrice}>{item.price}</Text>
              </View>
              <Ionicons name="heart" size={24} color="#FF4D4D" style={{marginRight: 16}} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No favorites yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1F2A', marginHorizontal: 20, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
  image: { width: 80, height: 80 },
  info: { flex: 1, padding: 12 },
  cardTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cardPrice: { color: '#3E6FFF', marginTop: 4 },
  empty: { color: '#666', textAlign: 'center', marginTop: 50 }
});