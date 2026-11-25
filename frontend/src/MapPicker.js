import { useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CITY_COORDS, inMacedonia } from './constants';

export default function MapPicker({ city, value, onClose, onConfirm }) {
  const ref = useRef(null);
  const [pin, setPin] = useState(value);
  const [lat, lng] = CITY_COORDS[city] ?? [41.6, 21.7];
  const start = value
    ? { latitude: value.latitude, longitude: value.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Location is off', 'Allow location access to jump to where you are.');
      const p = await Location.getCurrentPositionAsync({});
      const c = { latitude: p.coords.latitude, longitude: p.coords.longitude };
      setPin(c);
      ref.current?.animateToRegion({ ...c, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 400);
    } catch {
      Alert.alert('Error', 'Could not get your location.');
    }
  };

  const confirm = () => {
    if (!pin) return;
    if (!inMacedonia(pin)) return Alert.alert('Too far away', 'Pick a spot inside North Macedonia.');
    onConfirm(pin);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f6f7f4' }}>
          <View style={s.top}>
            <Pressable onPress={onClose}><Text style={s.cancel}>Cancel</Text></Pressable>
            <Text style={s.hint}>Tap the map to drop the pin</Text>
          </View>
          <MapView ref={ref} style={{ flex: 1 }} initialRegion={start} onPress={(e) => setPin(e.nativeEvent.coordinate)}>
            {pin && <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} />}
          </MapView>
          <View style={s.bottom}>
            <Pressable style={[s.btn, s.ghost]} onPress={useMyLocation}><Text style={s.ghostTxt}>📍 My location</Text></Pressable>
            <Pressable style={[s.btn, !pin && { opacity: 0.4 }]} disabled={!pin} onPress={confirm}><Text style={s.btnTxt}>Confirm location</Text></Pressable>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14 },
  cancel: { color: '#1f8a4c', fontWeight: '600', fontSize: 16 },
  hint: { color: '#6b7268' },
  bottom: { flexDirection: 'row', gap: 10, padding: 14 },
  btn: { flex: 1, backgroundColor: '#1f8a4c', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e3e6df' },
  ghostTxt: { fontWeight: '600' },
});
