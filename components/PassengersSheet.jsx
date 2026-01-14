import { Modal, Text, TouchableOpacity, View } from 'react-native';

export default function PassengersSheet({ visible, passengers, onChange, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={S.overlay}>
        <View style={S.sheet}>
          <Text style={S.header}>Passengers</Text>
          {['adults','children','infants'].map((key) => {
            const lab = key==='adults'?'Adults': key==='children'?'Children':'Infants';
            const sub = key==='adults'?'12+ years': key==='children'?'2–11 years':'Under 2 years';
            return (
              <View key={key} style={S.row}>
                <View>
                  <Text style={S.label}>{lab}</Text>
                  <Text style={S.sub}>{sub}</Text>
                </View>
                <View style={S.ctrls}>
                  <TouchableOpacity style={S.btn} onPress={() => onChange({ ...passengers, [key]: Math.max(0, passengers[key]-1) })}><Text style={S.btnText}>–</Text></TouchableOpacity>
                  <Text style={S.count}>{passengers[key]}</Text>
                  <TouchableOpacity style={S.btn} onPress={() => onChange({ ...passengers, [key]: passengers[key]+1 })}><Text style={S.btnText}>+</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
          <TouchableOpacity style={S.save} onPress={onClose}><Text style={S.saveText}>Save</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = {
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#1C2030', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 16, paddingBottom: 32 },
  header: { color: '#E9EEF8', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginVertical: 8 },
  label: { color: '#E9EEF8', fontSize: 16 },
  sub: { color: '#8A93A0', fontSize: 12, marginTop: 2 },
  ctrls: { flexDirection: 'row', alignItems: 'center' },
  btn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2A3247', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 20, lineHeight: 20 },
  count: { color: '#E9EEF8', fontSize: 16, marginHorizontal: 12 },
  save: { backgroundColor: '#2F6BFF', borderRadius: 8, padding: 14, marginHorizontal: 16, marginTop: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
};
