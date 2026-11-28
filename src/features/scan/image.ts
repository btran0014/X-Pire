import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Longest side sent to the server: small enough to upload fast, large enough to read. */
export const MAX_SIDE = 1600;

export class PermissionDeniedError extends Error {}

export type ReceiptImage = { base64: string; mimeType: 'image/jpeg' };
export type PickedPhoto = { uri: string; width: number; height: number };

/** Opens the camera or photo library. Resolves null if the user cancels. */
export async function pickReceiptPhoto(source: 'camera' | 'library'): Promise<PickedPhoto | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PermissionDeniedError(
        'Camera access is off. Allow it in Settings, or choose a photo instead.',
      );
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset ? { uri: asset.uri, width: asset.width, height: asset.height } : null;
}

/** Scales the photo so its longest side is at most MAX_SIDE and re-encodes it as JPEG. */
export async function shrinkForUpload(photo: PickedPhoto): Promise<ReceiptImage> {
  const original = photo;
  const scale =
    original.width > 0 && original.height > 0
      ? Math.min(1, MAX_SIDE / Math.max(original.width, original.height))
      : 1;
  const context = ImageManipulator.manipulate(photo.uri);
  if (scale < 1) {
    context.resize(
      original.width >= original.height
        ? { width: Math.round(original.width * scale), height: null }
        : { width: null, height: Math.round(original.height * scale) },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo.');
  return { base64: saved.base64, mimeType: 'image/jpeg' };
}
