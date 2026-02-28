'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, Info, AlertTriangle, CheckCircle } from 'lucide-react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded shadow-lg border backdrop-blur-md transform transition-all duration-300 animate-in slide-in-from-right-full
              ${
                toast.type === 'error'
                  ? 'bg-red-900/80 border-red-800 text-red-100'
                  : toast.type === 'success'
                    ? 'bg-green-900/80 border-green-800 text-green-100'
                    : toast.type === 'warning'
                      ? 'bg-amber-900/80 border-amber-800 text-amber-100'
                      : 'bg-zinc-800/80 border-zinc-700 text-zinc-100'
              }
            `}
          >
            {toast.type === 'error' && <AlertTriangle size={18} />}
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {toast.type === 'info' && <Info size={18} />}

            <span className="text-sm font-medium">{toast.message}</span>

            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
