import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-revision-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revision-step.component.html',
  styleUrl: './revision-step.component.scss',
})
export class RevisionStepComponent implements OnboardingStep {
  private state = inject(OnboardingStateService);
  private authService = inject(AuthService);

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
}
