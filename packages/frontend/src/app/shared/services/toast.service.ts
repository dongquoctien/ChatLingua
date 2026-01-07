import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = computed(() => this._toasts());

  /**
   * Show a toast notification
   * @param type - Type of toast (success, error, warning, info)
   * @param title - Main title of the toast
   * @param message - Optional detailed message
   * @param duration - Duration in ms (default: 4000, 0 = no auto-dismiss)
   */
  show(type: ToastType, title: string, message?: string, duration = 4000): number {
    const id = this.nextId++;
    const toast: Toast = {
      id,
      type,
      title,
      message,
      duration,
      icon: this.getIcon(type)
    };

    this._toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }

    return id;
  }

  success(title: string, message?: string, duration = 4000): number {
    return this.show('success', title, message, duration);
  }

  error(title: string, message?: string, duration = 5000): number {
    return this.show('error', title, message, duration);
  }

  warning(title: string, message?: string, duration = 4500): number {
    return this.show('warning', title, message, duration);
  }

  info(title: string, message?: string, duration = 4000): number {
    return this.show('info', title, message, duration);
  }

  dismiss(id: number): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this._toasts.set([]);
  }

  private getIcon(type: ToastType): string {
    const icons: Record<ToastType, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type];
  }
}
