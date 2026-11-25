import { Platform, Text, Pressable, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');
export const fmtWhen = (d) => `${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function DateTimeField({ value, onChange, allowPast }) {
  const min = allowPast ? undefined : new Date();

  if (Platform.OS === 'ios') {
    // iOS: tapping the date opens a calendar, tapping the time opens a clock wheel
    return (
      <DateTimePicker value={value} mode="datetime" display="compact" minimumDate={min} minuteInterval={5}
        onChange={(_, d) => d && onChange(d)} style={{ alignSelf: 'flex-start' }} />
    );
  }

  // Android: calendar dialog first, then analog clock dialog
  const open = () =>
    DateTimePickerAndroid.open({
      value, mode: 'date', minimumDate: min,
      onChange: (e, day) => {
        if (e.type !== 'set' || !day) return;
        DateTimePickerAndroid.open({
          value: day, mode: 'time', is24Hour: true,
          onChange: (e2, time) => {
            if (e2.type !== 'set' || !time) return;
            const r = new Date(day);
            r.setHours(time.getHours(), time.getMinutes(), 0, 0);
            onChange(r);
          },
        });
      },
    });

  return (
    <Pressable style={s.btn} onPress={open}>
      <Text style={s.txt}>📅  {fmtWhen(value)}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { borderWidth: 1, borderColor: '#e3e6df', borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  txt: { fontSize: 16 },
});
