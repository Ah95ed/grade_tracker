/**
 * مولد صور كشوفات الدرجات النموذجية لاختبار التعرف بالذكاء الاصطناعي
 * Sample School Sheet Image Generator for Testing Semantic Column Reconciliation
 */

export function generateSampleSheetImage(): Promise<{ mimeType: string; base64Data: string; previewUrl: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;

    // الخلفية: ورقة رسمية بلون كريمي هادئ
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ترويسة الورقة
    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(40, 40, canvas.width - 80, 8);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 32px Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('كشف درجات مادة الرياضيات - الشهر الأول', canvas.width / 2, 95);

    ctx.font = 'bold 22px Tahoma, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('المرحلة: الثالث متوسط  |  الشعبة: أ  |  العام الدراسي: 2026-2027', canvas.width / 2, 140);

    // رسم الجدول
    const tableTop = 180;
    const tableLeft = 60;
    const tableWidth = canvas.width - 120;
    const rowHeight = 70;

    // الأعمدة بتسميات واقعية لاختبار المطابقة الدلالية ومنع التكرار:
    // "اسم التلاميذ" (يطابق اسم الطالب) | "الشعبة" (يطابق الشعبة) | "العلامة من 100" (يطابق الدرجة) | "هاتف ولي الأمر" (حقل جديد غير موجود)
    const cols = [
      { width: 90, label: 'ت' },
      { width: 440, label: 'اسم التلاميذ' },
      { width: 140, label: 'الشعبة' },
      { width: 250, label: 'العلامة من 100' },
      { width: 360, label: 'هاتف ولي الأمر' },
    ];

    // رأس الجدول (Header)
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(tableLeft, tableTop, tableWidth, rowHeight);

    let curX = tableLeft + tableWidth;
    ctx.font = 'bold 24px Tahoma, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';

    for (const col of cols) {
      const cellCenterX = curX - col.width / 2;
      ctx.fillText(col.label, cellCenterX, tableTop + 45);
      curX -= col.width;
      // فاصل عمودي
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(curX, tableTop);
      ctx.lineTo(curX, tableTop + rowHeight);
      ctx.stroke();
    }

    // بيانات الطلاب في الورقة
    const sampleStudents = [
      { seq: '1', name: 'أحمد علي حسن محمد', section: 'أ', score: '94', phone: '07701234567' },
      { seq: '2', name: 'مروة حيدر جاسم كاظم', section: 'أ', score: '88', phone: '07802345678' },
      { seq: '3', name: 'سيف الدين قاسم حسين', section: 'أ', score: '76', phone: '07503456789' },
      { seq: '4', name: 'زينب عبد الأمير هادي', section: 'أ', score: '98', phone: '07704567890' },
      { seq: '5', name: 'كرار مهدي صالح باقر', section: 'أ', score: '62', phone: '07805678901' },
      { seq: '6', name: 'فاطمة جواد كاظم رضا', section: 'أ', score: '85', phone: '07506789012' },
      { seq: '7', name: 'يوسف عمار سعدون خلف', section: 'أ', score: 'غائب', phone: '07707890123' },
      { seq: '8', name: 'نور الهدى إياد جبار', section: 'أ', score: '90', phone: '07808901234' },
      { seq: '9', name: 'حيدر عادل شاكر علوان', section: 'أ', score: '79', phone: '07509012345' },
    ];

    let currentY = tableTop + rowHeight;
    sampleStudents.forEach((st, idx) => {
      // خلفية السطر متبادلة
      ctx.fillStyle = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
      ctx.fillRect(tableLeft, currentY, tableWidth, rowHeight);

      // حدود أفقية
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tableLeft, currentY + rowHeight);
      ctx.lineTo(tableLeft + tableWidth, currentY + rowHeight);
      ctx.stroke();

      let cellX = tableLeft + tableWidth;
      const values = [st.seq, st.name, st.section, st.score, st.phone];

      cols.forEach((col, cIdx) => {
        const val = values[cIdx];
        ctx.fillStyle = cIdx === 1 ? '#0F172A' : cIdx === 3 ? (val === 'غائب' ? '#DC2626' : '#047857') : '#334155';
        ctx.font = cIdx === 1 ? 'bold 22px Tahoma, Arial, sans-serif' : '20px Tahoma, Arial, sans-serif';
        ctx.textAlign = 'center';

        const centerCell = cellX - col.width / 2;
        ctx.fillText(val, centerCell, currentY + 44);

        cellX -= col.width;
        // فاصل عمودي
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cellX, currentY);
        ctx.lineTo(cellX, currentY + rowHeight);
        ctx.stroke();
      });

      currentY += rowHeight;
    });

    // إطار خارجي عام للجدول
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 3;
    ctx.strokeRect(tableLeft, tableTop, tableWidth, currentY - tableTop);

    // توقيع المعلم وختم المدرسة في أسفل الورقة
    ctx.font = 'bold 20px Tahoma, Arial, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    ctx.fillText('توقيع مدرس المادة: ............................', canvas.width - 120, currentY + 70);
    ctx.textAlign = 'left';
    ctx.fillText('ختم وتوقيع إدارة المدرسة: ............................', 120, currentY + 70);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    resolve({
      mimeType: 'image/jpeg',
      base64Data: dataUrl,
      previewUrl: dataUrl,
    });
  });
}
