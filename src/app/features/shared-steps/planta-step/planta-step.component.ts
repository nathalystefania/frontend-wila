import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { PlantasService } from '../../../core/services/plantas.service';
import { PlantaDraft } from '../../../core/models/planta.models';

@Component({
  selector: 'app-planta-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './planta-step.component.html',
})
export class PlantaStepComponent implements OnInit, OnDestroy, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);
  private plantasService = inject(PlantasService);

  private sub?: Subscription;

  error = '';
  loading = false;

  form = this.fb.group({
    nombre: ['', Validators.required],
    ubicacion: [''],
    email_notificaciones: [''],
    cantidad_motores: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
  });

  ngOnInit(): void {
    const draft = this.state.getPlantaDraft();
    const cant = this.state.getCantidadMotores();

    if (draft) {
      this.form.patchValue({
        nombre: draft.nombre ?? '',
        ubicacion: draft.ubicacion ?? '',
        email_notificaciones: draft.email_notificaciones ?? ''
      }, { emitEvent: false });
    }

    if (cant) {
      this.form.patchValue({ cantidad_motores: cant }, { emitEvent: false });
    }

    this.sub = this.form.valueChanges.subscribe(v => {
      const nombre = (v.nombre ?? '').trim();
      const ubicacion = (v.ubicacion ?? '').trim() || null;
      const email = (v.email_notificaciones ?? '').trim().toLowerCase() || null;

      if (nombre) {
        this.state.setPlantaDraft({ nombre, ubicacion, email_notificaciones: email });
      }

      const n = Number(v.cantidad_motores);
      if (Number.isFinite(n)) this.state.setCantidadMotores(n);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  canContinue(): boolean {
    return this.form.valid && !this.loading;
  }

  async commit(): Promise<void> {
    this.error = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) throw new Error('INVALID_STEP');

    const v = this.form.getRawValue();

    this.state.setCantidadMotores(v.cantidad_motores!);

    const body: PlantaDraft = {
      nombre: (v.nombre ?? '').trim(),
      ubicacion: (v.ubicacion ?? '').trim() || null,
      email_notificaciones: (v.email_notificaciones ?? '').trim().toLowerCase() || null,
    };

    this.state.setPlantaDraft(body);

    this.loading = true;
    try {
      const res = await firstValueFrom(this.plantasService.createPlanta(body));
      this.state.setPlantaId(res.id);
    } catch (err: any) {
      this.error = err?.error?.error || err?.error?.message || 'No se pudo crear la planta';
      throw new Error('PLANTA_FAILED');
    } finally {
      this.loading = false;
    }
  }
}