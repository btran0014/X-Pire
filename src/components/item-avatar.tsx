import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DEFAULT_EMOJI, emojiFor } from '@/features/products/emoji';
import { OFF_IMAGE_PREFIX } from '@/features/products/openfoodfacts';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type ItemAvatarProps = {
  name: string;
  imageUrl?: string | null;
  emoji?: string | null;
  size?: number;
};

/** Product photo when known, otherwise an emoji on a soft tile. */
export function ItemAvatar({ name, imageUrl, emoji, size = 44 }: ItemAvatarProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const showImage = !!imageUrl && imageUrl.startsWith(OFF_IMAGE_PREFIX) && !failed;
  const glyph = emoji || emojiFor(name) || DEFAULT_EMOJI;
  const box = { width: size, height: size, borderRadius: size / 4 };

  return (
    <View
      style={[styles.box, box, { backgroundColor: theme.backgroundSelected }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={[box, { backgroundColor: '#FFFFFF' }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setFailed(true)}
        />
      ) : (
        <ThemedText style={{ fontSize: size * 0.55, lineHeight: size * 0.7 }}>{glyph}</ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
