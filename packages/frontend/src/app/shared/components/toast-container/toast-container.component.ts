import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast, ToastType } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  getTypeClasses(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-50 border-green-200 text-green-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      warning: 'bg-orange-50 border-orange-200 text-orange-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    return classes[type];
  }

  getIconBgClasses(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-100',
      error: 'bg-red-100',
      warning: 'bg-orange-100',
      info: 'bg-blue-100'
    };
    return classes[type];
  }

  getProgressClasses(type: ToastType): string {
    const classes: Record<ToastType, string> = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-orange-500',
      info: 'bg-blue-500'
    };
    return classes[type];
  }

  dismiss(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }
}
