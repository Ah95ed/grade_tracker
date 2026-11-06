const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'daragat-main', 'src');

function getAllFiles(dir, exts = ['.tsx', '.ts', '.css']) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(item.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = getAllFiles(srcDir);

const hexColors = new Set();
const rgbaColors = new Set();
const roundedClasses = new Set();
const shadowClasses = new Set();
const textSizes = new Set();
const fontWeights = new Set();
const spacingClasses = new Set();
const tailwindColors = new Set();
const breakpoints = new Set();

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
const rgbaRegex = /rgba?\([^)]+\)/g;
const roundedRegex = /\brounded(?:-[a-zA-Z0-9]+)?\b/g;
const shadowRegex = /\bshadow(?:-[a-zA-Z0-9]+)?\b/g;
const textRegex = /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/g;
const fontRegex = /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g;
const twColorRegex = /\b(?:bg|text|border|ring|stroke|fill)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;
const bpRegex = /\b(?:sm|md|lg|xl|2xl):[^\s"']+/g;

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  (content.match(hexRegex) || []).forEach(c => hexColors.add(c.toUpperCase()));
  (content.match(rgbaRegex) || []).forEach(c => rgbaColors.add(c));
  (content.match(roundedRegex) || []).forEach(c => roundedClasses.add(c));
  (content.match(shadowRegex) || []).forEach(c => shadowClasses.add(c));
  (content.match(textRegex) || []).forEach(c => textSizes.add(c));
  (content.match(fontRegex) || []).forEach(c => fontWeights.add(c));
  (content.match(twColorRegex) || []).forEach(c => tailwindColors.add(c));
  (content.match(bpRegex) || []).forEach(c => {
    const bp = c.split(':')[0];
    breakpoints.add(bp);
  });
}

console.log('Hex Colors count:', hexColors.size);
console.log('Hex Colors:', Array.from(hexColors).sort());
console.log('Tailwind Colors count:', tailwindColors.size);
console.log('Rounded:', Array.from(roundedClasses).sort());
console.log('Shadows:', Array.from(shadowClasses).sort());
console.log('Text Sizes:', Array.from(textSizes).sort());
console.log('Font Weights:', Array.from(fontWeights).sort());
console.log('Breakpoints:', Array.from(breakpoints).sort());

