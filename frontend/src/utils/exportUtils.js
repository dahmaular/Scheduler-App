import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import jsPDF from 'jspdf';

dayjs.extend(isoWeek);

// ── Colours matching the app's CalendarView ───────────────────────────────
const COLORS = {
  headerBg:   [30,  41,  59],   // dark slate  — week column header
  headerText: [255, 255, 255],
  rowLabelC:  [15,  76, 117],   // dark blue   — Wednesday label
  rowLabelA:  [109, 40, 217],   // purple      — 1st & 2nd label
  rowLabelB:  [3,   105, 161],  // teal-blue   — 3rd service label
  cellDateC:  [2,   132, 199],  // Wednesday date bar
  cellBgC:    [240, 249, 255],  // Wednesday cell bg
  cellDateA:  [109, 40, 217],   // 1st&2nd date bar
  cellBgA:    [245, 243, 255],  // 1st&2nd cell bg
  cellDateB:  [3,   105, 161],  // 3rd service date bar
  cellBgB:    [240, 253, 250],  // 3rd service cell bg
  memberBg:   [255, 255, 255],
  memberText: [30,  41,  59],
  border:     [203, 213, 225],
  emptyText:  [203, 213, 225],
};

const ROW_CFG = {
  C: { label: 'WEDNESDAY',         labelColor: COLORS.rowLabelC, dateBg: COLORS.cellDateC, cellBg: COLORS.cellBgC },
  A: { label: '1ST & 2ND\nSERVICE', labelColor: COLORS.rowLabelA, dateBg: COLORS.cellDateA, cellBg: COLORS.cellBgA },
  B: { label: '3RD\nSERVICE',       labelColor: COLORS.rowLabelB, dateBg: COLORS.cellDateB, cellBg: COLORS.cellBgB },
};
const ROW_ORDER = ['C', 'A', 'B'];

// ── Shared grouping logic ─────────────────────────────────────────────────
function groupByWeek(schedules) {
  const weekMap = new Map();
  for (const entry of schedules) {
    const d = dayjs(entry.date);
    const weekKey = `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, { weekKey, days: {} });
    const week = weekMap.get(weekKey);
    const t = entry.serviceType;
    if (!week.days[t]) week.days[t] = { date: entry.date, members: [] };
    if (entry.member?.name) {
      const list = week.days[t].members;
      list.push({ name: entry.member.name, isLead: list.length === 0 });
    }
  }
  const sorted = [...weekMap.values()].sort((a, b) => (a.weekKey > b.weekKey ? 1 : -1));
  return sorted.map((w, idx) => ({
    ...w,
    weekLabel: `WEEK ${idx + 1}`,
    headerDate: w.days['A']?.date ?? w.days['B']?.date ?? w.days['C']?.date ?? null,
  }));
}

// ── CSV — calendar-grid layout ────────────────────────────────────────────
export function exportCSV(schedules, filename = 'schedule') {
  const weeks = groupByWeek(schedules);
  if (!weeks.length) return;

  const lines = [];

  // Header row: label col + week labels
  lines.push(['SERVICE', ...weeks.map((w) => w.weekLabel)].map((c) => `"${c}"`).join(','));

  // Sub-header: blank + Sunday dates (header date = Sunday for A/B rows)
  lines.push([
    'DATE',
    ...weeks.map((w) => (w.headerDate ? dayjs(w.headerDate).format('D MMM YYYY') : '')),
  ].map((c) => `"${c}"`).join(','));

  // One block per service type
  for (const type of ROW_ORDER) {
    const label = ROW_CFG[type].label.replace('\n', ' ');

    // Date row for this service type (Wednesday shows its own date; A/B show Sunday date)
    lines.push([
      `${label} — DATE`,
      ...weeks.map((w) => {
        const d = w.days[type]?.date;
        return d ? dayjs(d).format('D MMM YYYY') : '';
      }),
    ].map((c) => `"${c}"`).join(','));

    // Member rows (index 0 = team lead, annotated with ★)
    for (let mi = 0; mi < 3; mi++) {
      const rowLabel = mi === 0 ? `${label} — ★ TEAM LEAD` : `${label} — MEMBER ${mi + 1}`;
      lines.push([
        rowLabel,
        ...weeks.map((w) => w.days[type]?.members[mi]?.name ?? ''),
      ].map((c) => `"${c}"`).join(','));
    }

    // Blank separator between service blocks
    lines.push([]);
  }

  // Legend note
  lines.push(['"★ = Team Lead for that service"']);

  const blob = new Blob([lines.map((l) => (Array.isArray(l) ? l.join(',') : l)).join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF — calendar grid drawn with jsPDF primitives ───────────────────────
export function exportPDF(schedules, filename = 'schedule', title = 'Service Schedule') {
  const weeks = groupByWeek(schedules);
  if (!weeks.length) return;

  // Layout constants (mm)
  const PAGE_W       = 297;   // A4 landscape width
  const PAGE_H       = 210;   // A4 landscape height
  const MARGIN       = 10;
  const LABEL_W      = 28;    // row-label column width
  const HEADER_H     = 14;    // week column header height
  const DATE_BAR_H   = 6;     // coloured date bar inside a cell
  const MEMBER_H     = 5.5;   // height per member line
  const CELL_PAD     = 1.5;
  const ROW_GAP      = 2;     // gap between service rows

  const usableW = PAGE_W - MARGIN * 2 - LABEL_W;
  const colW    = usableW / weeks.length;

  // Pre-calculate row heights (3 members + date bar + padding)
  const CELL_H = DATE_BAR_H + MEMBER_H * 3 + CELL_PAD * 2;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Helper: set fill + draw rect
  const fillRect = (x, y, w, h, rgb) => {
    doc.setFillColor(...rgb);
    doc.rect(x, y, w, h, 'F');
  };

  // Helper: draw border rect
  const strokeRect = (x, y, w, h, rgb = COLORS.border) => {
    doc.setDrawColor(...rgb);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h, 'S');
  };

  // Helper: clipped text
  const clipText = (text, x, y, maxW, fontSize, rgb, align = 'left') => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...rgb);
    const safe = doc.splitTextToSize(String(text), maxW)[0] ?? '';
    if (align === 'center') {
      doc.text(safe, x + maxW / 2, y, { align: 'center' });
    } else {
      doc.text(safe, x, y);
    }
  };

  // ── Title ──────────────────────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.headerBg);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), MARGIN, MARGIN + 5);

  // date range subtitle
  const allDates = schedules.map((s) => dayjs(s.date));
  const minD = allDates.reduce((a, b) => (a.isBefore(b) ? a : b));
  const maxD = allDates.reduce((a, b) => (a.isAfter(b)  ? a : b));
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`${minD.format('D MMM YYYY')} – ${maxD.format('D MMM YYYY')}`, MARGIN, MARGIN + 10);

  // ── Column headers (WEEK 1, WEEK 2 …) ─────────────────────────────────
  const gridStartY = MARGIN + 15;
  const x0 = MARGIN + LABEL_W; // x where grid columns start

  // corner cell
  fillRect(MARGIN, gridStartY, LABEL_W, HEADER_H, COLORS.headerBg);

  weeks.forEach((w, i) => {
    const cx = x0 + i * colW;
    fillRect(cx, gridStartY, colW, HEADER_H, COLORS.headerBg);
    strokeRect(cx, gridStartY, colW, HEADER_H, [50, 65, 85]);

    // WEEK label
    clipText(w.weekLabel, cx, gridStartY + 4.5, colW - 2, 7, COLORS.headerText, 'center');
    // Date
    const dateStr = w.headerDate ? dayjs(w.headerDate).format('D MMM YYYY') : '';
    clipText(dateStr, cx, gridStartY + 9.5, colW - 2, 6, [148, 163, 184], 'center');
  });

  // ── Rows ───────────────────────────────────────────────────────────────
  let curY = gridStartY + HEADER_H + ROW_GAP;

  for (const type of ROW_ORDER) {
    const cfg = ROW_CFG[type];

    // Row label cell
    fillRect(MARGIN, curY, LABEL_W, CELL_H, cfg.labelColor);
    // Centred multi-line label
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.headerText);
    const labelLines = cfg.label.split('\n');
    const lineH = 4.5;
    const totalLH = labelLines.length * lineH;
    const labelY = curY + (CELL_H - totalLH) / 2 + lineH - 1;
    labelLines.forEach((line, li) => {
      doc.text(line, MARGIN + LABEL_W / 2, labelY + li * lineH, { align: 'center' });
    });

    // Week cells
    weeks.forEach((w, i) => {
      const cx = x0 + i * colW;
      const day = w.days[type];

      // Cell background
      fillRect(cx, curY, colW, CELL_H, cfg.cellBg);
      strokeRect(cx, curY, colW, CELL_H);

      if (day) {
        // Date bar
        fillRect(cx, curY, colW, DATE_BAR_H, cfg.dateBg);
        clipText(
          dayjs(day.date).format('D MMM. YYYY'),
          cx, curY + DATE_BAR_H - 1.2,
          colW - 2, 5.5, COLORS.headerText, 'center'
        );

        // Members
        day.members.slice(0, 3).forEach((member, mi) => {
          const my = curY + DATE_BAR_H + CELL_PAD + mi * MEMBER_H + MEMBER_H - 1;
          const pillBg = member.isLead ? [239, 68, 68] : [240, 242, 248]; // red for lead
          const textRgb = member.isLead ? [255, 255, 255] : COLORS.memberText;
          // Member pill bg
          fillRect(cx + 1.5, curY + DATE_BAR_H + CELL_PAD + mi * MEMBER_H, colW - 3, MEMBER_H - 0.8, pillBg);
          doc.setFontSize(6);
          doc.setFont('helvetica', member.isLead ? 'bold' : 'normal');
          doc.setTextColor(...textRgb);
          const maxNameW = colW - 5;
          const safeName = doc.splitTextToSize(member.name, maxNameW)[0] ?? member.name;
          doc.text(safeName, cx + 3, my);
        });
      } else {
        // Empty
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.emptyText);
        doc.text('—', cx + colW / 2, curY + CELL_H / 2 + 1, { align: 'center' });
      }
    });

    curY += CELL_H + ROW_GAP;

    // Page break if needed
    if (curY + CELL_H > PAGE_H - MARGIN && type !== ROW_ORDER[ROW_ORDER.length - 1]) {
      doc.addPage();
      curY = MARGIN + 5;
    }
  }

  // ── Legend ─────────────────────────────────────────────────────────────
  // Draw on the last page
  const legendY = curY + 2;
  // Red swatch
  fillRect(MARGIN, legendY, 4, 3.5, [239, 68, 68]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('= Team Lead for that service', MARGIN + 5.5, legendY + 2.8);

  // ── Page numbers ───────────────────────────────────────────────────────
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });
  }

  doc.save(`${filename}.pdf`);
}

