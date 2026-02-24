import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { MotorDraft } from '../../../core/models/motor.models';

@Component({
  selector: 'app-motores-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule],
  templateUrl: './motores-step.component.html',
})
export class MotoresStepComponent implements OnInit, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);

  error = '';

  form = this.fb.group({
    motores: this.fb.array([])
  });

  ngOnInit(): void {
    const cantidad = this.state.getCantidadMotores();
    if (!cantidad) {
      this.error = 'No se encontró la cantidad de motores. Vuelve al paso anterior.';
      return;
    }

    const existentes = this.state.getMotoresDraft();
    const usar = existentes.length ? existentes : Array.from({ length: cantidad });

    this.motores.clear();
    for (let i = 0; i < usar.length; i++) {
      const preset = existentes[i];
      this.motores.push(this.createMotorForm(i, preset));
    }
  }

  get motores(): FormArray {
    return this.form.get('motores') as FormArray;
  }

  private createMotorForm(index: number, preset?: MotorDraft) {
    const defaultCodigo = `MTR-${String(index + 1).padStart(3, '0')}`;

    return this.fb.group({
      codigo: [preset?.codigo ?? defaultCodigo, [Validators.required]],
      modelo: [preset?.modelo ?? null],
      ubicacion: [preset?.ubicacion ?? null],
      descripcion: [preset?.descripcion ?? null],

      num_anillos: [preset?.num_anillos ?? 2, [Validators.required, Validators.min(1), Validators.max(10)]],
      carbones_por_anillo: [preset?.carbones_por_anillo ?? 8, [Validators.required, Validators.min(1), Validators.max(50)]],

      alto_carbon_mm: [preset?.alto_carbon_mm ?? null],
      prealarma_mm: [preset?.prealarma_mm ?? null],
      minimo_cambio_mm: [preset?.minimo_cambio_mm ?? null],
      umbral_desgaste_perc: [preset?.umbral_desgaste_perc ?? null],
      duracion_estimada_dias: [preset?.duracion_estimada_dias ?? null],
    });
  }

  canContinue(): boolean {
    return this.form.valid;
  }

  async commit(): Promise<void> {
    this.error = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) throw new Error('INVALID_STEP');

    this.state.setMotoresDraft(this.motores.getRawValue() as MotorDraft[]);
  }

  panelIcon(i: number): 'ok' | 'warn' {
    return this.motores.at(i).valid ? 'ok' : 'warn';
  }
}