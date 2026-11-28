import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export type TimeFieldProps = {
  label: string;
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
};

/** Time-of-day picker: native dialog on Android, compact picker on iOS. */
export function TimeField({ label, hour, minute, onChange }: TimeFieldProps) {
  const theme = useTheme();
  const value = new Date(2000, 0, 1, hour, minute);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.row}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <DateTimePicker
          value={value}
          mode="time"
          display="compact"
          accentColor={theme.tint}
          onValueChange={(_event, picked) => onChange(picked.getHours(), picked.getMinutes())}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${format(value, 'p')}. Change`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value,
            mode: 'time',
            onValueChange: (_event, picked) => onChange(picked.getHours(), picked.getMinutes()),
          })
        }
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold">{format(value, 'p')}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 44,
  },
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
  },
});
