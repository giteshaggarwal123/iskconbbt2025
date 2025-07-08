
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('Main - Application starting...');
console.log('Main - Environment:', {
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  url: window.location.href,
  pathname: window.location.pathname,
  hash: window.location.hash,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString(),
  isCapacitor: !!window.Capacitor,
  isNative: window.Capacitor?.isNative || false
});

// Enhanced error handling
window.addEventListener('error', (event) => {
  console.error('Main - Global error caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack,
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Main - Unhandled promise rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack,
    timestamp: new Date().toISOString()
  });
});

// Check for required elements
const rootElement = document.getElementById("root");
console.log('Main - Root element check:', {
  found: !!rootElement,
  id: rootElement?.id,
  tagName: rootElement?.tagName
});

if (!rootElement) {
  console.error('Main - Root element not found! Creating fallback...');
  const fallbackRoot = document.createElement('div');
  fallbackRoot.id = 'root';
  fallbackRoot.style.width = '100%';
  fallbackRoot.style.height = '100vh';
  document.body.appendChild(fallbackRoot);
  console.log('Main - Created fallback root element');
}

console.log('Main - Creating React root...');

const root = createRoot(rootElement || document.getElementById('root')!);

try {
  console.log('Main - Rendering React application...');
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log('Main - React application rendered successfully');
} catch (error) {
  console.error('Main - Critical error rendering React application:', error);
  
  // Enhanced fallback error display
  const errorDiv = document.createElement('div');
  errorDiv.innerHTML = `
    <div style="
      padding: 20px; 
      text-align: center; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #f8f9fa;
    ">
      <div style="
        max-width: 500px;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      ">
        <h1 style="color: #dc3545; margin-bottom: 20px;">Application Error</h1>
        <p style="margin-bottom: 20px; color: #6c757d;">
          The ISKCON BUREAU Management Portal encountered an error and cannot load properly.
        </p>
        <button 
          onclick="window.location.reload()" 
          style="
            padding: 12px 24px; 
            background: #007bff; 
            color: white; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer;
            font-size: 16px;
            margin-bottom: 20px;
          "
        >
          Refresh Page
        </button>
        <div style="
          margin-top: 20px; 
          padding: 15px; 
          background: #f8f9fa; 
          border: 1px solid #dee2e6; 
          border-radius: 6px;
          text-align: left;
        ">
          <p style="margin: 0; font-size: 14px; color: #6c757d; font-family: monospace;">
            Error: ${error?.toString() || 'Unknown error'}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #adb5bd;">
            Time: ${new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  `;
  
  // Clear body and add error display
  document.body.innerHTML = '';
  document.body.appendChild(errorDiv);
}
