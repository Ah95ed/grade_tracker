import sharp from 'sharp';
import fs from 'fs';

async function generate() {
  const svgBuffer = fs.readFileSync('public/icon.svg');

  // 1. Standard 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  console.log('Generated pwa-512x512.png');

  // 2. Standard 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  console.log('Generated pwa-192x192.png');

  // 3. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');
  console.log('Generated apple-touch-icon.png');

  // 4. Favicon 48x48 PNG (can also be saved as favicon.png)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile('public/favicon.png');
  console.log('Generated favicon.png');

  // 5. Maskable icon 512x512 (with 15% safe margin)
  const innerLogoSize = Math.round(512 * 0.78);
  const innerLogoBuffer = await sharp(svgBuffer).resize(innerLogoSize, innerLogoSize).png().toBuffer();
  const padding = Math.round((512 - innerLogoSize) / 2);

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 30, g: 58, b: 138, alpha: 1 } // #1e3a8a
    }
  })
  .composite([{ input: innerLogoBuffer, top: padding, left: padding }])
  .png()
  .toFile('public/pwa-maskable-512x512.png');
  console.log('Generated pwa-maskable-512x512.png');

  // 6. OpenGraph 1200x630 Social Card
  const cardLogoSize = 420;
  const cardLogoBuffer = await sharp(svgBuffer).resize(cardLogoSize, cardLogoSize).png().toBuffer();

  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a" />
          <stop offset="40%" stop-color="#1e3a8a" />
          <stop offset="100%" stop-color="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#cardBg)" />
      <circle cx="1100" cy="100" r="260" fill="#38bdf8" opacity="0.08" />
      <circle cx="100" cy="550" r="220" fill="#2dd4bf" opacity="0.08" />
      
      <text x="700" y="240" font-family="'Cairo', sans-serif, Arial" font-size="54" font-weight="900" fill="#ffffff" text-anchor="middle">دفتر درجات المعلم</text>
      <text x="700" y="310" font-family="'Cairo', sans-serif, Arial" font-size="28" font-weight="700" fill="#fbbf24" text-anchor="middle">المنظومة الذكية لرصد وإدارة الدرجات المدرسية</text>
      <text x="700" y="375" font-family="'Cairo', sans-serif, Arial" font-size="22" font-weight="500" fill="#cbd5e1" text-anchor="middle">كروت النتائج • حساب الفصول • تصدير أوفلاين</text>
      
      <rect x="550" y="425" width="300" height="52" rx="26" fill="#ffffff" opacity="0.15" />
      <text x="700" y="458" font-family="monospace, sans-serif" font-size="22" font-weight="700" fill="#ffffff" text-anchor="middle">daragato.online</text>
    </svg>
  `);

  await sharp(ogSvg)
    .composite([
      { input: cardLogoBuffer, top: 105, left: 90 }
    ])
    .png()
    .toFile('public/og-image.png');
  console.log('Generated og-image.png');
}

generate().catch(console.error);
