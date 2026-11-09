/**
 * Отдать файл пользователю: системное меню «Поделиться» (можно сохранить
 * в Файлы, отправить врачу в мессенджер), иначе — обычное скачивание.
 *
 * Внутри Telegram скачивание из WebView работает не везде; надёжный путь —
 * отправка файла ботом в чат, появится вместе с backend.
 */
export type DeliverResult = 'shared' | 'downloaded' | 'cancelled';

export async function deliverFile(blob: Blob, filename: string, title: string): Promise<DeliverResult> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  // На ПК удобнее обычное скачивание; меню «Поделиться» — для телефонов
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
      // иначе пробуем скачать
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
