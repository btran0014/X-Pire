import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toIsoDate, type IsoDate } from '@/lib/dates';

import { ThemedText } from './themed-text';

export type DateFieldProps = {
  label: string;
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  minimumDate?: IsoDate;
};

/** Calendar-date picker: native dialog on Android, compact inline picker on iOS. */
export function DateField({ label, value, onChange, minimumDate }: DateFieldProps) {
  const theme = useTheme();
  const date = parseISO(value);
  const min = minimumDate ? parseISO(minimumDate) : undefined;

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.row}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          minimumDate={min}
          accentColor={theme.tint}
          onValueChange={(_event, picked) => onChange(toIsoDate(picked))}
        />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${format(date, 'PPP')}. Change`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            minimumDate: min,
            onValueChange: (_event, picked) => onChange(toIsoDate(picked)),
          })
        }
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
        ]}>
        <ThemedText type="smallBold">{format(date, 'EEE, MMM d, yyyy')}</ThemedText>
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
