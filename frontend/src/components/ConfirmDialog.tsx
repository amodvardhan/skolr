import { useConfirmStore } from '../stores/useConfirmStore';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export function ConfirmDialog() {
  const { isOpen, title, message, confirmText, cancelText, type, closeConfirm } = useConfirmStore();

  if (!isOpen) return null;

  let Icon = AlertCircle;
  let iconColor = 'text-amber-600 bg-amber-50 border-amber-200';
  let buttonStyle = 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10 focus:ring-amber-600/20';

  if (type === 'danger') {
    Icon = AlertTriangle;
    iconColor = 'text-rose-600 bg-rose-50 border-rose-200';
    buttonStyle = 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10 focus:ring-rose-600/20';
  } else if (type === 'info') {
    Icon = Info;
    iconColor = 'text-blue-600 bg-blue-50 border-blue-200';
    buttonStyle = 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10 focus:ring-blue-600/20';
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => closeConfirm(false)}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl animate-scale-in z-10 flex flex-col gap-4">
        {/* Header bar */}
        <div className="flex items-start gap-4">
          <div className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-display">
              {title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed font-sans">
              {message}
            </p>
          </div>
          <button
            onClick={() => closeConfirm(false)}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-50 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 mt-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="px-4 py-2 text-sm font-semibold text-slate-650 hover:text-slate-900 bg-white border border-slate-250 hover:bg-slate-50 rounded-xl transition duration-150 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => closeConfirm(true)}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition duration-150 shadow-sm hover:shadow active:scale-98 focus:outline-none focus:ring-2 cursor-pointer ${buttonStyle}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
