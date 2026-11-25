import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { iconFor } from './constants';
import MapViewer from './MapViewer';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
const fmt = (iso) => {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function GameCard({ game, mine, canManage, onJoin, onEdit, onDelete }) {
  const [showMap, setShowMap] = useState(false);
  const full = game.need < 1;
  const hot = game.vibe === 'Tryhard';
  const disabled = mine || game.joined || full;
  const label = mine ? 'Your game' : game.joined ? `Joined ✓ · ${game.contact}` : full ? 'Full' : `I'm in · ${game.contact}`;
  return (
    <View style={s.card}>
      <View style={s.top}>
        <Text style={s.sport}>{iconFor(game.sport)} {game.sport}</Text>
        <Text style={[s.need, full && s.full]}>{full ? 'Full' : `Need ${game.need}`}</Text>
      </View>
      <Text style={s.meta}>📍 {game.where}, {game.city}</Text>
      {game.lat != null && (
        <Pressable onPress={() => setShowMap(true)}>
          <Text style={s.maplink}>🗺 View on map</Text>
        </Pressable>
      )}
      <Text style={s.meta}>🕒 {fmt(game.when)}  ·  by @{game.owner_name}</Text>
      <View style={s.tags}>
        <Text style={s.tag}>{game.level}</Text>
        {!!game.squad && <Text style={s.tag}>{game.squad}v{game.squad}</Text>}
        {!!game.shirt && game.shirt !== 'Any' && <Text style={s.tag}>👕 {game.shirt} shirt</Text>}
        <Text style={[s.tag, { color: hot ? '#d9480f' : '#1f8a4c', borderColor: hot ? '#d9480f' : '#1f8a4c' }]}>
          {hot ? '🔥 ' : '😄 '}{game.vibe}
        </Text>
      </View>
      {!!game.note && <Text style={s.meta}>{game.note}</Text>}
      {canManage && (
        <Text style={s.players}>
          👥 In ({(game.players || []).length}): {(game.players || []).length ? game.players.map((p) => '@' + p).join(', ') : 'nobody yet'}
        </Text>
      )}
      <Pressable style={[s.btn, disabled && !game.joined && !mine && { opacity: 0.4 }, (mine || game.joined) && s.btnSoft]} disabled={disabled} onPress={() => onJoin(game.id)}>
        <Text style={[s.btnText, (mine || game.joined) && { color: '#1f8a4c' }]}>{label}</Text>
      </Pressable>
      {canManage && (
        <View style={s.manage}>
          <Pressable onPress={() => onEdit(game)}><Text style={s.edit}>Edit</Text></Pressable>
          <Pressable onPress={() => onDelete(game)}><Text style={s.del}>Delete</Text></Pressable>
        </View>
      )}
      {showMap && <MapViewer game={game} onClose={() => setShowMap(false)} />}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e3e6df' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sport: { fontSize: 18, fontWeight: '700' },
  need: { backgroundColor: '#1f8a4c', color: '#fff', fontWeight: '600', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  full: { backgroundColor: '#e3e6df', color: '#6b7268' },
  meta: { color: '#6b7268', marginTop: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { fontSize: 12, color: '#6b7268', borderWidth: 1, borderColor: '#e3e6df', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  btn: { backgroundColor: '#1f8a4c', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 12 },
  btnSoft: { backgroundColor: '#e8f5ed' },
  btnText: { color: '#fff', fontWeight: '600' },
  maplink: { color: '#1f8a4c', fontWeight: '600', marginTop: 4 },
  players: { marginTop: 10, fontWeight: '600' },
  manage: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 10 },
  edit: { color: '#1f8a4c', fontWeight: '600' },
  del: { color: '#d9480f', fontWeight: '600' },
});
