import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DialogService } from './shared/services/dialog.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { AlertDialogComponent } from './shared/components/alert-dialog/alert-dialog.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'frontend';

  private dialogService = inject(DialogService);

  constructor() {
    // Register dialog components
    this.dialogService.setConfirmDialogComponent(ConfirmDialogComponent);
    this.dialogService.setAlertDialogComponent(AlertDialogComponent);
  }
}
