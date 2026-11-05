import { Project } from '../types/workspace';

export const STARTER_PROJECTS: Project[] = [
  {
    id: 'proj_webapp',
    name: 'تطبيق ويب تفاعلي (Modern Web App)',
    description: 'مشروع ويب متكامل (HTML + CSS + JS) مع محرك جزيئات تفاعلي ورسوم متحركة.',
    templateType: 'web',
    activeFileId: 'file_html_1',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    files: [
      {
        id: 'file_html_1',
        name: 'index.html',
        path: '/index.html',
        isFolder: false,
        parentId: null,
        language: 'html',
        updatedAt: Date.now(),
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تطبيق تجربة الأكواد التفاعلي</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div class="container">
    <header class="app-header">
      <div class="logo-badge">⚡ بيئة التشغيل المباشرة</div>
      <h1>مرحباً بك في CodeForge Studio</h1>
      <p class="subtitle">قم بتعديل الكود البرمجي هنا وشاهد النتيجة مباشرة في المعاينة الحية.</p>
    </header>

    <div class="card interactive-box">
      <div class="controls-row">
        <button id="addParticleBtn" class="btn primary-btn">+ إضافة 20 عنصر تفاعلي</button>
        <button id="clearBtn" class="btn secondary-btn">إعادة الضبط</button>
        <button id="toggleMotionBtn" class="btn outline-btn">إيقاف / تشغيل الحركة</button>
      </div>

      <div class="metrics-bar">
        <div class="metric">
          <span class="metric-label">عدد العناصر الحية</span>
          <span id="counter" class="metric-value">50</span>
        </div>
        <div class="metric">
          <span class="metric-label">معدل الإطارات (FPS)</span>
          <span id="fpsCounter" class="metric-value">60</span>
        </div>
        <div class="metric">
          <span class="metric-label">حالة المحرك</span>
          <span id="engineStatus" class="metric-value status-active">نشط ومستقر</span>
        </div>
      </div>

      <div class="canvas-wrapper">
        <canvas id="interactiveCanvas"></canvas>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>`
      },
      {
        id: 'file_css_1',
        name: 'style.css',
        path: '/style.css',
        isFolder: false,
        parentId: null,
        language: 'css',
        updatedAt: Date.now(),
        content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #0b0f19 0%, #111827 100%);
  color: #f1f5f9;
  min-height: 100vh;
  padding: 2rem 1.5rem;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

h1 {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
  background: linear-gradient(90deg, #f8fafc, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #94a3b8;
  font-size: 1rem;
}

.card {
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
}

.controls-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.primary-btn {
  background: #38bdf8;
  color: #0f172a;
}

.primary-btn:hover {
  background: #7dd3fc;
  transform: translateY(-1px);
}

.secondary-btn {
  background: #334155;
  color: #f8fafc;
}

.secondary-btn:hover {
  background: #475569;
}

.outline-btn {
  background: transparent;
  border: 1px solid #475569;
  color: #cbd5e1;
}

.outline-btn:hover {
  border-color: #94a3b8;
  color: #fff;
}

.metrics-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  background: rgba(15, 23, 42, 0.6);
  padding: 1rem;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  font-family: monospace;
}

.status-active {
  color: #34d399;
}

.canvas-wrapper {
  width: 100%;
  height: 380px;
  background: #020617;
  border-radius: 0.75rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}`
      },
      {
        id: 'file_js_1',
        name: 'app.js',
        path: '/app.js',
        isFolder: false,
        parentId: null,
        language: 'javascript',
        updatedAt: Date.now(),
        content: `// محرك الرسوم التفاعلية في المتصفح
console.log("🚀 تم تحميل التطبيق بنجاح ومحرك الرسوم جاهز!");

const canvas = document.getElementById('interactiveCanvas');
const ctx = canvas.getContext('2d');
const counterEl = document.getElementById('counter');
const fpsEl = document.getElementById('fpsCounter');

let width = (canvas.width = canvas.parentElement.clientWidth);
let height = (canvas.height = canvas.parentElement.clientHeight);

window.addEventListener('resize', () => {
  width = canvas.width = canvas.parentElement.clientWidth;
  height = canvas.height = canvas.parentElement.clientHeight;
});

class Particle {
  constructor(x, y) {
    this.x = x || Math.random() * width;
    this.y = y || Math.random() * height;
    this.radius = Math.random() * 3 + 1.5;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#34d399'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

let particles = [];
for (let i = 0; i < 50; i++) {
  particles.push(new Particle());
}

let isRunning = true;
let lastTime = performance.now();
let frameCount = 0;
let lastFpsUpdate = performance.now();

function animate(time) {
  if (isRunning) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = \`rgba(56, 189, 248, \${(1 - dist / 100) * 0.25})\`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    // FPS Counter
    frameCount++;
    if (time - lastFpsUpdate >= 500) {
      const fps = Math.round((frameCount * 1000) / (time - lastFpsUpdate));
      fpsEl.textContent = fps;
      frameCount = 0;
      lastFpsUpdate = time;
    }
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// Event Listeners
document.getElementById('addParticleBtn').addEventListener('click', () => {
  for (let i = 0; i < 20; i++) {
    particles.push(new Particle());
  }
  counterEl.textContent = particles.length;
  console.log(\`✨ تمت إضافة عناصر جديدة! الإجمالي الآن: \${particles.length}\`);
});

document.getElementById('clearBtn').addEventListener('click', () => {
  particles = [];
  counterEl.textContent = '0';
  console.log('🧹 تم مسح العناصر بنجاح.');
});

document.getElementById('toggleMotionBtn').addEventListener('click', () => {
  isRunning = !isRunning;
  console.log(\`⏯️ حالة الحركة الآن: \${isRunning ? 'مشغلة' : 'متوقفة'}\`);
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (Math.random() > 0.6 && particles.length < 150) {
    particles.push(new Particle(mouseX, mouseY));
    counterEl.textContent = particles.length;
  }
});`
      },
      {
        id: 'file_readme_1',
        name: 'README.md',
        path: '/README.md',
        isFolder: false,
        parentId: null,
        language: 'markdown',
        updatedAt: Date.now(),
        content: `# تطبيق ويب تفاعلي (Modern Web App)

مرحباً بك في بيئة العمل البرمجية! يمكنك استخدام هذه المنصة للقيام بالتالي:

## المميزات الأساسية:
1. **رفع الأكواد والمشاريع**: يمكنك سحب وإفلات ملفاتك البرمجية، أو رفع مجلد كامل، أو ملف مضغوط \`.zip\`.
2. **تعديل الملفات بدقة**: محرر كود متطور مع دعم ترقيم الأسطر، التلوين الدلالي، والبحث والاستبدال.
3. **المعاينة الفورية**: شاشة عرض حية ومباشرة تتفاعل مع تغييراتك البرمجية لحظة بلحظة.
4. **تصدير وتحميل المشروع**: إمكانية تحميل الملف الفردي أو تحميل المشروع بالكامل في صيغة \`.zip\` في أي وقت.

جرب تغيير الألوان أو النصوص في ملف \`index.html\` و \`style.css\` وراقب النتائج في لوحة المعاينة على اليمين!`
      }
    ]
  },
  {
    id: 'proj_python',
    name: 'سكربتات بايثون (Python Sandbox)',
    description: 'بيئة لتنفيذ وتشغيل أكواد بايثون وتجربة الخوارزميات وتحليل البيانات.',
    templateType: 'python',
    activeFileId: 'file_py_1',
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now(),
    files: [
      {
        id: 'file_py_1',
        name: 'main.py',
        path: '/main.py',
        isFolder: false,
        parentId: null,
        language: 'python',
        updatedAt: Date.now(),
        content: `# بيئة تشغيل بايثون التفاعلية
import math
import json

def calculate_analytics():
    print("=" * 45)
    print("📊 بدء تشغيل المعالجة والتحليل البرمجي")
    print("=" * 45)
    
    # قائمة درجات وتجارب
    scores = [88, 92, 79, 95, 100, 84, 91, 76, 98]
    
    mean = sum(scores) / len(scores)
    variance = sum((x - mean) ** 2 for x in scores) / len(scores)
    std_dev = math.sqrt(variance)
    
    print(f"عدد العينات: {len(scores)}")
    print(f"المتوسط الحسابي: {mean:.2f}")
    print(f"التباين: {variance:.2f}")
    print(f"الانحراف المعياري: {std_dev:.2f}")
    print(f"أعلى نتيجة: {max(scores)} | أدنى نتيجة: {min(scores)}")
    
    # رسم بياني توضيحي في الطرفية
    print("\n📈 تمثيل بياني أفقي للنتائج:")
    for i, s in enumerate(scores, 1):
        bar = "█" * (s // 5)
        print(f"عينة #{i:02d} [{s:3d}]: {bar}")
        
    print("\n✅ اكتملت العمليات الحسابية بنجاح!")

# تشغيل الدالة
calculate_analytics()
`
      },
      {
        id: 'file_py_data',
        name: 'data.json',
        path: '/data.json',
        isFolder: false,
        parentId: null,
        language: 'json',
        updatedAt: Date.now(),
        content: `{
  "system": "CodeForge Environment",
  "version": "1.0.0",
  "configurations": {
    "executionMode": "sandbox",
    "timeoutMs": 5000,
    "features": [
      "file_upload",
      "zip_export",
      "live_preview",
      "terminal_console"
    ]
  }
}`
      }
    ]
  },
  {
    id: 'proj_react',
    name: 'تطبيق ريأكت تفاعلي (React Sandbox)',
    description: 'تطبيق React مع مكونات الحالة والتحكم في المهام والملاحظات.',
    templateType: 'react',
    activeFileId: 'file_react_html',
    createdAt: Date.now() - 20000000,
    updatedAt: Date.now(),
    files: [
      {
        id: 'file_react_html',
        name: 'index.html',
        path: '/index.html',
        isFolder: false,
        parentId: null,
        language: 'html',
        updatedAt: Date.now(),
        content: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>React Playground</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect } = React;

    function TodoApp() {
      const [tasks, setTasks] = useState([
        { id: 1, text: 'تحميل ملفات المشروع البرمجي', done: true },
        { id: 2, text: 'تجربة التعديل على الكود مباشرة', done: false },
        { id: 3, text: 'تصدير المشروع بصيغة ZIP', done: false }
      ]);
      const [input, setInput] = useState('');

      const addTask = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setTasks([...tasks, { id: Date.now(), text: input.trim(), done: false }]);
        setInput('');
      };

      const toggleTask = (id) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
      };

      const removeTask = (id) => {
        setTasks(tasks.filter(t => t.id !== id));
      };

      const completed = tasks.filter(t => t.done).length;

      return (
        <div className="react-card">
          <h2>قائمة المهام السريعة (React State)</h2>
          <p className="subtitle">تم إنجاز {completed} من {tasks.length} مهام</p>
          
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: \`\${tasks.length ? (completed/tasks.length)*100 : 0}%\` }}></div>
          </div>

          <form onSubmit={addTask} className="input-row">
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="اكتب مهمة جديدة ثم اضغط Enter..." 
              className="task-input"
            />
            <button type="submit" className="add-btn">إضافة</button>
          </form>

          <ul className="task-list">
            {tasks.map(t => (
              <li key={t.id} className={t.done ? 'task-item done' : 'task-item'}>
                <span onClick={() => toggleTask(t.id)} className="task-text">
                  {t.done ? '✓ ' : '○ '} {t.text}
                </span>
                <button onClick={() => removeTask(t.id)} className="del-btn">✕</button>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<TodoApp />);
  </script>
</body>
</html>`
      },
      {
        id: 'file_react_css',
        name: 'style.css',
        path: '/style.css',
        isFolder: false,
        parentId: null,
        language: 'css',
        updatedAt: Date.now(),
        content: `body {
  margin: 0;
  padding: 2rem 1rem;
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0f172a;
  color: #f8fafc;
  display: flex;
  justify-content: center;
}

.react-card {
  width: 100%;
  max-width: 500px;
  background: #1e293b;
  padding: 2rem;
  border-radius: 1rem;
  border: 1px solid #334155;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
}

h2 {
  margin-top: 0;
  margin-bottom: 0.25rem;
  font-size: 1.5rem;
}

.subtitle {
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.progress-bar-fill {
  height: 100%;
  background: #38bdf8;
  transition: width 0.3s ease;
}

.input-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.task-input {
  flex: 1;
  padding: 0.65rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #475569;
  background: #0f172a;
  color: #fff;
  outline: none;
}

.task-input:focus {
  border-color: #38bdf8;
}

.add-btn {
  padding: 0.65rem 1.2rem;
  background: #38bdf8;
  color: #0f172a;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
}

.task-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border-radius: 0.5rem;
  border: 1px solid #334155;
  cursor: pointer;
}

.task-item.done .task-text {
  text-decoration: line-through;
  color: #64748b;
}

.del-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
}

.del-btn:hover {
  color: #f87171;
}`
      }
    ]
  }
];

export const CODE_SNIPPETS = [
  {
    id: 'snip_fetch',
    title: 'Fetch API Request',
    titleAr: 'طلب بيانات عبر Fetch API',
    description: 'دالة متكاملة لجلب بيانات JSON مع معالجة الأخطاء',
    language: 'javascript',
    category: 'web',
    code: `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    console.log("✅ البيانات المستلمة:", data);
    return data;
  } catch (error) {
    console.error("❌ فشل جلب البيانات:", error.message);
  }
}`
  },
  {
    id: 'snip_debounce',
    title: 'Debounce Function',
    titleAr: 'دالة تقليل استدعاء الأحداث (Debounce)',
    description: 'منع استدعاء الدوال بكثرة أثناء الكتابة أو التمرير',
    language: 'javascript',
    category: 'utils',
    code: `function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}`
  },
  {
    id: 'snip_quick_sort',
    title: 'Quick Sort Algorithm',
    titleAr: 'خوارزمية الترتيب السريع (QuickSort)',
    description: 'ترتيب مصفوفة أرقام بكفاءة عالية O(n log n)',
    language: 'javascript',
    category: 'algorithm',
    code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[arr.length - 1];
  const left = [];
  const right = [];

  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] < pivot) {
      left.push(arr[i]);
    } else {
      right.push(arr[i]);
    }
  }

  return [...quickSort(left), pivot, ...quickSort(right)];
}

// تجربة الخوارزمية:
const sample = [64, 25, 12, 22, 11, 90];
console.log("المصفوفة المرتبة:", quickSort(sample));`
  },
  {
    id: 'snip_py_fib',
    title: 'Fibonacci Generator (Python)',
    titleAr: 'متتالية فيبوناتشي (بايثون)',
    description: 'توليد أرقام متتالية فيبوناتشي باستخدام المولدات',
    language: 'python',
    category: 'python',
    code: `def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# طباعة أول 15 رقماً:
print("أرقام فيبوناتشي الـ 15 الأولى:")
print(list(fibonacci(15)))`
  }
];
