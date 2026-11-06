const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'daragat-main', 'src');

function getTsxFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getTsxFiles(fullPath));
    } else if (item.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

const componentFiles = getTsxFiles(path.join(srcDir, 'components'));
const appFile = path.join(srcDir, 'App.tsx');
if (fs.existsSync(appFile)) {
  componentFiles.unshift(appFile);
}

console.log('Total TSX components to scan:', componentFiles.length);

const inventory = [];

for (const filePath of componentFiles) {
  const relPath = path.relative(path.join(__dirname, 'daragat-main'), filePath).replace(/\\/g, '/');
  const fileName = path.basename(filePath, '.tsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract Props interface
  let props = [];
  const propsMatch = content.match(/interface\s+(?:Props|[A-Za-z0-9]+Props)\s*\{([^}]+)\}/);
  if (propsMatch) {
    props = propsMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//') && line.includes(':'))
      .map(line => line.replace(/;$/, ''));
  }

  // Extract state variables (useState<type>?(initial))
  const stateVars = [];
  const stateRegex = /const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState/g;
  let sMatch;
  while ((sMatch = stateRegex.exec(content)) !== null) {
    stateVars.push(sMatch[1]);
  }

  // Extract hooks
  const hooks = new Set();
  const hookRegex = /\b(use[A-Z][a-zA-Z0-9_]+)\b/g;
  let hMatch;
  while ((hMatch = hookRegex.exec(content)) !== null) {
    hooks.add(hMatch[1]);
  }

  // Extract external dependencies from import statements
  const extDeps = new Set();
  const subComponents = new Set();
  const importRegex = /import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_]+))\s+from\s+['"]([^'"]+)['"]/g;
  let iMatch;
  while ((iMatch = importRegex.exec(content)) !== null) {
    const importSource = iMatch[3];
    const importedItems = (iMatch[1] || iMatch[2] || '').split(',').map(s => s.trim()).filter(Boolean);

    if (importSource.startsWith('.') || importSource.startsWith('/')) {
      // Internal import
      if (importSource.includes('components') || importSource.includes('./')) {
        importedItems.forEach(item => {
          if (/^[A-Z]/.test(item) && !item.endsWith('Type') && !item.endsWith('Props') && item !== 'React') {
            subComponents.add(item);
          }
        });
      }
    } else {
      // External package import
      extDeps.add(importSource);
    }
  }

  // Priority classification:
  // Priority 1: Core Views & Screens
  // Priority 2: Modals & Dialogs
  // Priority 3: Leaf Widgets & Cards
  let priority = 3;
  let priorityLabel = 'منخفضة (كروت وعناصر فرعية)';
  let category = 'عنصر واجهة فرعي';

  if (relPath.includes('App.tsx') || relPath.endsWith('View.tsx') || fileName === 'Header' || fileName === 'EditorArea') {
    priority = 1;
    priorityLabel = 'عالية (شاشات وتوجيه أساسي)';
    category = 'شاشة / لوحة رئيسية';
  } else if (fileName.includes('Modal') || fileName.includes('Dialog') || relPath.includes('Modal')) {
    priority = 2;
    priorityLabel = 'متوسطة (نوافذ منبثقة وحوارية)';
    category = 'نافذة منبثقة (Modal)';
  } else if (fileName.includes('Card') || fileName.includes('Item') || fileName.includes('Row') || fileName.includes('Badge')) {
    priority = 3;
    priorityLabel = 'منخفضة (كروت وبطاقات)';
    category = 'بطاقة / كرت عرض';
  }

  inventory.push({
    name: fileName,
    path: relPath,
    category,
    priority,
    priorityLabel,
    propsCount: props.length,
    props,
    stateCount: stateVars.length,
    stateVars,
    hooks: Array.from(hooks),
    subComponents: Array.from(subComponents),
    externalDependencies: Array.from(extDeps)
  });
}

// Sort by priority (1 first, then 2, then 3), then alphabetically
inventory.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

console.log('Scanned successfully. Breakdown:');
console.log('Priority 1 (Screens):', inventory.filter(i => i.priority === 1).length);
console.log('Priority 2 (Modals):', inventory.filter(i => i.priority === 2).length);
console.log('Priority 3 (Widgets/Cards):', inventory.filter(i => i.priority === 3).length);

fs.writeFileSync(path.join(__dirname, 'components_inventory_raw.json'), JSON.stringify(inventory, null, 2), 'utf8');

