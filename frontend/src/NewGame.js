import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SPORTS, CITIES, LEVELS, VIBES, SHIRTS } from './constants';
import DateTimeField from './DateTimeField';
import MapPicker from './MapPicker';

const Chips = ({ items, value, onChange }) => (
  <View style={s.wrap}>
    {items.map((it) => (
      <Pressable key={it} onPress={() => onChange(it)} style={[s.chip, value === it && s.chipOn]}>
        <Text style={value === it ? s.chipTxtOn : s.chipTxt}>{it}</Text>
      </Pressable>
    ))}
  </View>
);

const defaultWhen = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return d;
};

const initialForm = (g) =>
  g
    ? { sport: g.sport, city: g.city, need: String(g.need), squad: String(g.squad), shirt: g.shirt, where: g.where,
        when: new Date(g.when), pin: g.lat != null ? { latitude: g.lat, longitude: g.lng } : null,
        level: g.level, vibe: g.vibe, contact: g.contact, note: g.note || '' }
    : { sport: 'Football', city: 'Skopje', need: '1', squad: '5', shirt: 'Any', where: '', when: defaultWhen(), pin: null,
        level: 'Casual', vibe: 'Just for fun', contact: '', note: '' };

export default function NewGame({ initial, onSubmit, onCancel }) {
  const [f, setF] = useState(() => initialForm(initial));
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false); // blocks a second tap instantly, before state updates
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (busy.current) return;
    if (!f.where.trim() || !f.contact.trim()) return Alert.alert('Check the form', 'Fill in the place name and your contact.');
    if (!f.pin) return Alert.alert('Check the form', 'Choose the location on the map.');
    if (!initial && f.when < new Date()) return Alert.alert('Check the form', 'Pick a time in the future.');
    busy.current = true;
    setSaving(true);
    try {
      await onSubmit({
      sport: f.sport, city: f.city, need: Math.max(1, parseInt(f.need, 10) || 1), squad: Math.max(1, parseInt(f.squad, 10) || 5),
      shirt: f.shirt, where: f.where.trim(), when: f.when.toISOString(), lat: f.pin.latitude, lng: f.pin.longitude,
      level: f.level, vibe: f.vibe, contact: f.contact.trim(), note: f.note.trim(),
      });
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 6 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h}>{initial ? 'Edit game' : 'New game'}</Text>
        <Text style={s.l}>Sport</Text>
        <Chips items={SPORTS.map((x) => x.name)} value={f.sport} onChange={set('sport')} />
        <Text style={s.l}>City</Text>
        <Chips items={CITIES} value={f.city} onChange={set('city')} />
        <Text style={s.l}>Players needed</Text>
        <TextInput style={s.in} keyboardType="number-pad" value={f.need} onChangeText={set('need')} />
        <Text style={s.l}>Players per squad (5 = 5v5)</Text>
        <TextInput style={s.in} keyboardType="number-pad" value={f.squad} onChangeText={set('squad')} />
        <Text style={s.l}>Shirt to bring</Text>
        <Chips items={SHIRTS} value={f.shirt} onChange={set('shirt')} />
        <Text style={s.l}>Place name (field / hall)</Text>
        <TextInput style={s.in} value={f.where} onChangeText={set('where')} placeholder="e.g. Kale field" />
        <Text style={s.l}>Location on map</Text>
        <Pressable style={[s.in, s.pin]} onPress={() => setMapOpen(true)}>
          <Text style={{ fontSize: 16 }}>
            {f.pin ? `📍 Pin set (${f.pin.latitude.toFixed(4)}, ${f.pin.longitude.toFixed(4)}) · tap to change` : '🗺 Choose on map'}
          </Text>
        </Pressable>
        <Text style={s.l}>Date and time</Text>
        <DateTimeField value={f.when} onChange={set('when')} allowPast={!!initial} />
        <Text style={s.l}>Level</Text>
        <Chips items={LEVELS} value={f.level} onChange={set('level')} />
        <Text style={s.l}>Vibe</Text>
        <Chips items={VIBES} value={f.vibe} onChange={set('vibe')} />
        <Text style={s.l}>Contact (phone / Viber / Instagram)</Text>
        <TextInput style={s.in} value={f.contact} onChangeText={set('contact')} />
        <Text style={s.l}>Note (optional)</Text>
        <TextInput style={[s.in, { height: 70 }]} multiline value={f.note} onChangeText={set('note')} />
        <Pressable style={[s.btn, saving && { opacity: 0.5 }]} disabled={saving} onPress={submit}><Text style={s.btnTxt}>{saving ? 'Saving…' : initial ? 'Save' : 'Post'}</Text></Pressable>
        <Pressable style={[s.btn, s.ghost]} onPress={onCancel}><Text style={{ fontWeight: '600' }}>Cancel</Text></Pressable>
      </ScrollView>
      {mapOpen && (
        <MapPicker city={f.city} value={f.pin} onClose={() => setMapOpen(false)}
          onConfirm={(c) => { set('pin')(c); setMapOpen(false); }} />
      )}
    </>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  l: { color: '#6b7268', fontSize: 13, marginTop: 8 },
  in: { borderWidth: 1, borderColor: '#e3e6df', borderRadius: 10, padding: 12, backgroundColor: '#fff', fontSize: 16 },
  pin: { justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e3e6df', backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#1f8a4c', borderColor: '#1f8a4c' },
  chipTxt: { color: '#1b1f1a' },
  chipTxtOn: { color: '#fff' },
  btn: { backgroundColor: '#1f8a4c', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 14 },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e3e6df', marginTop: 4 },
});
