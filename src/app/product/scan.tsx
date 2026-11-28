import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ItemAvatar } from '@/components/item-avatar';
import { OffCredit } from '@/components/off-credit';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { normalizeBarcode } from '@/features/products/barcode';
import { lookupBarcode } from '@/features/products/lookup';
import {
  ProductLookupError,
  productItemName,
  type Product,
} from '@/features/products/openfoodfacts';
import { resolvePick } from '@/features/products/picker';
import { useTheme } from '@/hooks/use-theme';

type State =
  | { step: 'scanning' }
  | { step: 'looking'; barcode: string }
  | { step: 'found'; product: Product }
  | { step: 'missing'; barcode: string }
  | { step: 'error'; message: string };

export default function ScanBarcodeScreen() {
  const { pickId } = useLocalSearchParams<{ pickId?: string }>();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ step: 'scanning' });
  const handling = useRef(false);

  const done = (product: Product) => {
    resolvePick(pickId, product);
    router.back();
  };

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (handling.current) return;
    const barcode = normalizeBarcode(data);
    if (!barcode) return; // not a product barcode (e.g. a QR code); keep scanning
    handling.current = true;
    setState({ step: 'looking', barcode });
    try {
      const product = await lookupBarcode(barcode);
      setState(product ? { step: 'found', product } : { step: 'missing', barcode });
    } catch (error) {
      setState({
        step: 'error',
        message: error instanceof ProductLookupError ? error.message : "Couldn't look that up.",
      });
    }
  };

  const rescan = () => {
    handling.current = false;
    setState({ step: 'scanning' });
  };

  if (Platform.OS === 'web') {
    return (
      <Centered>
        <ThemedText>Barcode scanning works in the phone app.</ThemedText>
      </Centered>
    );
  }
  if (!permission) {
    return (
      <Centered>
        <ActivityIndicator color={theme.tint} />
      </Centered>
    );
  }
  if (!permission.granted) {
    return (
      <Centered>
        <ThemedText style={styles.center}>
          X-Pire needs the camera to scan product barcodes.
        </ThemedText>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
      </Centered>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={styles.flex}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={state.step === 'scanning' ? (r) => void onScanned(r) : undefined}
      />
      <View pointerEvents="none" style={styles.frameWrap}>
        <View style={[styles.frame, { borderColor: theme.tint }]} />
      </View>
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
        <ThemedView type="backgroundElement" style={styles.sheet}>
          {state.step === 'scanning' ? (
            <ThemedText style={styles.center}>
              Point the camera at the product’s barcode.
            </ThemedText>
          ) : null}
          {state.step === 'looking' ? (
            <View style={styles.row}>
              <ActivityIndicator color={theme.tint} />
              <ThemedText>Looking up {state.barcode}…</ThemedText>
            </View>
          ) : null}
          {state.step === 'found' ? (
            <>
              <View style={styles.row}>
                <ItemAvatar name={state.product.name} imageUrl={state.product.imageUrl} size={56} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{productItemName(state.product)}</ThemedText>
                  {state.product.size ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {state.product.size}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <Button label="Use this product" onPress={() => done(state.product)} />
              <Button label="Scan again" variant="secondary" onPress={rescan} />
              <OffCredit />
            </>
          ) : null}
          {state.step === 'missing' ? (
            <>
              <ThemedText style={styles.center}>
                Open Food Facts doesn’t know barcode {state.barcode} yet.
              </ThemedText>
              <Button
                label="Keep the barcode anyway"
                variant="secondary"
                onPress={() =>
                  done({
                    barcode: state.barcode,
                    name: '',
                    brand: null,
                    size: null,
                    imageUrl: null,
                  })
                }
              />
              <Button label="Scan again" onPress={rescan} />
            </>
          ) : null}
          {state.step === 'error' ? (
            <>
              <ThemedText themeColor="expired" style={styles.center}>
                {state.message}
              </ThemedText>
              <Button label="Try again" onPress={rescan} />
            </>
          ) : null}
        </ThemedView>
      </SafeAreaView>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <ThemedView style={styles.centered}>{children}</ThemedView>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: { textAlign: 'center' },
  frameWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '78%',
    aspectRatio: 1.8,
    borderWidth: 3,
    borderRadius: Spacing.three,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    margin: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
