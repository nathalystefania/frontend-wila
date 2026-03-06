import { Component, OnDestroy, OnInit, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { PlantasService } from '../../../core/services/plantas.service';
import { PlantaDraft, Planta } from '../../../core/models/planta.models';

@Component({
  selector: 'app-planta-step',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatFormFieldModule, 
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './planta-step.component.html',
  styleUrl: './planta-step.component.scss',
})
export class PlantaStepComponent implements OnInit, OnDestroy, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);
  private plantasService = inject(PlantasService);

  @Output() stateChange = new EventEmitter<void>();

  private sub?: Subscription;

  error = '';
  loading = false;
  loadingPlantas = false;
  
  // Simplificado: solo una planta por usuario
  plantaExistente: Planta | null = null;
  isEditMode = false; // true si está editando, false si está creando

  form = this.fb.group({
    nombre: ['', Validators.required],
    ubicacion: [''],
    cantidad_motores: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
  });

  ngOnInit(): void {
    console.log('🏭 PlantaStep - Inicializando componente');
    
    // Verificar si ya estamos cargando para evitar llamadas múltiples
    if (this.loadingPlantas) {
      console.log('🏭 PlantaStep - Ya está cargando, saltando inicialización');
      return;
    }
    
    // Cargar planta existente del usuario (solo puede tener una)
    this.loadUserPlanta();
    
    // Suscribirse a cambios en el formulario
    this.sub = this.form.valueChanges.subscribe(v => {
      const nombre = (v.nombre ?? '').trim();
      const ubicacion = (v.ubicacion ?? '').trim() || null;
      
      if (nombre) {
        this.state.setPlantaDraft({ nombre, ubicacion });
      }

      const n = Number(v.cantidad_motores);
      if (Number.isFinite(n)) this.state.setCantidadMotores(n);
      
      // Notificar cambios al componente padre
      this.stateChange.emit();
    });
  }

  private async loadUserPlanta(): Promise<void> {
    console.log('🏭 PlantaStep - Iniciando loadUserPlanta, loadingPlantas:', this.loadingPlantas);
    
    this.loadingPlantas = true;
    this.error = '';
    
    try {
      console.log('🏭 PlantaStep - Cargando planta del usuario...');
      
      // Agregar timeout a la llamada
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const plantasPromise = firstValueFrom(this.plantasService.getUserPlantas());
      const plantas = await Promise.race([plantasPromise, timeout]) as Planta[];
      
      console.log('🏭 PlantaStep - Respuesta recibida, plantas:', plantas.length);
      
      if (plantas.length > 0) {
        // Usuario ya tiene una planta - modo edición
        this.plantaExistente = plantas[0]; // Solo tomamos la primera (debería ser única)
        this.isEditMode = true;
        
        console.log('🏭 PlantaStep - Planta existente encontrada:', this.plantaExistente);
        
        // Precargar datos en el formulario
        this.form.patchValue({
          nombre: this.plantaExistente.nombre,
          ubicacion: this.plantaExistente.ubicacion || '',
        }, { emitEvent: false });
        
        // Guardar ID en el estado
        this.state.setPlantaId(this.plantaExistente.id);
        
        // Cargar cantidad de motores desde el estado si existe
        const cantidadGuardada = this.state.getCantidadMotores();
        if (cantidadGuardada) {
          this.form.patchValue({ cantidad_motores: cantidadGuardada }, { emitEvent: false });
        }
        
      } else {
        // Usuario no tiene planta - modo creación
        this.plantaExistente = null;
        this.isEditMode = false;
        
        console.log('🏭 PlantaStep - No hay planta existente, modo creación');
        
        // Cargar datos del borrador si existen
        const draft = this.state.getPlantaDraft();
        const cant = this.state.getCantidadMotores();

        if (draft) {
          this.form.patchValue({
            nombre: draft.nombre ?? '',
            ubicacion: draft.ubicacion ?? '',
          }, { emitEvent: false });
        }

        if (cant) {
          this.form.patchValue({ cantidad_motores: cant }, { emitEvent: false });
        }
      }
      
      console.log('🏭 PlantaStep - Configuración completada, isEditMode:', this.isEditMode);
      
    } catch (err: any) {
      console.error('🏭 PlantaStep - Error cargando planta:', err);
      
      if (err.message === 'Timeout') {
        this.error = 'La carga de plantas está tardando demasiado. Intenta refrescar la página.';
      } else {
        this.error = 'No se pudo cargar la información de la planta';
      }
      
      // En caso de error, asumir modo creación
      this.isEditMode = false;
      this.plantaExistente = null;
      
      // Cargar datos del borrador como fallback
      const draft = this.state.getPlantaDraft();
      const cant = this.state.getCantidadMotores();

      if (draft) {
        this.form.patchValue({
          nombre: draft.nombre ?? '',
          ubicacion: draft.ubicacion ?? '',
        }, { emitEvent: false });
      }

      if (cant) {
        this.form.patchValue({ cantidad_motores: cant }, { emitEvent: false });
      }
      
    } finally {
      console.log('🏭 PlantaStep - Finalizando loadUserPlanta, estableciendo loadingPlantas = false');
      this.loadingPlantas = false;
      
      // Forzar detección de cambios
      setTimeout(() => {
        console.log('🏭 PlantaStep - Estado final: loadingPlantas:', this.loadingPlantas, 'isEditMode:', this.isEditMode);
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    
    // Limpiar estado de carga si el componente se destruye mientras está cargando
    if (this.loadingPlantas) {
      console.log('🏭 PlantaStep - Componente destruido durante carga, limpiando estado');
      this.loadingPlantas = false;
    }
  }

  // Método de emergencia para resetear el estado de carga
  resetLoadingState(): void {
    console.log('🏭 PlantaStep - Reseteando estado de carga manualmente');
    this.loadingPlantas = false;
    this.error = '';
    
    // Intentar cargar nuevamente
    this.loadUserPlanta();
  }

  canContinue(): boolean {
    return this.form.valid && !this.loading && !this.loadingPlantas;
  }

  async commit(): Promise<void> {
    this.error = '';
    this.form.markAllAsTouched();

    if (this.form.invalid) throw new Error('INVALID_STEP');

    const v = this.form.getRawValue();
    const cantidadMotores = v.cantidad_motores!;
    this.state.setCantidadMotores(cantidadMotores);

    const body: PlantaDraft = {
      nombre: (v.nombre ?? '').trim(),
      ubicacion: (v.ubicacion ?? '').trim() || null,
    };

    this.loading = true;
    try {
      if (this.isEditMode && this.plantaExistente) {
        // Actualizar planta existente
        console.log('🏭 PlantaStep - Actualizando planta existente ID:', this.plantaExistente.id);
        const plantaActualizada = await firstValueFrom(this.plantasService.updatePlanta(this.plantaExistente.id, body));
        
        // Actualizar referencia local
        this.plantaExistente = plantaActualizada;
        
        // El ID ya está en el estado desde el loadUserPlanta
        console.log('🏭 PlantaStep - Planta actualizada exitosamente');
        
      } else {
        // Crear nueva planta
        console.log('🏭 PlantaStep - Creando nueva planta:', body);
        const res = await firstValueFrom(this.plantasService.createPlanta(body));
        this.state.setPlantaId(res.id);
        console.log('🏭 PlantaStep - Nueva planta creada con ID:', res.id);
      }
      
      // Actualizar draft en ambos casos
      this.state.setPlantaDraft(body);
      
    } catch (err: any) {
      const action = this.isEditMode ? 'actualizar' : 'crear';
      this.error = err?.error?.error || err?.error?.message || `No se pudo ${action} la planta`;
      throw new Error('PLANTA_FAILED');
    } finally {
      this.loading = false;
    }
  }
}