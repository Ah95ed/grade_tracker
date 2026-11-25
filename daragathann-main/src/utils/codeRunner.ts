import { WorkspaceFile, ConsoleLog } from '../types/workspace';

/**
 * Builds a bundled HTML document with inlined CSS and JavaScript for the preview iframe
 */
export function buildPreviewDocument(files: WorkspaceFile[]): string {
  // Find index.html or first html file
  let htmlFile = files.find(f => !f.isFolder && f.name.toLowerCase() === 'index.html');
  if (!htmlFile) {
    htmlFile = files.find(f => !f.isFolder && f.name.toLowerCase().endsWith('.html'));
  }

  // If no HTML file exists, generate a wrapper around whatever active file or files exist
  let htmlContent = htmlFile ? htmlFile.content : `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preview</title>
</head>
<body>
  <div id="root"></div>
  <div id="app"></div>
</body>
</html>`;

  // Collect all CSS files
  const cssFiles = files.filter(f => !f.isFolder && (f.language === 'css' || f.name.endsWith('.css')));
  const aggregatedCss = cssFiles.map(f => `/* ${f.name} */\n${f.content}`).join('\n\n');

  // Collect all JS/TS files
  const jsFiles = files.filter(f => !f.isFolder && (f.language === 'javascript' || f.language === 'typescript' || f.name.endsWith('.js') || f.name.endsWith('.ts')));
  
  // Find main/app script or bundle
  let mainJs = jsFiles.find(f => f.name.includes('main') || f.name.includes('app') || f.name.includes('index'));
  if (!mainJs && jsFiles.length > 0) {
    mainJs = jsFiles[0];
  }
  const aggregatedJs = jsFiles.map(f => `// ${f.name}\n${f.content}`).join('\n\n');

  // Script to inject into iframe to intercept console.log/error/warn and uncaught errors
  const consoleInterceptor = `
    <script>
      (function() {
        const _log = console.log;
        const _warn = console.warn;
        const _error = console.error;
        const _info = console.info;

        function serialize(arg) {
          try {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
            return String(arg);
          } catch (e) {
            return String(arg);
          }
        }

        function send(type, args) {
          window.parent.postMessage({
            type: 'IFRAME_CONSOLE',
            level: type,
            message: Array.from(args).map(serialize).join(' '),
            timestamp: new Date().toLocaleTimeString()
          }, '*');
        }

        console.log = function(...args) {
          _log.apply(console, args);
          send('log', args);
        };
        console.warn = function(...args) {
          _warn.apply(console, args);
          send('warn', args);
        };
        console.error = function(...args) {
          _error.apply(console, args);
          send('error', args);
        };
        console.info = function(...args) {
          _info.apply(console, args);
          send('info', args);
        };

        window.onerror = function(message, source, lineno, colno, error) {
          send('error', [message + ' (Line ' + lineno + ')']);
          return false;
        };

        window.addEventListener('unhandledrejection', function(event) {
          send('error', ['Unhandled Promise: ' + (event.reason ? event.reason.message || event.reason : 'Unknown')]);
        });
      })();
    </script>
  `;

  // Inject CSS inside <head>
  let doc = htmlContent;
  const styleTag = aggregatedCss ? `<style>\n${aggregatedCss}\n</style>` : '';
  const headInject = `${consoleInterceptor}\n${styleTag}`;

  if (doc.includes('</head>')) {
    doc = doc.replace('</head>', `${headInject}\n</head>`);
  } else {
    doc = `${headInject}\n${doc}`;
  }

  // Inject JS before </body>
  const scriptTag = aggregatedJs ? `<script>\ntry {\n${aggregatedJs}\n} catch(err) { console.error(err.message); }\n</script>` : '';
  if (doc.includes('</body>')) {
    doc = doc.replace('</body>', `${scriptTag}\n</body>`);
  } else {
    doc = `${doc}\n${scriptTag}`;
  }

  return doc;
}

/**
 * Execute standalone JavaScript code in a safe sandbox and capture all outputs
 */
export async function executeJavaScript(
  code: string,
  onLog: (log: Omit<ConsoleLog, 'id'>) => void
): Promise<{ success: boolean; result?: any; durationMs: number; error?: string }> {
  const start = performance.now();
  const capturedLogs: Omit<ConsoleLog, 'id'>[] = [];

  const customConsole = {
    log: (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      const logItem: Omit<ConsoleLog, 'id'> = {
        type: 'log',
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      };
      capturedLogs.push(logItem);
      onLog(logItem);
    },
    warn: (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      const logItem: Omit<ConsoleLog, 'id'> = {
        type: 'warn',
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      };
      capturedLogs.push(logItem);
      onLog(logItem);
    },
    error: (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      const logItem: Omit<ConsoleLog, 'id'> = {
        type: 'error',
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      };
      capturedLogs.push(logItem);
      onLog(logItem);
    },
    info: (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      const logItem: Omit<ConsoleLog, 'id'> = {
        type: 'info',
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      };
      capturedLogs.push(logItem);
      onLog(logItem);
    },
  };

  try {
    // Run inside Function wrapper with isolated console
    const runner = new Function('console', `"use strict";\n${code}`);
    const result = runner(customConsole);
    const durationMs = Math.round(performance.now() - start);

    if (result !== undefined) {
      customConsole.log('↳ Return:', result);
    }

    return {
      success: true,
      result,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    customConsole.error(err.message || 'Execution error');
    return {
      success: false,
      error: err.message,
      durationMs,
    };
  }
}

/**
 * Execute Python in the browser
 */
export async function executePython(
  code: string,
  onLog: (log: Omit<ConsoleLog, 'id'>) => void
): Promise<{ success: boolean; durationMs: number; error?: string }> {
  const start = performance.now();

  try {
    // Check if Pyodide is already loaded or load it dynamically
    let pyodide = (window as any).pyodide;
    if (!pyodide && !(window as any).loadPyodide) {
      onLog({
        type: 'system',
        message: '⚡ Loading Python Pyodide runtime (WebAssembly)...',
        timestamp: new Date().toLocaleTimeString(),
      });

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide WebAssembly script'));
        document.head.appendChild(script);
      });
    }

    if (!(window as any).pyodide && (window as any).loadPyodide) {
      (window as any).pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });
      pyodide = (window as any).pyodide;
    }

    if (pyodide) {
      // Redirect python stdout
      pyodide.setStdout({
        batched: (text: string) => {
          onLog({
            type: 'log',
            message: text,
            timestamp: new Date().toLocaleTimeString(),
          });
        },
      });
      pyodide.setStderr({
        batched: (text: string) => {
          onLog({
            type: 'error',
            message: text,
            timestamp: new Date().toLocaleTimeString(),
          });
        },
      });

      await pyodide.runPythonAsync(code);
      const durationMs = Math.round(performance.now() - start);
      return { success: true, durationMs };
    } else {
      throw new Error('Pyodide engine unavailable');
    }
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    onLog({
      type: 'error',
      message: err.message || 'Python execution failed',
      timestamp: new Date().toLocaleTimeString(),
    });
    return { success: false, durationMs, error: err.message };
  }
}
