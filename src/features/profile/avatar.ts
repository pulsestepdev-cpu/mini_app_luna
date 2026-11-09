import { getTelegram } from '@/app/telegram';
import { useLunaStore } from '@/store/useLunaStore';

/** Фото из профиля Telegram (если пользователь разрешил его показывать в настройках приватности) */
export function telegramPhotoUrl(): string | null {
  return getTelegram()?.initDataUnsafe?.user?.photo_url || null;
}

/** Имя из Telegram — чтобы подставить при знакомстве */
export function telegramFirstName(): string {
  return getTelegram()?.initDataUnsafe?.user?.first_name?.trim() ?? '';
}

/** Что показывать на аватарке: своё фото → фото из Telegram → null (буква) */
export function useAvatarSrc(): string | null {
  const photo = useLunaStore((s) => s.profile.photo);
  const useTg = useLunaStore((s) => s.profile.useTelegramPhoto ?? true);
  if (photo) return photo;
  return useTg ? telegramPhotoUrl() : null;
}

/** Своё фото: обрезка по центру в квадрат и сжатие — чтобы хранилось компактно (~20 КБ) */
export async function fileToAvatar(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('bad image'));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
