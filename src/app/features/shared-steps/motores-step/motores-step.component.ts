import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { MotorDraft } from '../../../core/models/motor.models';

@Component({
  selector: 'app-motores-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './motores-step.component.html',
  styleUrl: './motores-step.component.scss',
})
export class MotoresStepComponent implements OnInit, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);

  error = '';
  etapa: 'basicos' | 'configuracion' = 'basicos'; // Nueva propiedad para manejar etapas
  selectedMotorIndex = 0; // Índice del motor seleccionado en la segunda etapa

  // Formularios separados para cada etapa
  formBasicos = this.fb.group({
    motores: this.fb.array([])
  });

  formConfiguracion = this.fb.group({
    motores: this.fb.array([])
  });

  ngOnInit(): void {
    const cantidad = this.state.getCantidadMotores();
    if (!cantidad) {
      this.error = 'No se encontró la cantidad de motores. Vuelve al paso anterior.';
      return;
    }

    const existentes = this.state.getMotoresDraft();
    
    // Determinar etapa inicial
    if (existentes.length && existentes.every(m => m.codigo && m.modelo !== undefined)) {
      this.etapa = 'configuracion';
      this.initConfiguracionForms(existentes);
    } else {
      this.etapa = 'basicos';
      this.initBasicosForms(cantidad, existentes);
    }
  }

  private initBasicosForms(cantidad: number, existentes: MotorDraft[]) {
    this.motoresBasicos.clear();
    for (let i = 0; i < cantidad; i++) {
      const preset = existentes[i];
      this.motoresBasicos.push(this.createBasicosForm(i, preset));
    }
  }

  private initConfiguracionForms(motores: MotorDraft[]) {
    this.motoresConfiguracion.clear();
    
    // Si venimos de la etapa básica, también inicializar los datos básicos
    if (this.motoresBasicos.length === 0) {
      this.motoresBasicos.clear();
      motores.forEach((motor, i) => {
        this.motoresBasicos.push(this.createBasicosForm(i, motor));
      });
    }
    
    for (let i = 0; i < motores.length; i++) {
      this.motoresConfiguracion.push(this.createConfiguracionForm(motores[i]));
    }
  }

  get motoresBasicos(): FormArray {
    return this.formBasicos.get('motores') as FormArray;
  }

  get motoresConfiguracion(): FormArray {
    return this.formConfiguracion.get('motores') as FormArray;
  }

  private createBasicosForm(index: number, preset?: MotorDraft) {
    const defaultCodigo = `MTR-${String(index + 1).padStart(3, '0')}`;

    return this.fb.group({
      codigo: [preset?.codigo ?? defaultCodigo, [Validators.required]],
      modelo: [preset?.modelo ?? '', [Validators.required]],
      ubicacion: [preset?.ubicacion ?? ''],
    });
  }

  private createConfiguracionForm(motor: MotorDraft) {
    return this.fb.group({
      num_anillos: [motor.num_anillos ?? 2, [Validators.required, Validators.min(1), Validators.max(10)]],
      carbones_por_anillo: [motor.carbones_por_anillo ?? 8, [Validators.required, Validators.min(1), Validators.max(50)]],
      alto_carbon_mm: [motor.alto_carbon_mm ?? null],
      prealarma_mm: [motor.prealarma_mm ?? null],
      minimo_cambio_mm: [motor.minimo_cambio_mm ?? null],
    });
  }

  guardarBasicos(): void {
    this.error = '';
    this.formBasicos.markAllAsTouched();

    if (this.formBasicos.invalid) {
      this.error = 'Completa todos los campos requeridos.';
      return;
    }

    // Guardar datos básicos y pasar a configuración
    const motoresBasicos = this.motoresBasicos.getRawValue();
    this.etapa = 'configuracion';
    this.initConfiguracionForms(motoresBasicos);
  }

  selectMotor(index: number): void {
    this.selectedMotorIndex = index;
    console.log('Motor seleccionado:', index, 'Código:', this.getMotorCodigoByIndex(index));
  }

  canContinue(): boolean {
    if (this.etapa === 'basicos') {
      return this.formBasicos.valid;
    }
    return this.formConfiguracion.valid;
  }

  async commit(): Promise<void> {
    this.error = '';

    if (this.etapa === 'basicos') {
      throw new Error('INVALID_STEP');
    }

    this.formConfiguracion.markAllAsTouched();

    if (this.formConfiguracion.invalid) {
      throw new Error('INVALID_STEP');
    }

    // Combinar datos básicos con configuración
    const motoresBasicos = this.motoresBasicos.getRawValue();
    const motoresConfig = this.motoresConfiguracion.getRawValue();

    const motoresCompletos: MotorDraft[] = motoresBasicos.map((basico, index) => ({
      ...basico,
      ...motoresConfig[index]
    }));

    this.state.setMotoresDraft(motoresCompletos);
  }

  getMotorCodigoByIndex(index: number): string {
    const motor = this.motoresBasicos.at(index);
    return motor?.get('codigo')?.value || `Motor ${index + 1}`;
  }

  isMotorConfigCompleted(index: number): boolean {
    const configForm = this.motoresConfiguracion.at(index);
    return configForm ? configForm.valid : false;
  }

  panelIcon(i: number): 'ok' | 'warn' {
    return this.isMotorConfigCompleted(i) ? 'ok' : 'warn';
  }
}