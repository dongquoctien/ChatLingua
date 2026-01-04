import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faExclamationTriangle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import type { ConfirmDialogData } from '../../services/dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent {
  private dialogRef = inject(DialogRef<boolean>);
  data: ConfirmDialogData = inject(DIALOG_DATA);

  // Icons
  readonly faExclamationTriangle = faExclamationTriangle;
  readonly faTimes = faTimes;

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
