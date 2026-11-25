import { Modal, View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Read-only map showing where a game is played. Anyone logged in can open it.
export default function MapViewer({ game, onClose }) {
  const coord = { latitude: game.lat, longitude: game.lng };
  const directions = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${game.lat},${game.lng}`);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7f4' }}>
          <View style={s.top}>
            <Pressable onPress={onClose}><Text style={s.close}>‹ Close</Text></Pressable>
            <Text style={s.title} numberOfLines={1}>{game.where}, {game.city}</Text>
          </View>
          <MapView style={{ flex: 1 }} initialRegion={{ ...coord, latitudeDelta: 0.01, longitudeDelta: 0.01 }}>
            <Marker coordinate={coord} title={game.where} description={game.city} />
          </MapView>
          <View style={s.bottom}>
            <Pressable style={s.btn} onPress={directions}><Text style={s.btnTxt}>🧭 Get directions</Text></Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14 },
  close: { color: '#1f8a4c', fontWeight: '600', fontSize: 16 },
  title: { flex: 1, fontWeight: '700', fontSize: 16 },
  bottom: { padding: 14 },
  btn: { backgroundColor: '#1f8a4c', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
});
