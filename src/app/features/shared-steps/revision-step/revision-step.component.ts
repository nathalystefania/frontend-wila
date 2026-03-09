import { Component, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-revision-step',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButton
  ],
  templateUrl: './revision-step.component.html',
  styleUrl: './revision-step.component.scss',
})
export class RevisionStepComponent implements OnboardingStep {
  private state = inject(OnboardingStateService);
  private authService = inject(AuthService);

  @Output() stateChange = new EventEmitter<void>();
  @Output() editarMotor = new EventEmitter<number>();

  get datosAuth() {
    return this.authService.getUser();
  }

  get datosPlanta() {
    return this.state.getPlantaDraft();
  }

  get plantaId() {
    return this.state.getPlantaId();
  }

  get motores() {
    return this.state.getMotoresDraft();
  }

  canContinue(): boolean {
    // Para continuar, debe tener todos los datos necesarios
    return !!(this.datosAuth && this.datosPlanta && this.plantaId && this.motores?.length);
  }

  async commit(): Promise<void> {
    // En el paso de revisión, solo validamos que todo esté completo
    // Los datos ya están guardados en los pasos anteriores
    if (!this.canContinue()) {
      throw new Error('INVALID_STEP');
    }
    
    // Aquí podrías hacer una llamada final al backend si es necesario
    console.log('✅ Revisión completada - todos los datos están listos');
  }

  getEmailInitials(email: string): string {
    if (!email) return 'NN';
    
    // Obtener la parte antes del @
    const localPart = email.split('@')[0].toLowerCase();
    
    // Buscar separadores comunes
    const separators = ['.', '_', '-'];
    let firstInitial = localPart[0]?.toUpperCase() || 'N';
    let secondInitial = '';
    
    // Buscar el primer separador y tomar la letra después de él
    for (const separator of separators) {
      const index = localPart.indexOf(separator);
      if (index !== -1 && index + 1 < localPart.length) {
        secondInitial = localPart[index + 1]?.toUpperCase() || '';
        break;
      }
    }
    
    // Si no encontró separador, tomar la segunda letra del email
    if (!secondInitial && localPart.length > 1) {
      secondInitial = localPart[1]?.toUpperCase() || '';
    }
    
    // Si aún no tiene segunda inicial, usar la primera letra repetida
    if (!secondInitial) {
      secondInitial = firstInitial;
    }
    
    return firstInitial + secondInitial;
  }

  getEmailUsername(email: string): string {
    if (!email) return '';
    
    // Obtener la parte antes del @
    return email.split('@')[0];
  }
}
