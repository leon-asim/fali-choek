import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ScrollView, Alert, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { SPORTS, CITIES } from '../constants';
import * as api from '../api';
import GameCard from '../GameCard';
import NewGame from '../NewGame';
import AuthScreen from '../AuthScreen';
import UsersScreen from '../UsersScreen';

const Chip = ({ label, on, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
    <Text style={on ? s.chipTxtOn : s.chipTxt}>{label}</Text>
  </Pressable>
);

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [sport, setSport] = useState('All');
  const [city, setCity] = useState('All');
  const [screen, setScreen] = useState('feed'); // feed | form | users
  const [editing, setEditing] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const logout = useCallback(async () => {
    await api.setToken(null);
    setUser(null);
    setGames([]);
    setScreen('feed');
  }, []);

  const fail = useCallback((e) => {
    if (e.status === 401) logout();
    Alert.alert('Error', e.message);
  }, [logout]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { setGames(await api.listGames()); } catch (e) { fail(e); } finally { setRefreshing(false); }
  }, [fail]);

  useEffect(() => {
    (async () => {
      if (await api.loadToken()) {
        try { setUser(await api.me()); } catch { await api.setToken(null); }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const onAuth = async ({ token, user: u }) => { await api.setToken(token); setUser(u); };

  const save = async (g) => {
    try {
      if (editing) await api.updateGame(editing.id, g); else await api.createGame(g);
      setScreen('feed'); setEditing(null); refresh();
    } catch (e) { fail(e); }
  };

  const join = (game) =>
    Alert.alert('Join this game?', `${game.sport} in ${game.city}. Contact: ${game.contact}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: "I'm in", onPress: () => api.joinGame(game.id).then(refresh).catch(fail) },
    ]);

  const remove = (game) =>
    Alert.alert('Delete game', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => api.deleteGame(game.id).then(refresh).catch(fail) },
    ]);

  const shown = useMemo(
    () => games.filter((g) => (sport === 'All' || g.sport === sport) && (city === 'All' || g.city === city)),
    [games, sport, city]
  );

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.root}>
        <StatusBar barStyle="dark-content" />
        {!user ? (
          <AuthScreen onAuth={onAuth} />
        ) : screen === 'form' ? (
          <NewGame initial={editing} onCancel={() => { setScreen('feed'); setEditing(null); }} onSubmit={save} />
        ) : screen === 'users' ? (
          <UsersScreen me={user} onBack={() => setScreen('feed')} />
        ) : (
          <>
            <View style={s.header}>
              <View style={s.bar}>
                <Text style={s.title}>⚽ Fali choek</Text>
                <View style={s.barRight}>
                  {user.is_admin && <Pressable onPress={() => setScreen('users')}><Text style={s.link}>Users</Text></Pressable>}
                  <Pressable onPress={logout}><Text style={s.link}>Log out</Text></Pressable>
                </View>
              </View>
              <Text style={s.who}>@{user.username}{user.is_admin ? ' · admin' : ''}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
                <Chip label="✨ All" on={sport === 'All'} onPress={() => setSport('All')} />
                {SPORTS.map((x) => <Chip key={x.name} label={`${x.icon} ${x.name}`} on={sport === x.name} onPress={() => setSport(x.name)} />)}
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
                <Chip label="All cities" on={city === 'All'} onPress={() => setCity('All')} />
                {CITIES.map((c) => <Chip key={c} label={c} on={city === c} onPress={() => setCity(c)} />)}
              </ScrollView>
            </View>
            <FlatList
              data={shown}
              keyExtractor={(g) => String(g.id)}
              refreshing={refreshing}
              onRefresh={refresh}
              contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <GameCard
                  game={item}
                  mine={item.owner_id === user.id}
                  canManage={user.is_admin || item.owner_id === user.id}
                  onJoin={() => join(item)}
                  onEdit={(g) => { setEditing(g); setScreen('form'); }}
                  onDelete={remove}
                />
              )}
              ListEmptyComponent={<Text style={s.empty}>No games here yet. Be the first to post one.</Text>}
            />
            <Pressable style={s.fab} onPress={() => { setEditing(null); setScreen('form'); }}>
              <Text style={s.fabTxt}>+ Post a game</Text>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6f7f4' },
  header: { paddingTop: 12 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  barRight: { flexDirection: 'row', gap: 16 },
  link: { color: '#1f8a4c', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700' },
  who: { color: '#6b7268', paddingHorizontal: 16, marginBottom: 8 },
  row: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { borderWidth: 1, borderColor: '#e3e6df', backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#1f8a4c', borderColor: '#1f8a4c' },
  chipTxt: { color: '#1b1f1a' },
  chipTxtOn: { color: '#fff' },
  empty: { textAlign: 'center', color: '#6b7268', marginTop: 40 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#1f8a4c', borderRadius: 99, paddingHorizontal: 20, paddingVertical: 14, elevation: 4 },
  fabTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
