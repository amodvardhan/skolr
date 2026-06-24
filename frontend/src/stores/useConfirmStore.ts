import { create } from 'zustand';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
  resolve: ((value: boolean) => void) | null;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'warning',
  resolve: null,
  showConfirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        resolve,
      });
    });
  },
  closeConfirm: (value) => {
    const resolve = get().resolve;
    if (resolve) {
      resolve(value);
    }
    set({ isOpen: false, resolve: null });
  },
}));

export const confirm = (
  message: string,
  options?: Omit<ConfirmOptions, 'message'>
) => {
  return useConfirmStore.getState().showConfirm({
    message,
    ...options,
  });
};
