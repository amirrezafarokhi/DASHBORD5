import React from 'react';
import ProductManager from './components/ProductManager';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-slate-900/20">
              L
            </div>
            <h1 className="font-bold text-lg hidden md:block text-slate-800">پنل مدیریت یکپارچه انبار</h1>
          </div>
          <div className="text-xs font-mono text-slate-400">v2.0 Unified</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <ProductManager />
        </div>
      </main>
    </div>
  );
}