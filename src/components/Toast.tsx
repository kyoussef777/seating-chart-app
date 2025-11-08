'use client';

import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { theme } from '@/lib/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

// Toast styles now use centralized theme
const toastStyles = {
  success: `${theme.semantic.success.bg} ${theme.semantic.success.border} ${theme.semantic.success.text}`,
  error: `${theme.semantic.error.bg} ${theme.semantic.error.border} ${theme.semantic.error.text}`,
  warning: `${theme.semantic.warning.bg} ${theme.semantic.warning.border} ${theme.semantic.warning.text}`,
  info: `${theme.semantic.info.bg} ${theme.semantic.info.border} ${theme.semantic.info.text}`,
};

const iconStyles = {
  success: theme.semantic.success.icon,
  error: theme.semantic.error.icon,
  warning: theme.semantic.warning.icon,
  info: theme.semantic.info.icon,
};

export function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const Icon = toastIcons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg min-w-[320px] max-w-md animate-slide-in ${toastStyles[type]}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconStyles[type]}`} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className={`flex-shrink-0 ${theme.components.icon.secondary} hover:${theme.components.icon.primary} transition-colors`}
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
