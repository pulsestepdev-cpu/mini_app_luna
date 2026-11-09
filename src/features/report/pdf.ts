/**
 * PDF «Отчёт для врача». jsPDF и шрифт с кириллицей (PT Sans, OFL)
 * подгружаются только при нажатии кнопки — основное приложение не тяжелеет.
 */
import type { ReportData } from './report';
import { t } from '@/i18n';
import { daysWord, fmt, fmtRange } from '@/utils/date';

const PLUM: [number, number, number] = [94, 56, 150];
const INK: [number, number, number] = [43, 33, 64];
const MUTED: [number, number, number] = [133, 122, 150];

async function fontBase64(path: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(path)).arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

const d = (k: string) => fmt(k, 'd MMMM yyyy');
const symptomLabel = (key: string, custom: boolean) => (custom ? key : (t.options.symptoms as Record<string, string>)[key] ?? key);

export async function renderReportPdf(r: ReportData, opts: { notes: boolean }): Promise<Blob> {
  const [{ jsPDF }, { default: autoTable }, regular, bold] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    fontBase64('./fonts/PT_Sans-Web-Regular.ttf'),
    fontBase64('./fonts/PT_Sans-Web-Bold.ttf'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('PTSans-Regular.ttf', regular);
  doc.addFont('PTSans-Regular.ttf', 'PTSans', 'normal');
  doc.addFileToVFS('PTSans-Bold.ttf', bold);
  doc.addFont('PTSans-Bold.ttf', 'PTSans', 'bold');
  doc.setFont('PTSans', 'normal');

  const M = 16;
  const W = doc.internal.pageSize.getWidth();
  let y = M;

  // Шапка
  doc.setFillColor(...PLUM);
  doc.rect(0, 0, W, 4, 'F');
  doc.setFont('PTSans', 'bold').setFontSize(19).setTextColor(...PLUM);
  doc.text('Отчёт о менструальном цикле', M, y + 6);
  doc.setFont('PTSans', 'normal').setFontSize(10.5).setTextColor(...MUTED);
  doc.text(`${r.name ? `${r.name} · ` : ''}данные из приложения LUNA`, M, y + 12);
  doc.text(`Сформирован: ${d(r.generatedAt)}`, W - M, y + 6, { align: 'right' });
  doc.text(`Период: ${d(r.from)} — ${d(r.to)}`, W - M, y + 12, { align: 'right' });
  y += 20;

  const H = doc.internal.pageSize.getHeight();
  const BOTTOM = H - 18;
  /** Перенос на новую страницу, если блок не помещается целиком */
  const ensure = (space: number) => {
    if (y + space > BOTTOM) {
      doc.addPage();
      y = M;
    }
  };
  const ROW = 8.6;

  const section = (title: string, firstBlock = 30) => {
    ensure(8 + firstBlock);
    doc.setFont('PTSans', 'bold').setFontSize(13).setTextColor(...INK);
    doc.text(title, M, y + 5);
    y += 8;
  };
  const table = (head: string[] | null, body: (string | number)[][], widths?: number[]) => {
    // Небольшие таблицы не разрываем, у больших — хотя бы шапка + 3 строки вместе
    ensure(body.length <= 12 ? ROW * (body.length + (head ? 1 : 0)) : ROW * 4);
    autoTable(doc, {
      startY: y,
      head: head ? [head] : undefined,
      body: body.map((row) => row.map(String)),
      margin: { left: M, right: M, bottom: 18 },
      theme: head ? 'striped' : 'plain',
      styles: { font: 'PTSans', fontSize: 10.5, textColor: INK, cellPadding: 2.2 },
      headStyles: { font: 'PTSans', fontStyle: 'bold', fillColor: PLUM, textColor: 255 },
      alternateRowStyles: { fillColor: [247, 242, 252] },
      rowPageBreak: 'avoid',
      columnStyles: Object.fromEntries((widths ?? []).map((w, i) => [i, { cellWidth: w }])),
      didParseCell: (data) => {
        if (!head && data.column.index === 0) data.cell.styles.textColor = MUTED;
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  };

  // Сводка
  const s = r.summary;
  section('Сводка', ROW * 7);
  table(null, [
    ['Средняя длина цикла', s.avgCycle != null ? daysWord(s.avgCycle) : 'недостаточно данных'],
    ['Диапазон длины цикла', s.minCycle != null ? `${s.minCycle}–${daysWord(s.maxCycle!)}` : '—'],
    ['Регулярность', s.regular == null ? 'недостаточно циклов для оценки' : s.regular ? 'регулярный (разброс не более 7 дней)' : 'нерегулярный (разброс более 7 дней)'],
    ['Средняя длительность месячных', s.avgPeriod != null ? `${s.avgPeriod} дн.` : '—'],
    ['Учтено полных циклов', String(s.cycles)],
    ['Начало последних месячных', s.lastPeriodStart ? d(s.lastPeriodStart) : '—'],
    ['Ожидаемое начало следующих', s.next ? (s.next.late ? `задержка ${daysWord(s.next.late)}` : `${fmtRange(s.next.start, s.next.end)} (прогноз)`) : '—'],
  ], [70]);

  // Циклы
  section('Циклы', ROW * Math.min(r.rows.length + 1, 6));
  if (r.rows.length) {
    table(
      ['Начало месячных', 'Месячные', 'Длина цикла', 'Макс. интенсивность'],
      r.rows.map((row) => [
        d(row.start),
        row.periodLength != null ? daysWord(row.periodLength) : 'идут сейчас',
        row.cycleLength != null ? daysWord(row.cycleLength) : '—',
        t.options.flow[row.maxFlow],
      ]),
    );
  } else {
    doc.setFont('PTSans', 'normal').setFontSize(10.5).setTextColor(...MUTED);
    doc.text('За выбранный период месячные не отмечены.', M, y + 3);
    y += 10;
  }

  // Самочувствие
  section('Самочувствие', 9 + ROW * Math.min(r.symptoms.length + 1, 6));
  doc.setFont('PTSans', 'normal').setFontSize(10.5).setTextColor(...MUTED);
  doc.text(
    `Записей о самочувствии: ${r.logsCount}. Дней с умеренной болью: ${r.pain.moderate}, с сильной: ${r.pain.severe}.`,
    M,
    y + 3,
  );
  y += 9;
  if (r.symptoms.length) table(['Симптом', 'Дней отмечено'], r.symptoms.slice(0, 12).map((x) => [symptomLabel(x.key, x.custom), x.count]), [110]);
  if (r.moods.length) table(['Настроение', 'Дней отмечено'], r.moods.map((x) => [t.options.mood[x.key], x.count]), [110]);

  // Заметки — только если пользователь сам включил
  if (opts.notes && r.notes.length) {
    section('Заметки', ROW * 3);
    table(['Дата', 'Заметка'], r.notes.slice(0, 30).map((n) => [fmt(n.date, 'd MMM yyyy'), n.text]), [32]);
  }

  // Подвал на каждой странице
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('PTSans', 'normal').setFontSize(8.5).setTextColor(...MUTED);
    doc.text(
      'Данные внесены пользователем самостоятельно. Прогнозы приблизительные. Документ не является медицинским заключением.',
      M,
      H - 9,
    );
    doc.text(`${i} / ${pages}`, W - M, H - 9, { align: 'right' });
  }

  return doc.output('blob');
}
