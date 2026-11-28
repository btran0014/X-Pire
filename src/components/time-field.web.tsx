import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import type { TimeFieldProps } from './time-field';

const pad = (n: number) => String(n).padStart(2, '0');

/** Web version: the browser's own time input. */
export function TimeField({ label, hour, minute, onChange }: TimeFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {createElement('input', {
        type: 'time',
        value: `${pad(hour)}:${pad(minute)}`,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => {
          const [h, m] = e.target.value.split(':').map(Number);
          if (Number.isFinite(h) && Number.isFinite(m)) onChange(h!, m!);
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
