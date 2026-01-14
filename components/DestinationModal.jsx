import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DestinationModal({
  open, onClose, onPick, initialQuery = '', recent = [], onClearRecent, apiBase, title
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useMemo(() => {
    const t = setTimeout(async () => {
      const q = (query || '').trim();
      if (!q) { setResults([]); return; }
      try {
        setLoading(true);
        const r = await fetch(`${apiBase}/airports?q=${encodeURIComponent(q)}`);
        const json = await r.json();
        setResults(Array.isArray(json) ? json : []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const pick = (city, code) => onPick(`${city}, ${code}`);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[S.root, { paddingTop: insets.top }]}>
        <View style={S.header}>
          <Text style={S.title}>{title || 'Where are you flying?'}</Text>
          <View style={S.searchRow}>
            <TouchableOpacity onPress={onClose} style={{ padding: 12, marginRight: 8 }}>
              <Ionicons name="chevron-back" size={22} color="#E9EEF8" />
            </TouchableOpacity>
            <View style={S.searchBox}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="City or airport (e.g., Paris or CDG)"
                placeholderTextColor="#8A93A0"
                autoFocus
                style={{ color: '#E9EEF8' }}
              />
            </View>
          </View>
        </View>

        {!query ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={S.recentBar}>
              <Text style={S.recentTitle}>Recent Searches</Text>
              {recent.length ? (
                <TouchableOpacity onPress={onClearRecent}><Text style={{ color: '#2F6BFF' }}>Clear All</Text></TouchableOpacity>
              ) : null}
            </View>
            <View style={S.recentWrap}>
              {recent.map((r) => (
                <TouchableOpacity key={r} onPress={() => onPick(r)} style={S.recentChip}>
                  <Text style={{ color: '#E9EEF8', fontWeight: '600' }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {loading ? (
              <View style={{ padding: 16 }}><Text style={{ color: '#8A93A0' }}>Searching…</Text></View>
            ) : results.map((a) => (
              <TouchableOpacity key={`${a.code}-${a.city}`} onPress={() => pick(a.city, a.code)} style={S.resultRow}>
                <Text style={{ fontSize: 18, marginRight: 12 }}>✈️</Text>
                <View>
                  <Text style={S.resultCity}>{a.city} <Text style={{ color: '#8A93A0' }}>({a.code})</Text></Text>
                  <Text style={{ color: '#8A93A0' }}>{a.country}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const S = {
  root: { flex: 1, backgroundColor: '#0E141C' },
  header: { paddingHorizontal: 12, paddingBottom: 8 },
  title: { color: '#E9EEF8', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flex: 1, backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 12, height: 42, justifyContent: 'center' },
  recentBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentTitle: { color: '#E9EEF8', fontSize: 18, fontWeight: '700' },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  recentChip: { backgroundColor: '#0F172A', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#283142' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  resultCity: { color: '#E9EEF8', fontSize: 16, fontWeight: '600' },
};
