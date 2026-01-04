import { Injectable, inject } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/portal';
import { firstValueFrom } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertDialogData {
  title: string;
  message: string;
  buttonText?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialog = inject(Dialog);
  private confirmDialogComponent: ComponentType<any> | null = null;
  private alertDialogComponent: ComponentType<any> | null = null;

  setConfirmDialogComponent(component: ComponentType<any>) {
    this.confirmDialogComponent = component;
  }

  setAlertDialogComponent(component: ComponentType<any>) {
    this.alertDialogComponent = component;
  }

  async confirm(data: ConfirmDialogData): Promise<boolean> {
    if (!this.confirmDialogComponent) {
      // Fallback to native confirm if component not set
      return confirm(data.message);
    }

    const dialogRef = this.dialog.open(this.confirmDialogComponent, {
      data,
      panelClass: 'custom-dialog-panel',
    });

    const result = await firstValueFrom(dialogRef.closed);
    return result === true;
  }

  async alert(data: AlertDialogData): Promise<void> {
    if (!this.alertDialogComponent) {
      // Fallback to native alert if component not set
      alert(data.message);
      return;
    }

    const dialogRef = this.dialog.open(this.alertDialogComponent, {
      data,
      panelClass: 'custom-dialog-panel',
    });

    await firstValueFrom(dialogRef.closed);
  }
}
