import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, firstValueFrom, timeout } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthCredentials } from '../../../core/models/auth.models';

@Component({
  selector: 'app-auth-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './auth-step.component.html',
})
export class AuthStepComponent implements OnInit, OnDestroy, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);
  private auth = inject(AuthService);

  private sub?: Subscription;

  mode: 'register' | 'login' = 'register';
  error = '';
  loading = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const draft = this.state.getAuthDraft();
    if (draft) {
      this.mode = draft.mode;
      this.form.patchValue({ email: draft.email }, { emitEvent: false });
    }

    this.sub = this.form.valueChanges.subscribe(v => {
      const email = (v.email ?? '').trim().toLowerCase();
      this.state.setAuthDraft({ email, mode: this.mode });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleMode(): void {
    this.error = '';
    this.mode = this.mode === 'register' ? 'login' : 'register';
    const email = (this.form.get('email')?.value ?? '').trim().toLowerCase();
    this.state.setAuthDraft({ email, mode: this.mode });
  }

  canContinue(): boolean {
    return this.form.valid && !this.loading;
  }

  async commit(): Promise<void> {
    this.error = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) throw new Error('INVALID_STEP');

    const creds: AuthCredentials = {
      email: (this.form.value.email ?? '').trim().toLowerCase(),
      password: this.form.value.password ?? '',
    };

    this.loading = true;

    try {
      if (this.mode === 'register') {
        const res = await firstValueFrom(this.auth.register(creds).pipe(timeout(15000)));
        this.auth.saveSession(res);
        return;
      }

      const res = await firstValueFrom(this.auth.login(creds).pipe(timeout(15000)));
      this.auth.saveSession(res);
      return;

    } catch (err: any) {
      if (err?.name === 'TimeoutError') {
        this.error = 'La autenticación está tardando demasiado. Intenta nuevamente.';
        throw new Error('TIMEOUT');
      }

      const status = err?.status;

      if (status === 409) {
        this.mode = 'login';
        this.state.setAuthDraft({ email: creds.email, mode: this.mode });
        this.error = 'Este correo ya existe. Inicia sesión para continuar.';
        throw new Error('STEP_NEEDS_LOGIN');
      }

      if (status === 401) {
        this.error = 'Credenciales incorrectas.';
        throw new Error('UNAUTHORIZED');
      }

      this.error = err?.error?.error || err?.error?.message || 'No se pudo autenticar.';
      throw new Error('AUTH_FAILED');

    } finally {
      this.loading = false;
    }
  }
}