import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ExpensesScreen() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', {ascending: false});
    if (!error) setExpenses(data);
  };

  const addExpense = async () => {
    if (!title || !amount) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('expenses').insert({
      title, 
      amount: parseFloat(amount),
      user_id: user.id
    });

    if (error) Alert.alert("Error", error.message);
    else {
      setModalVisible(false);
      setTitle(''); setAmount('');
      fetchExpenses();
    }
  };

  const total = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.title}>Expenses</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}><Ionicons name="add" size={24} color="white" /></TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Spent</Text>
        <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowAmount}>-${item.amount}</Text>
          </View>
        )}
        contentContainerStyle={{padding: 20}}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Add Expense</Text>
            <TextInput placeholder="Item Name" placeholderTextColor="#666" style={styles.input} value={title} onChangeText={setTitle} />
            <TextInput placeholder="Amount" placeholderTextColor="#666" keyboardType="numeric" style={styles.input} value={amount} onChangeText={setAmount} />
            <View style={styles.modalBtns}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text style={{color:'white'}}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={addExpense} style={styles.saveBtn}><Text style={{color:'white', fontWeight:'bold'}}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E141C' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  totalCard: { backgroundColor: '#3E6FFF', margin: 20, padding: 20, borderRadius: 16, alignItems: 'center' },
  totalLabel: { color: '#E0E0E0', fontSize: 14 },
  totalValue: { color: 'white', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1E2A3A' },
  rowTitle: { color: 'white', fontSize: 16 },
  rowAmount: { color: '#FF4D4D', fontSize: 16, fontWeight: 'bold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1C1F2A', padding: 24, borderRadius: 20 },
  modalHeader: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign:'center' },
  input: { backgroundColor: '#0E141C', color: 'white', padding: 14, borderRadius: 10, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#2C303A', alignItems: 'center', borderRadius: 10 },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#3E6FFF', alignItems: 'center', borderRadius: 10 }
});