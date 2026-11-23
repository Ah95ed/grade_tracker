import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ImageRun,
  VerticalAlign,
} from 'docx';
import {
  SavedExamPaper,
  ExamQuestionBranch,
  ExamBranchStyle,
} from '../types/teacherPersonal';

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ARABIC_ALPHA_LABELS = [
  'أ',
  'ب',
  'ج',
  'د',
  'هـ',
  'و',
  'ز',
  'ح',
  'ط',
  'ي',
  'ك',
  'ل',
];

function toArabicDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)] ?? d);
}

function formatTextDigits(text: string, useArabicDigits: boolean): string {
  if (!useArabicDigits) return text;
  return text.replace(/\d/g, (d) => ARABIC_INDIC_DIGITS[Number(d)] ?? d);
}

function getBranchPrefix(
  branch: ExamQuestionBranch,
  index: number,
  style: ExamBranchStyle,
  useArabicDigits: boolean
): string {
  if (branch.customLabel !== undefined && branch.customLabel.trim() !== '') {
    return branch.customLabel.trim();
  }
  switch (style) {
    case 'arabic_num':
      return `${toArabicDigits(index + 1)})`;
    case 'latin_num':
      return `${index + 1})`;
    case 'arabic_alpha':
      return `${ARABIC_ALPHA_LABELS[index] || (useArabicDigits ? toArabicDigits(index + 1) : String(index + 1))})`;
    case 'dash':
      return '-';
    case 'none':
    default:
      return '';
  }
}

function dataUrlToUint8Array(dataUrl: string): {
  bytes: Uint8Array;
  type: 'png' | 'jpg';
} | null {
  try {
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const base64 = match[2];
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return {
      bytes,
      type: mime === 'png' ? 'png' : 'jpg',
    };
  } catch {
    return null;
  }
}

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

function rtlRun(
  text: string,
  options?: {
    bold?: boolean;
    sizeHalfPt?: number;
    color?: string;
  }
): TextRun {
  return new TextRun({
    text,
    bold: options?.bold,
    size: options?.sizeHalfPt ?? 26, // 13pt default
    color: options?.color ?? '000000',
    rightToLeft: true,
    font: {
      name: 'Arial',
      cs: 'Arial',
    },
  });
}

function multilineRuns(
  text: string,
  options?: {
    bold?: boolean;
    sizeHalfPt?: number;
    color?: string;
  }
): TextRun[] {
  const lines = text.split(/\r?\n/);
  const runs: TextRun[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) {
      runs.push(new TextRun({ break: 1 }));
    }
    runs.push(rtlRun(line, options));
  });
  return runs;
}

export async function exportExamPaperToWord(paper: SavedExamPaper): Promise<void> {
  const digits = paper.useArabicDigits;
  const baseSize =
    paper.fontSize === 'sm' ? 23 : paper.fontSize === 'lg' ? 30 : 26; // half-points (11.5pt / 13pt / 15pt)

  const h = paper.header;
  const cleanRightLines = (h.rightLines || [])
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const cleanLeftLines = (h.leftLines || [])
    .map((l) => l.trim())
    .filter((l) => l !== '');

  const parsedLogo =
    h.showLogo && h.logoDataUrl ? dataUrlToUint8Array(h.logoDataUrl) : null;

  const children: Array<Paragraph | Table> = [];

  // 1. Header Table (Right lines | Center Logo | Left lines)
  const headerBottomBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
  };

  const rightCellParagraphs =
    cleanRightLines.length > 0
      ? cleanRightLines.map(
          (line) =>
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.RIGHT,
              spacing: { after: 50 },
              children: [
                rtlRun(formatTextDigits(line, digits), {
                  bold: true,
                  sizeHalfPt: baseSize,
                }),
              ],
            })
        )
      : [new Paragraph({ bidirectional: true, children: [rtlRun('')] })];

  const centerCellParagraphs = parsedLogo
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new ImageRun({
              data: parsedLogo.bytes,
              type: parsedLogo.type,
              transformation: {
                width: 68,
                height: 68,
              },
            }),
          ],
        }),
      ]
    : [new Paragraph({ children: [rtlRun('')] })];

  const leftCellParagraphs =
    cleanLeftLines.length > 0
      ? cleanLeftLines.map(
          (line) =>
            new Paragraph({
              bidirectional: true,
              alignment: AlignmentType.LEFT,
              spacing: { after: 50 },
              children: [
                rtlRun(formatTextDigits(line, digits), {
                  bold: true,
                  sizeHalfPt: baseSize,
                }),
              ],
            })
        )
      : [new Paragraph({ bidirectional: true, children: [rtlRun('')] })];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: true,
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: headerBottomBorder,
              margins: { bottom: 100 },
              children: rightCellParagraphs,
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: headerBottomBorder,
              margins: { bottom: 100 },
              children: centerCellParagraphs,
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              borders: headerBottomBorder,
              margins: { bottom: 100 },
              children: leftCellParagraphs,
            }),
          ],
        }),
      ],
    })
  );

  // 2. Student Info Row (if enabled)
  if (h.showStudentInfo) {
    const nameLbl = h.studentNameLabel?.trim() || 'اسم الطالب :';
    const numLbl = h.studentNumberLabel?.trim() || 'الرقم الامتحاني :';
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        visuallyRightToLeft: true,
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 55, type: WidthType.PERCENTAGE },
                borders: {
                  ...NO_BORDERS,
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' },
                },
                margins: { top: 80, bottom: 80 },
                children: [
                  new Paragraph({
                    bidirectional: true,
                    children: [
                      rtlRun(`${formatTextDigits(nameLbl, digits)}  ........................................`, {
                        bold: true,
                        sizeHalfPt: baseSize - 2,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 45, type: WidthType.PERCENTAGE },
                borders: {
                  ...NO_BORDERS,
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: '888888' },
                },
                margins: { top: 80, bottom: 80 },
                children: [
                  new Paragraph({
                    bidirectional: true,
                    children: [
                      rtlRun(`${formatTextDigits(numLbl, digits)}  ........................`, {
                        bold: true,
                        sizeHalfPt: baseSize - 2,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  }

  // 3. General Note (if visible and non-empty)
  if (h.showNote && h.noteText.trim() !== '') {
    children.push(
      new Paragraph({
        bidirectional: true,
        spacing: { before: 140, after: 120 },
        children: multilineRuns(formatTextDigits(h.noteText.trim(), digits), {
          bold: true,
          sizeHalfPt: baseSize + 1,
        }),
      })
    );
  } else {
    children.push(
      new Paragraph({
        bidirectional: true,
        spacing: { before: 80, after: 40 },
        children: [rtlRun('')],
      })
    );
  }

  // 4. Questions & Branches
  for (const q of paper.questions) {
    const hasPrompt = q.prompt.trim() !== '';
    const nonEmptyBranches = q.branches.filter(
      (b) => b.text.trim() !== '' || (b.customLabel && b.customLabel.trim() !== '')
    );

    if (!hasPrompt && nonEmptyBranches.length === 0) continue;

    const qRuns: TextRun[] = [];
    if (q.label.trim() !== '') {
      qRuns.push(
        rtlRun(`${formatTextDigits(q.label.trim(), digits)} : `, {
          bold: true,
          sizeHalfPt: baseSize,
        })
      );
    }
    if (hasPrompt) {
      qRuns.push(
        ...multilineRuns(formatTextDigits(q.prompt.trim(), digits), {
          bold: true,
          sizeHalfPt: baseSize,
        })
      );
    }
    if (q.marks && q.marks.trim() !== '') {
      qRuns.push(
        rtlRun(`   (${formatTextDigits(q.marks.trim(), digits)})`, {
          bold: true,
          sizeHalfPt: baseSize - 2,
          color: '333333',
        })
      );
    }

    children.push(
      new Paragraph({
        bidirectional: true,
        spacing: { before: 140, after: 60 },
        children: qRuns,
      })
    );

    if (nonEmptyBranches.length > 0) {
      if (q.branchLayout === 'inline') {
        const inlineStr = nonEmptyBranches
          .map((b, bIdx) => {
            const prefix = getBranchPrefix(b, bIdx, q.branchStyle, digits);
            const body = formatTextDigits(b.text.trim(), digits);
            const sep = bIdx < nonEmptyBranches.length - 1 ? ' ، ' : ' .';
            return `${prefix ? `${prefix} ` : ''}${body}${sep}`;
          })
          .join('');

        children.push(
          new Paragraph({
            bidirectional: true,
            indent: { start: 360 },
            spacing: { after: 80 },
            children: [
              rtlRun(inlineStr, {
                bold: false,
                sizeHalfPt: baseSize,
              }),
            ],
          })
        );
      } else if (q.branchLayout === 'two_col') {
        const rows: TableRow[] = [];
        for (let i = 0; i < nonEmptyBranches.length; i += 2) {
          const b1 = nonEmptyBranches[i];
          const b2 = nonEmptyBranches[i + 1];
          const p1 = getBranchPrefix(b1, i, q.branchStyle, digits);
          const cell1Text = `${p1 ? `${p1} ` : ''}${formatTextDigits(b1.text.trim(), digits)}`;

          const cell2Text = b2
            ? (() => {
                const p2 = getBranchPrefix(b2, i + 1, q.branchStyle, digits);
                return `${p2 ? `${p2} ` : ''}${formatTextDigits(b2.text.trim(), digits)}`;
              })()
            : '';

          rows.push(
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  margins: { top: 30, bottom: 30, left: 100, right: 200 },
                  children: [
                    new Paragraph({
                      bidirectional: true,
                      children: multilineRuns(cell1Text, { sizeHalfPt: baseSize }),
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  margins: { top: 30, bottom: 30, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      bidirectional: true,
                      children: multilineRuns(cell2Text, { sizeHalfPt: baseSize }),
                    }),
                  ],
                }),
              ],
            })
          );
        }

        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            visuallyRightToLeft: true,
            borders: {
              ...NO_BORDERS,
              insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
            },
            rows,
          })
        );
      } else {
        nonEmptyBranches.forEach((b, bIdx) => {
          const prefix = getBranchPrefix(b, bIdx, q.branchStyle, digits);
          const branchRuns: TextRun[] = [];
          if (prefix) {
            branchRuns.push(
              rtlRun(`${prefix} `, {
                bold: true,
                sizeHalfPt: baseSize,
              })
            );
          }
          branchRuns.push(
            ...multilineRuns(formatTextDigits(b.text.trim(), digits), {
              bold: false,
              sizeHalfPt: baseSize,
            })
          );
          children.push(
            new Paragraph({
              bidirectional: true,
              indent: { start: 360 },
              spacing: { after: 60 },
              children: branchRuns,
            })
          );
        });
      }
    }
  }

  // 5. Footer (if non-empty)
  if (h.footerText && h.footerText.trim() !== '') {
    children.push(
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 280 },
        children: [
          rtlRun(formatTextDigits(h.footerText.trim(), digits), {
            bold: true,
            sizeHalfPt: baseSize - 2,
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906, // A4 width in twips
              height: 16838, // A4 height in twips
            },
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const safeName = (paper.title.trim() || 'اسئلة-الامتحان')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();

  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
