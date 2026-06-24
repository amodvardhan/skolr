import { useToastStore } from '../stores/useToastStore';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        let Icon = Info;
        let borderClass = 'border-blue-200';
        let iconColor = 'text-blue-600 bg-blue-50';

        switch (t.type) {
          case 'success':
            Icon = CheckCircle;
            borderClass = 'border-emerald-150';
            iconColor = 'text-emerald-600 bg-emerald-50';
            break;
          case 'error':
            Icon = AlertCircle;
            borderClass = 'border-rose-150';
            iconColor = 'text-rose-600 bg-rose-50';
            break;
          case 'warning':
            Icon = AlertTriangle;
            borderClass = 'border-amber-150';
            iconColor = 'text-amber-600 bg-amber-50';
            break;
          case 'info':
          default:
            Icon = Info;
            borderClass = 'border-blue-150';
            iconColor = 'text-blue-600 bg-blue-50';
            break;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-md transition-all duration-300 animate-slide-in-right ${borderClass}`}
            role="alert"
          >
            <div className="flex gap-3">
              <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${iconColor}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed font-sans mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-650 rounded-lg p-0.5 hover:bg-slate-50 transition shrink-0 ml-1 mt-0.5 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
