import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { DateFieldProps } from './date-field';
import { ThemedText } from './themed-text';

/** Web version: the browser's own date input. */
export function DateField({ label, value, onChange, minimumDate }: DateFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {createElement('input', {
        type: 'date',
        value,
        min: minimumDate,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        style: {
          font: 'inherit',
          fontWeight: 600,
          padding: `${Spacing.two}px ${Spacing.three}px`,
          borderRadius: Spacing.two,
          border: 'none',
          background: theme.backgroundSelected,
          color: theme.text,
          colorScheme: 'light dark',
        },
      })}
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
});
