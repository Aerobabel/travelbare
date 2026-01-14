import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function MyToursScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyTours();
  }, []);

  const fetchMyTours = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tours')
      .select('*')
      .eq('user_id', user.id); // Only MY tours

    if (!error) setPosts(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.title}>My Tours</Text>
        <TouchableOpacity onPress={() => router.push('/add-post')}><Ionicons name="add" size={24} color="white" /></TouchableOpacity>
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
                <Text style={styles.status}>Published</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" style={{marginRight: 16}} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>You haven't posted any tours.</Text>}
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
  status: { color: '#4CAF50', fontSize: 12, marginTop: 4 },
  empty: { color: '#666', textAlign: 'center', marginTop: 50 }
});