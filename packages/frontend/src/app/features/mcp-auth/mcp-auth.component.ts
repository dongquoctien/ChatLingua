import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faDesktop, faCheckCircle, faTimesCircle, faSpinner, faSignInAlt } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

type AuthState = 'checking' | 'login' | 'authenticating' | 'success' | 'error' | 'expired';

@Component({
  selector: 'app-mcp-auth',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
  ],
  templateUrl: './mcp-auth.component.html',
  styleUrls: ['./mcp-auth.component.scss']
})
export class McpAuthComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // Icons
  faDesktop = faDesktop;
  faCheckCircle = faCheckCircle;
  faTimesCircle = faTimesCircle;
  faSpinner = faSpinner;
  faSignInAlt = faSignInAlt;

  // State
  state = signal<AuthState>('checking');
  errorMessage = signal<string>('');
  sessionCode = signal<string>('');

  // Form
  email = '';
  password = '';

  // Computed
  isLoggedIn = signal(false);
  currentUser = signal<string>('');

  ngOnInit() {
    // Get session code from URL
    const code = this.route.snapshot.queryParamMap.get('session');
    if (!code) {
      this.state.set('error');
      this.errorMessage.set('Invalid session. Please try again from Claude Desktop.');
      return;
    }

    this.sessionCode.set(code);
    this.checkSession();
  }

  private async checkSession() {
    try {
      // Check session status
      const response = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/mcp-auth/status/${this.sessionCode()}`)
      );

      if (response.status === 'expired') {
        this.state.set('expired');
        return;
      }

      if (response.status === 'completed') {
        this.state.set('success');
        return;
      }

      // Session is pending, check if user is already logged in
      const currentUser = this.auth.currentUser();
      if (currentUser) {
        this.isLoggedIn.set(true);
        this.currentUser.set(currentUser.email);
      }

      this.state.set('login');
    } catch (error: any) {
      console.error('Session check error:', error);
      this.state.set('error');
      this.errorMessage.set(error?.error?.error || 'Failed to verify session');
    }
  }

  async authorize() {
    this.state.set('authenticating');

    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/mcp-auth/callback`, {
          sessionCode: this.sessionCode(),
        })
      );

      this.state.set('success');
    } catch (error: any) {
      console.error('Authorization error:', error);
      this.state.set('error');
      this.errorMessage.set(error?.error?.error || 'Authorization failed');
    }
  }

  async loginAndAuthorize() {
    this.state.set('authenticating');
    this.errorMessage.set('');

    try {
      // Login first
      await firstValueFrom(
        this.auth.login({ email: this.email, password: this.password })
      );

      // Then authorize
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/mcp-auth/callback`, {
          sessionCode: this.sessionCode(),
        })
      );

      this.state.set('success');
    } catch (error: any) {
      console.error('Login/Auth error:', error);
      this.state.set('login');
      this.errorMessage.set(error?.error?.error || error || 'Login or authorization failed');
    }
  }

  switchAccount() {
    this.auth.logout();
    this.isLoggedIn.set(false);
    this.currentUser.set('');
  }

  retry() {
    this.state.set('login');
    this.errorMessage.set('');
  }
}
