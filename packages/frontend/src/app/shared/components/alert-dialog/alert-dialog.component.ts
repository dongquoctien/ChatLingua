import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { AlertDialogData } from '../../services/dialog.service';

@Component({
  selector: 'app-alert-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './alert-dialog.component.html',
  styleUrls: ['./alert-dialog.component.scss'],
})
export class AlertDialogComponent {
  private dialogRef = inject(DialogRef<void>);
  data: AlertDialogData = inject(DIALOG_DATA);

  // Icons - black/white template uses single info icon
  readonly faInfoCircle = faInfoCircle;
  readonly faTimes = faTimes;

  close() {
    this.dialogRef.close();
  }
}
