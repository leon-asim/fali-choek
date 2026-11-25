import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, StyleSheet } from 'react-native';
import { listUsers, deleteUser } from './api';

export default function UsersScreen({ me, onBack }) {
  const [users, setUsers] = useState([]);
  const load = () => listUsers().then(setUsers).catch((e) => Alert.alert('Error', e.message));
  useEffect(() => { load(); }, []);

  const remove = (u) =>
    Alert.alert('Delete user', `Delete @${u.username} and all their games?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser(u.id).then(load).catch((e) => Alert.alert('Error', e.message)) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.head}>
        <Pressable onPress={onBack}><Text style={s.back}>‹ Back</Text></Pressable>
        <Text style={s.title}>Users ({users.length})</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item: u }) => (
          <View style={s.row}>
            <Text style={{ fontSize: 16 }}>@{u.username}{u.is_admin ? '  ·  admin' : ''}</Text>
            {u.id !== me.id && <Pressable onPress={() => remove(u)}><Text style={s.del}>Delete</Text></Pressable>}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  back: { color: '#1f8a4c', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e3e6df', padding: 14 },
  del: { color: '#d9480f', fontWeight: '600' },
});
