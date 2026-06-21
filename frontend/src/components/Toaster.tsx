import { useToastStore } from '../stores/useToastStore';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        let Icon = Info;
        let colorClasses = '';

        switch (t.type) {
          case 'success':
            Icon = CheckCircle;
            colorClasses = 'border-emerald-100 bg-emerald-50/95 text-emerald-900 shadow-emerald-100/30';
            break;
          case 'error':
            Icon = AlertCircle;
            colorClasses = 'border-red-100 bg-red-50/95 text-red-900 shadow-red-100/30';
            break;
          case 'warning':
            Icon = AlertTriangle;
            colorClasses = 'border-amber-100 bg-amber-50/95 text-amber-900 shadow-amber-100/30';
            break;
          case 'info':
          default:
            Icon = Info;
            colorClasses = 'border-blue-100 bg-blue-50/95 text-blue-900 shadow-blue-100/30';
            break;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-right-5 ${colorClasses}`}
            role="alert"
          >
            <div className="flex gap-2.5">
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold font-sans leading-relaxed">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-neutral-600 rounded-lg p-0.5 hover:bg-black/5 transition shrink-0 ml-1 mt-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
