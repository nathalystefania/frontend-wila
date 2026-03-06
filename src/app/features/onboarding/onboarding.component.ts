import { Component, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy, inject, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { OnboardingStep } from '../../core/onboarding/onboarding-step';

import { AuthStepComponent } from '../shared-steps/auth-step/auth-step.component';
import { PlantaStepComponent } from '../shared-steps/planta-step/planta-step.component';
import { MotoresStepComponent } from '../shared-steps/motores-step/motores-step.component';
import { RevisionStepComponent } from '../shared-steps/revision-step/revision-step.component';
import { AsignacionStepComponent } from '../shared-steps/asignacion/asignacion.component';
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
    AsignacionStepComponent,
    MatStepperModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent implements OnInit, AfterViewInit, OnDestroy {
  currentStep = 0;
  readonly maxStep = 5;

  loadingNext = false;
  nextError = '';
  showExplanation = false;
  motorEtapa: 'basicos' | 'configuracion' = 'basicos'; // Nueva propiedad para trackear etapa de motores

  // Propiedades cacheadas para evitar ExpressionChangedAfterItHasBeenCheckedError
  isAuthStepCompleted = false;
  isPlantaStepCompleted = false;
  isMotoresStepCompleted = false;
  isRevisionStepCompleted = false;
  canCurrentStepContinue = false;

  private updateInterval?: number;
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private onboardingState = inject(OnboardingStateService);

  @ViewChild(AuthStepComponent) authStep?: AuthStepComponent;
  @ViewChild(PlantaStepComponent) plantaStep?: PlantaStepComponent;
  @ViewChild(MotoresStepComponent) motoresStep?: MotoresStepComponent;
  @ViewChild(RevisionStepComponent) revisionStep?: RevisionStepComponent;
  @ViewChild(AsignacionStepComponent) asignacionStep?: AsignacionStepComponent;
  @ViewChild(MatStepper) stepper?: MatStepper;

  ngOnInit() {
    const determinedStep = this.determineCurrentStep();
    this.setCurrentStep(determinedStep);
    this.updateStepStates();
  }

  ngAfterViewInit() {
    // Actualizar estados después de que los ViewChild estén disponibles
    Promise.resolve().then(() => {
      this.updateStepStates();
      
      // Forzar evaluación inicial del estado del botón con múltiples intentos
      this.forceButtonStateUpdate();
    });
    
    // También verificar después de un ciclo de detección de cambios
    setTimeout(() => {
      if (this.areViewChildrenReady()) {
        this.updateCanContinueState();
        this.cdr.detectChanges();
      }
    }, 0);
  }

  private forceButtonStateUpdate() {
    // Primero forzar detección de cambios para asegurar que el template se renderice
    this.cdr.detectChanges();
    
    const timeouts = [0, 50, 100, 200, 500]; // Agregué timeout inmediato
    
    timeouts.forEach(delay => {
      setTimeout(() => {
        // Forzar detección de cambios antes de verificar ViewChild
        this.cdr.detectChanges();
        
        // Verificar si los ViewChild están disponibles antes de continuar
        if (!this.areViewChildrenReady()) {
          return;
        }
        
        
        // Verificación especial: si estamos en paso 0 pero ya autenticado, actualizar paso
        if (this.currentStep === 0 && this.authService.isAuthenticated()) {
          const newStep = this.determineCurrentStep();
          this.setCurrentStep(newStep);
          this.updateStepStates();
        }
        
        this.updateCanContinueState();
        this.cdr.detectChanges();
      }, delay);
    });
    
    // Verificación final después de todos los timeouts
    setTimeout(() => {
      this.cdr.detectChanges(); // Forzar detección de cambios una vez más
      
      if (!this.areViewChildrenReady()) {
        return;
      }
      
      this.updateCanContinueState();
      this.cdr.detectChanges();
    }, 1000);
  }

  private areViewChildrenReady(): boolean {
    const authReady = this.authStep !== undefined;
    const plantaReady = this.plantaStep !== undefined;
    const motoresReady = this.motoresStep !== undefined;
    const revisionReady = this.revisionStep !== undefined;
    const asignacionReady = this.asignacionStep !== undefined;
    
    // Al menos el componente del paso actual debe estar listo
    switch (this.currentStep) {
      case 0: return authReady;
      case 1: return plantaReady;
      case 2: return motoresReady;
      case 3: return revisionReady;
      case 4: return asignacionReady;
      default: return false;
    }
  }

  ngOnDestroy() {
    // No hay interval que limpiar ahora
  }

  private updateStepStates() {
    // Usar Promise.resolve para mover a la siguiente iteración del event loop
    Promise.resolve().then(() => {
      // Actualizar estados de los pasos
      this.isAuthStepCompleted = this.authService.isAuthenticated();
      this.isPlantaStepCompleted = !!this.onboardingState.getPlantaId();
      
      const motores = this.onboardingState.getMotoresDraft();
      this.isMotoresStepCompleted = motores && motores.length > 0 && 
        motores.every(m => m.codigo && m.modelo !== undefined && m.num_anillos && m.carbones_por_anillo);
      
      this.isRevisionStepCompleted = this.isAuthStepCompleted && this.isPlantaStepCompleted && this.isMotoresStepCompleted;
      
      // Actualizar canCurrentStepContinue
      this.updateCanContinueState();
      
      // Marcar para verificación de cambios
      this.cdr.detectChanges();
    });
  }

  private updateCanContinueState() {
    const activeStep = this.getActiveStep();
    
    if (!activeStep) {
      this.canCurrentStepContinue = false;
      return;
    }
    
    if ('canContinue' in activeStep && typeof activeStep.canContinue === 'function') {
      try {
        const canContinue = activeStep.canContinue();
        const previousState = this.canCurrentStepContinue;
        this.canCurrentStepContinue = canContinue;
        
        if (activeStep.constructor.name === 'AuthStepComponent') {
          console.log(`🔐 Auth - form valid: ${(activeStep as any).form?.valid}`);
          console.log(`🔐 Auth - loading: ${(activeStep as any).loading}`);
        }
        
      } catch (error) {
        console.error('❌ Error calling canContinue:', error);
        this.canCurrentStepContinue = false;
      }
    } else {
      console.log(`⚠️ activeStep no tiene método canContinue disponible`);
      this.canCurrentStepContinue = false;
    }
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
    // Si estamos en el paso de motores (paso 2) y en etapa 'configuracion', volver a 'basicos'
    if (this.currentStep === 2 && this.motorEtapa === 'configuracion') {
      // Llamar método del componente motores para volver a básicos
      if (this.motoresStep) {
        this.motoresStep.volverABasicos();
      }
      return;
    }
    
    // Comportamiento normal: retroceder al paso anterior
    if (this.currentStep > 1) {
      const newStep = this.currentStep - 1;
      this.setCurrentStep(newStep);
      
      this.updateStepStates();
    }
  }

  // Método para manejar cambio de etapa en motores
  onMotorEtapaChange(etapa: 'basicos' | 'configuracion') {
    this.motorEtapa = etapa;
    
    // Forzar actualización del estado del botón cuando cambia la etapa
    setTimeout(() => {
      this.updateCanContinueState();
      this.cdr.detectChanges();
    }, 0);
  }

  // Método público para que los componentes puedan notificar cambios
  onStepStateChange() {
    // Forzar detección de cambios para asegurar que ViewChild estén disponibles
    this.cdr.detectChanges();
    
    // Verificar si los ViewChild están listos
    if (this.areViewChildrenReady()) {
      this.updateCanContinueState();
    } else {
      // Reintentar después de un pequeño delay
      setTimeout(() => {
        this.cdr.detectChanges();
        if (this.areViewChildrenReady()) {
          this.updateCanContinueState();
        }
        this.cdr.detectChanges();
      }, 50);
    }
    
    this.cdr.detectChanges();
  }

  // Método para cambiar currentStep con logging y forzar actualización del template
  private setCurrentStep(step: number) {
    this.currentStep = step;
    
    // Forzar múltiples ciclos de detección de cambios
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  onStepChange(event: StepperSelectionEvent) {
    // Solo permitir navegación a pasos que estén disponibles
    const targetStep = event.selectedIndex;
    
    // Prevenir loop infinito - no hacer nada si ya estamos en el paso target
    if (this.currentStep === targetStep) {
      return;
    }
    
    if (this.canNavigateToStep(targetStep)) {
      this.setCurrentStep(targetStep);
      
      this.updateStepStates();
    } else {
      // Revertir al paso actual si no puede navegar
      if (this.stepper) {
        // Usar setTimeout para prevenir loop infinito
        setTimeout(() => {
          if (this.stepper) {
            this.stepper.selectedIndex = this.currentStep;
          }
        }, 0);
      }
    }
  }

  private canNavigateToStep(step: number): boolean {
    switch (step) {
      case 0: return false; // No puede ir a auth
      case 1: return this.isAuthStepCompleted; // Necesita estar autenticado
      case 2: return this.isPlantaStepCompleted; // Necesita tener planta
      case 3: return this.isMotoresStepCompleted; // Necesita tener motores configurados
      case 4: return this.isRevisionStepCompleted; // Necesita tener revisión completada
      default: return false; // Pasos futuros no disponibles aún
    }
  }

  private getActiveStep(): OnboardingStep | null {
    switch (this.currentStep) {
      case 0: 
        const authStep = this.authStep ?? null;
        return authStep;
      case 1: 
        const plantaStep = this.plantaStep ?? null;
        return plantaStep;
      case 2: 
        const motoresStep = this.motoresStep ?? null;
        return motoresStep;
      case 3: 
        const revisionStep = this.revisionStep ?? null;
        return revisionStep;
      case 4: 
        const asignacionStep = this.asignacionStep ?? null;
        return asignacionStep;
      default: 
        return null;
    }
  }

  async nextClicked() {
    const step = this.getActiveStep();
    this.nextError = '';

    if (!step) return;

    // Si estamos en el paso de motores (paso 2) y en etapa 'basicos', llamar guardarBasicos
    if (this.currentStep === 2 && this.motorEtapa === 'basicos') {
      if (this.motoresStep) {
        this.motoresStep.guardarBasicos();
      }
      return;
    }

    this.loadingNext = true;

    try {
      await step.commit();
      
      if (this.currentStep < this.maxStep) {
        const newStep = this.currentStep + 1;
        this.setCurrentStep(newStep);
        
        this.updateStepStates();
      }
    } catch (e: any) {
      this.nextError = e?.message === 'INVALID_STEP'
        ? 'Completa los campos requeridos para continuar.'
        : 'No se pudo guardar este paso. Revisa tu sesión e intenta de nuevo.';
    } finally {
      this.loadingNext = false;
    }
  }

  toggleExplanation() {
    this.showExplanation = !this.showExplanation;
  }

}