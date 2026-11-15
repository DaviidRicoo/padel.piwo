import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { AvatarImage } from '@/data/types';

/** Avatars are shown at 88 px at most; 512 px covers 3x screens with room to spare. */
const SIZE = 512;

/**
 * Opens the photo library (no permission prompt needed for it), lets the player
 * crop to a square on phones, then centre-crops (the web has no crop UI), shrinks
 * to 512 px and re-encodes as JPEG. That also drops the photo's EXIF data, GPS
 * included. Returns null if the player backs out.
 */
export async function pickAvatar(): Promise<AvatarImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (res.canceled || !res.assets?.length) return null;

  // the real pixel size, after any crop the player made
  const original = await ImageManipulator.manipulate(res.assets[0].uri).renderAsync();
  const side = Math.min(original.width, original.height);
  const ctx = ImageManipulator.manipulate(original);
  if (original.width !== original.height) {
    ctx.crop({ originX: Math.floor((original.width - side) / 2), originY: Math.floor((original.height - side) / 2), width: side, height: side });
  }
  if (side > SIZE) ctx.resize({ width: SIZE, height: SIZE });
  const out = await (await ctx.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!out.base64) return null;
  return { base64: out.base64.replace(/^data:[^,]*,/, ''), mimeType: 'image/jpeg' };
}
