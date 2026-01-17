import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGraduationCap, faEnvelope, faUser, faEye, faEyeSlash, faSpinner, faUserPlus, faGift } from '../../../shared/icons';
import { AuthService, WelcomeGift } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Icons
  faGraduationCap = faGraduationCap;
  faEnvelope = faEnvelope;
  faUser = faUser;
  faEye = faEye;
  faEyeSlash = faEyeSlash;
  faSpinner = faSpinner;
  faUserPlus = faUserPlus;
  faGift = faGift;

  form: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = signal(false);
  error = signal('');
  hidePassword = signal(true);
  showWelcomeModal = signal(false);
  welcomeGifts = signal<WelcomeGift[]>([]);

  onSubmit() {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    this.authService.register(this.form.value).subscribe({
      next: (response) => {
        this.loading.set(false);
        // Check for welcome gifts
        if (response.welcomeGifts && response.welcomeGifts.length > 0) {
          this.welcomeGifts.set(response.welcomeGifts);
          this.showWelcomeModal.set(true);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error.set(err);
        this.loading.set(false);
      }
    });
  }

  closeWelcomeModal() {
    this.showWelcomeModal.set(false);
    this.router.navigate(['/dashboard']);
  }
}
