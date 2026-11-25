import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { login, register } from './api';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const fn = mode === 'login' ? login : register;
      onAuth(await fn(username.trim(), password));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.box}>
      <Text style={s.title}>⚽ Fali choek</Text>
      <Text style={s.sub}>{mode === 'login' ? 'Log in to find a game' : 'Create your account'}</Text>
      <TextInput style={s.in} placeholder="Username" autoCapitalize="none" autoCorrect={false} value={username} onChangeText={setUsername} />
      <TextInput style={s.in} placeholder="Password (min 8 characters)" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      {!!error && <Text style={s.err}>{error}</Text>}
      <Pressable style={s.btn} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>{mode === 'login' ? 'Log in' : 'Register'}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
        <Text style={s.link}>{mode === 'login' ? "No account? Register" : 'Have an account? Log in'}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sub: { textAlign: 'center', color: '#6b7268', marginBottom: 8 },
  in: { borderWidth: 1, borderColor: '#e3e6df', borderRadius: 10, padding: 14, backgroundColor: '#fff', fontSize: 16 },
  err: { color: '#d9480f' },
  btn: { backgroundColor: '#1f8a4c', borderRadius: 10, padding: 14, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
  link: { color: '#1f8a4c', textAlign: 'center', marginTop: 8, fontWeight: '600' },
});
