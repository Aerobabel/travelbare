import { Dimensions, FlatList, Keyboard, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = 160;
const GAP = 20;

const data = [
  { id: '1', title: 'Smart Route', subtitle: 'Plan your journey' },
  { id: '2', title: 'Instant Booking', subtitle: 'All in one place' },
  { id: '3', title: 'Smart bus', subtitle: 'Control your trip' },
];

const ListItem = ({ title, subtitle }) => (
  <View style={styles.itemContainer}>
    <Text style={styles.titleText}>{title}</Text>
    <Text style={styles.subtitleText}>{subtitle}</Text>
  </View>
);

export default function Teasers() {
  return (
    <FlatList
      horizontal
      data={data}
      renderItem={({ item }) => <ListItem title={item.title} subtitle={item.subtitle} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToAlignment="center"
      snapToInterval={ITEM_WIDTH + GAP}      // 160 + 20
      keyboardDismissMode="on-drag"          // dismiss on first drag
      keyboardShouldPersistTaps="handled"    // let child handle the tap/drag
      onScrollBeginDrag={Keyboard.dismiss}   // extra safety: dismiss right away
    />
  );
}

const styles = StyleSheet.create({
  listContainer: { paddingHorizontal: 10 },
  itemContainer: {
    backgroundColor: '#1A2028',
    borderRadius: 16,
    padding: 20,
    width: ITEM_WIDTH,
    height: 70,
    marginHorizontal: GAP / 2,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  titleText: { color: 'white', fontSize: 16, fontFamily: 'Raleway_700Bold', marginBottom: 4, textAlign: 'center' },
  subtitleText: { color: 'rgba(255, 255, 255, 0.9)', fontSize: 12, textAlign: 'center', fontFamily: 'Raleway_400Regular'},
});
