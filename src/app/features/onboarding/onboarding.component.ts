import { Component, ViewChild, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { OnboardingStep } from '../../core/onboarding/onboarding-step';

import { AuthStepComponent } from '../shared-steps/auth-step/auth-step.component';
import { PlantaStepComponent } from '../shared-steps/planta-step/planta-step.component';
import { MotoresStepComponent } from '../shared-steps/motores-step/motores-step.component';
import { RevisionStepComponent } from '../shared-steps/revision-step/revision-step.component';
import { AuthService } from '../../core/services/auth.service';
import { OnboardingStateService } from '../../core/state/onboarding-state.service';

@Component({
  selector: 'app-onboarding',
  imports: [
    CommonModule,
    AuthStepComponent,
    PlantaStepComponent,
    MotoresStepComponent,
    RevisionStepComponent,
    MatStepperModule,
    MatIconModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent implements OnInit {
  currentStep = 0;
  readonly maxStep = 5;

  loadingNext = false;
  nextError = '';

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private onboardingState = inject(OnboardingStateService);

  @ViewChild(AuthStepComponent) authStep?: AuthStepComponent;
  @ViewChild(PlantaStepComponent) plantaStep?: PlantaStepComponent;
  @ViewChild(MotoresStepComponent) motoresStep?: MotoresStepComponent;
  @ViewChild(RevisionStepComponent) revisionStep?: RevisionStepComponent;
  @ViewChild(MatStepper) stepper?: MatStepper;

  ngOnInit() {
    // Determinar en qué paso debería estar basándose en el progreso guardado
    this.currentStep = this.determineCurrentStep();
    console.log('Iniciando onboarding en paso:', this.currentStep);
  }

  // Getters para determinar si los pasos están completados
  get isAuthStepCompleted(): boolean {
    return this.authService.isAuthenticated();
  }

  get isPlantaStepCompleted(): boolean {
    return !!this.onboardingState.getPlantaId();
  }

  get isMotoresStepCompleted(): boolean {
    const motores = this.onboardingState.getMotoresDraft();
    return motores && motores.length > 0 && motores.every(m => m.codigo && m.modelo !== undefined && m.num_anillos && m.carbones_por_anillo);
  }

  get isRevisionStepCompleted(): boolean {
    // La revisión está completa si tiene todos los datos necesarios
    return this.isAuthStepCompleted && this.isPlantaStepCompleted && this.isMotoresStepCompleted;
  }

  private determineCurrentStep(): number {
    // Si no está autenticado, empezar desde el paso 0
    if (!this.authService.isAuthenticated()) {
      return 0;
    }

    // Si está autenticado pero no tiene planta ID, ir al paso 1 (planta)
    const plantaId = this.onboardingState.getPlantaId();
    if (!plantaId) {
      return 1;
    }

    // Si tiene planta pero no tiene motores configurados, ir al paso 2 (motores)
    const motores = this.onboardingState.getMotoresDraft();
    if (!motores || motores.length === 0) {
      return 2;
    }

    // Si tiene motores ir al paso 3 (revisión)
    const motoresCompletos = motores.every(m => m.codigo && m.modelo !== undefined);
    if (!motoresCompletos) {
      return 2; // Si los motores no están completos, quedarse en el paso 2
    }
    
    // Si tiene todo, ir al paso 3 (revisión/siguiente)
    return 3;
    
  }

  back() {
    if (this.currentStep > 0) this.currentStep--;
  }

  onStepChange(event: StepperSelectionEvent) {
    // Solo permitir navegación a pasos que estén disponibles
    const targetStep = event.selectedIndex;
    
    if (this.canNavigateToStep(targetStep)) {
      this.currentStep = targetStep;
      console.log('Step cambiado a:', this.currentStep);
    } else {
      // Revertir al paso actual si no puede navegar
      if (this.stepper) {
        this.stepper.selectedIndex = this.currentStep;
      }
    }
  }

  private canNavigateToStep(step: number): boolean {
    switch (step) {
      case 0: return true; // Siempre puede ir a auth
      case 1: return this.isAuthStepCompleted; // Necesita estar autenticado
      case 2: return this.isPlantaStepCompleted; // Necesita tener planta
      case 3: return this.isMotoresStepCompleted; // Necesita tener motores configurados
      default: return false; // Pasos futuros no disponibles aún
    }
  }

  private getActiveStep(): OnboardingStep | null {
    switch (this.currentStep) {
      case 0: return this.authStep ?? null;
      case 1: return this.plantaStep ?? null;
      case 2: return this.motoresStep ?? null;
      case 3: return this.revisionStep ?? null;
      default: return null;
    }
  }

  async nextClicked() {
    const step = this.getActiveStep();
    this.nextError = '';

    console.log('🔄 NextClicked - Current step:', this.currentStep, 'Step instance:', step); // Debug

    if (!step) return;

    this.loadingNext = true;

    try {
      await step.commit();
      
      if (this.currentStep < this.maxStep) {
        this.currentStep++;
        console.log('➡️ Advanced to step:', this.currentStep); // Debug
      }
    } catch (e: any) {
      console.error('❌ Error in step.commit():', e); // Debug

      this.nextError = e?.message === 'INVALID_STEP'
        ? 'Completa los campos requeridos para continuar.'
        : 'No se pudo guardar este paso. Revisa tu sesión e intenta de nuevo.';
    } finally {
      console.log('🏁 Finally block - setting loadingNext to false'); // Debug
      this.loadingNext = false;
      // Forzar detección de cambios después de que todas las propiedades se hayan estabilizado
      setTimeout(() => this.cdr.detectChanges(), 0);
    }
  }
}