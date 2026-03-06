import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { MotoresService } from '../../../core/services/motores.service';
import { MotorDraft } from '../../../core/models/motor.models';

@Component({
  selector: 'app-motores-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatListModule, MatProgressSpinnerModule],
  templateUrl: './motores-step.component.html',
  styleUrl: './motores-step.component.scss',
})
export class MotoresStepComponent implements OnInit, OnboardingStep {
  private fb = inject(FormBuilder);
  private state = inject(OnboardingStateService);
  private motoresService = inject(MotoresService);

  @Output() etapaChange = new EventEmitter<'basicos' | 'configuracion'>();
  @Output() stateChange = new EventEmitter<void>();

  error = '';
  loading = false;
  etapa: 'basicos' | 'configuracion' = 'basicos'; // Nueva propiedad para manejar etapas
  selectedMotorIndex = 0; // Índice del motor seleccionado en la segunda etapa
  motorCompletionStatus: boolean[] = []; // Seguimiento estable del estado de completitud
  focusedField: 'alto_carbon_mm' | 'prealarma_mm' | 'minimo_cambio_mm' | null = 'alto_carbon_mm'; // Campo enfocado

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
    if (this.hayDatosBasicosCompletos(existentes)) {
      this.etapa = 'configuracion';
      this.etapaChange.emit('configuracion');
      this.initConfiguracionForms(existentes);
    } else {
      this.etapa = 'basicos';
      this.etapaChange.emit('basicos');
      this.initBasicosForms(cantidad, existentes);
    }
  }

  // Verificar si los datos básicos están completos
  private hayDatosBasicosCompletos(motores: MotorDraft[]): boolean {
    if (!motores || motores.length === 0) return false;
    
    const cantidadEsperada = this.state.getCantidadMotores();
    if (motores.length !== cantidadEsperada) return false;
    
    // Verificar que todos los motores tengan código y modelo (datos básicos requeridos)
    return motores.every(motor => 
      motor.codigo && 
      motor.codigo.trim() !== '' && 
      motor.modelo && 
      motor.modelo.trim() !== ''
    );
  }

  private initBasicosForms(cantidad: number, existentes: MotorDraft[]) {
    this.motoresBasicos.clear();
    for (let i = 0; i < cantidad; i++) {
      const preset = existentes[i];
      this.motoresBasicos.push(this.createBasicosForm(i, preset));
    }
    
    // Suscribirse a cambios del formulario para notificar al padre
    this.formBasicos.valueChanges.subscribe(() => {
      this.validateDuplicateCodes();
      this.stateChange.emit();
    });
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
    
    // Inicializar estado de completitud
    this.motorCompletionStatus = [];
    
    for (let i = 0; i < motores.length; i++) {
      const configForm = this.createConfiguracionForm(motores[i]);
      this.motoresConfiguracion.push(configForm);
      
      // Inicializar estado de completitud
      this.motorCompletionStatus[i] = configForm.valid;
      
      // Suscribirse a cambios para actualizar estado
      configForm.statusChanges.subscribe(() => {
        this.motorCompletionStatus[i] = configForm.valid;
        this.stateChange.emit(); // Notificar cambios al padre
      });
    }
    
    // También suscribirse a cambios del formulario general de configuración
    this.formConfiguracion.valueChanges.subscribe(() => {
      this.stateChange.emit();
    });
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
      num_anillos: [motor.num_anillos ?? null, [Validators.required, Validators.min(1), Validators.max(10)]],
      carbones_por_anillo: [motor.carbones_por_anillo ?? null, [Validators.required, Validators.min(1), Validators.max(50)]],
      alto_carbon_mm: [motor.alto_carbon_mm ?? null, [Validators.maxLength(6)]],
      prealarma_mm: [motor.prealarma_mm ?? null, [Validators.maxLength(6)]],
      minimo_cambio_mm: [motor.minimo_cambio_mm ?? null, [Validators.maxLength(6)]],
    });
  }

  guardarBasicos(): void {
    this.error = '';
    this.formBasicos.markAllAsTouched();

    if (this.formBasicos.invalid) {
      this.error = 'Completa todos los campos requeridos.';
      return;
    }

    // Guardar datos básicos en el estado para persistirlos
    const motoresBasicos = this.motoresBasicos.getRawValue();
    
    // Obtener datos existentes para preservar configuración técnica si la hay
    const existentes = this.state.getMotoresDraft();
    
    // Crear array con datos básicos preservando configuración existente
    const motoresConDatosBasicos: MotorDraft[] = motoresBasicos.map((motor, index) => ({
      codigo: motor.codigo,
      modelo: motor.modelo,
      ubicacion: motor.ubicacion,
      // Preservar configuración existente o dejar null para que el usuario la complete
      num_anillos: existentes[index]?.num_anillos ?? null,
      carbones_por_anillo: existentes[index]?.carbones_por_anillo ?? null,
      alto_carbon_mm: existentes[index]?.alto_carbon_mm ?? null,
      prealarma_mm: existentes[index]?.prealarma_mm ?? null,
      minimo_cambio_mm: existentes[index]?.minimo_cambio_mm ?? null
    }));

    // Persistir en el estado
    this.state.setMotoresDraft(motoresConDatosBasicos);
    
    // Cambiar a etapa de configuración
    this.etapa = 'configuracion';
    this.etapaChange.emit('configuracion');
    this.initConfiguracionForms(motoresConDatosBasicos);
    
    // Notificar al componente padre que el estado cambió
    this.stateChange.emit();
  }

  selectMotor(index: number): void {
    this.selectedMotorIndex = index;
  }

  canContinue(): boolean {
    if (this.loading) return false;
    
    if (this.etapa === 'basicos') {
      // Verificar que el formulario sea válido (incluyendo no duplicados)
      return this.formBasicos.valid;
    }
    
    // Para la etapa de configuración, verificar que TODOS los motores tengan configuración válida
    if (this.etapa === 'configuracion') {
      // Verificar que el formulario general sea válido
      if (!this.formConfiguracion.valid) {
        return false;
      }
      
      // Verificar que todos los motores tengan los campos obligatorios de configuración
      const motoresConfig = this.motoresConfiguracion.controls;
      return motoresConfig.every(motorForm => {
        const numAnillos = motorForm.get('num_anillos')?.value;
        const carbonesPorAnillo = motorForm.get('carbones_por_anillo')?.value;
        
        // Los campos obligatorios son num_anillos y carbones_por_anillo
        return numAnillos && numAnillos > 0 && carbonesPorAnillo && carbonesPorAnillo > 0;
      });
    }
    
    return false;
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

    const plantaId = this.state.getPlantaId();
    console.log('Planta ID obtenido del estado:', plantaId);
    
    if (!plantaId) {
      this.error = 'No se encontró el ID de la planta';
      throw new Error('PLANTA_NOT_FOUND');
    }

    // Combinar datos básicos con configuración
    const motoresBasicos = this.motoresBasicos.getRawValue();
    const motoresConfig = this.motoresConfiguracion.getRawValue();

    console.log('Datos básicos raw:', motoresBasicos);
    console.log('Datos configuración raw:', motoresConfig);

    const motoresCompletos: MotorDraft[] = motoresBasicos.map((basico, index) => {
      const config = motoresConfig[index];
      
      // Limpiar y convertir valores numéricos
      const cleanMotor: MotorDraft = {
        codigo: basico.codigo?.trim() || '',
        modelo: basico.modelo?.trim() || null,
        ubicacion: basico.ubicacion?.trim() || null,
        
        // Campos obligatorios numéricos
        num_anillos: Number(config.num_anillos) || 0,
        carbones_por_anillo: Number(config.carbones_por_anillo) || 0,
        
        // Campos opcionales numéricos - convertir a número o null
        alto_carbon_mm: config.alto_carbon_mm ? Number(config.alto_carbon_mm) : null,
        prealarma_mm: config.prealarma_mm ? Number(config.prealarma_mm) : null,
        minimo_cambio_mm: config.minimo_cambio_mm ? Number(config.minimo_cambio_mm) : null,
      };
      
      return cleanMotor;
    });

    this.loading = true;
    try {
      // Validar datos requeridos antes de enviar
      const invalidMotor = motoresCompletos.find(motor => 
        !motor.codigo?.trim() || 
        !motor.num_anillos || 
        motor.num_anillos <= 0 || 
        !motor.carbones_por_anillo || 
        motor.carbones_por_anillo <= 0
      );
      
      if (invalidMotor) {
        this.error = 'Todos los motores deben tener código válido, número de anillos y carbones por anillo';
        throw new Error('INVALID_DATA');
      }

      // Validar que no haya códigos duplicados
      const codigos = motoresCompletos.map(motor => motor.codigo?.trim().toUpperCase()).filter(Boolean);
      const codigosDuplicados = codigos.filter((codigo, index) => codigos.indexOf(codigo) !== index);
      
      if (codigosDuplicados.length > 0) {
        this.error = `Se encontraron códigos duplicados: ${codigosDuplicados.join(', ')}`;
        throw new Error('DUPLICATE_CODES');
      }
      
      // Debug: Ver qué datos se están enviando
      console.log('Datos que se envían al API:');
      console.log('Plant ID:', plantaId);
      console.log('Motores completos:', JSON.stringify(motoresCompletos, null, 2));
      
      // Guardar motores en la API (crear o actualizar según corresponda)
      const resultado = await this.motoresService.createOrUpdateMotores(plantaId, motoresCompletos);
      console.log('Resultado de la operación:', resultado);
      
      // Actualizar estado local
      this.state.setMotoresDraft(motoresCompletos);
      
    } catch (err: any) {
      console.error('Error al guardar motores:', err);
      console.error('Status:', err.status);
      console.error('Status text:', err.statusText);
      console.error('Response del servidor:', err.error);
      console.error('URL:', err.url);
      
      // Manejo específico de errores comunes
      if (err.status === 400) {
        this.error = `Error 400 - Bad Request: ${err?.error?.message || err?.error?.error || 'Formato de datos inválido'}`;
      } else if (err.status === 404) {
        this.error = `Error 404 - No encontrado: ${err?.error?.message || err?.error?.error || 'Planta no encontrada'}`;
      } else if (err.status === 409) {
        this.error = `Error 409 - Conflicto: ${err?.error?.message || err?.error?.error || 'Ya existe un motor con ese código en la planta'}`;
      } else {
        this.error = err?.error?.error || err?.error?.message || 'No se pudieron guardar los motores';
      }
      throw new Error('MOTORES_FAILED');
    } finally {
      this.loading = false;
    }
  }

  getMotorCodigoByIndex(index: number): string {
    const motor = this.motoresBasicos.at(index);
    return motor?.get('codigo')?.value || `Motor ${index + 1}`;
  }

  isMotorConfigCompleted(index: number): boolean {
    return this.motorCompletionStatus[index] || false;
  }

  // MÉTODO TEMPORAL - Borrar datos de motores
  borrarDatosMotores(): void {
    if (confirm('¿Estás seguro de que quieres borrar todos los datos de los motores?')) {
      this.state.setMotoresDraft([]);
      this.etapa = 'basicos';
      this.etapaChange.emit('basicos');
      const cantidad = this.state.getCantidadMotores() || 1;
      this.initBasicosForms(cantidad, []);
      this.motorCompletionStatus = [];
      this.error = '';
    }
  }

  panelIcon(i: number): 'ok' | 'warn' {
    return this.isMotorConfigCompleted(i) ? 'ok' : 'warn';
  }

  onFieldFocus(fieldName: 'alto_carbon_mm' | 'prealarma_mm' | 'minimo_cambio_mm') {
    this.focusedField = fieldName;
  }

  onFieldBlur() {
    // Mantener el campo enfocado o volver a alto_carbon_mm por defecto
    // this.focusedField = null; // Si quieres que no haya nada seleccionado al salir
  }

  getImageForField(): string {
    switch (this.focusedField) {
      case 'alto_carbon_mm':
        return 'assets/images/carbon-1.png';
      case 'prealarma_mm':
        return 'assets/images/carbon-2.png';
      case 'minimo_cambio_mm':
        return 'assets/images/carbon-3.png';
      default:
        return 'assets/images/carbon-1.png';
    }
  }

  getValueForField(motorForm: any): string {
    if (!this.focusedField) return '0';
    const value = motorForm.get(this.focusedField)?.value;
    return value || '0';
  }

  getLabelForField(): string {
    switch (this.focusedField) {
      case 'alto_carbon_mm':
        return 'Largo del carbón nuevo';
      case 'prealarma_mm':
        return 'Largo de pre alarma';
      case 'minimo_cambio_mm':
        return 'Largo mínimo de cambio';
      default:
        return 'Medida';
    }
  }

  getCssClassForField(): string {
    switch (this.focusedField) {
      case 'alto_carbon_mm':
        return 'carbon-alto';
      case 'prealarma_mm':
        return 'carbon-prealarma';
      case 'minimo_cambio_mm':
        return 'carbon-minimo';
      default:
        return 'carbon-default';
    }
  }

  // Métodos de navegación entre motores
  goToPreviousMotor(): void {
    if (this.selectedMotorIndex > 0) {
      this.selectMotor(this.selectedMotorIndex - 1);
    }
  }

  goToNextMotor(): void {
    if (this.selectedMotorIndex < this.motoresBasicos.controls.length - 1) {
      this.selectMotor(this.selectedMotorIndex + 1);
    }
  }

  // Métodos de validación para habilitar/deshabilitar botones
  canGoToPreviousMotor(): boolean {
    return this.selectedMotorIndex > 0;
  }

  canGoToNextMotor(): boolean {
    return this.selectedMotorIndex < this.motoresBasicos.controls.length - 1;
  }

  private validateDuplicateCodes(): void {
    const codigos = this.motoresBasicos.controls
      .map(control => control.get('codigo')?.value?.trim()?.toUpperCase())
      .filter(Boolean);
    
    const duplicates = codigos.filter((codigo, index) => codigos.indexOf(codigo) !== index);
    
    // Limpiar errores previos de duplicados
    this.motoresBasicos.controls.forEach(control => {
      const codigoControl = control.get('codigo');
      if (codigoControl?.hasError('duplicate')) {
        codigoControl.setErrors(null);
      }
    });
    
    // Marcar controles duplicados
    if (duplicates.length > 0) {
      this.motoresBasicos.controls.forEach(control => {
        const codigo = control.get('codigo')?.value?.trim()?.toUpperCase();
        if (duplicates.includes(codigo)) {
          control.get('codigo')?.setErrors({ duplicate: true });
        }
      });
    }
  }

  // Método para volver a etapa básicos (llamado desde el componente padre)
  volverABasicos(): void {
    this.etapa = 'basicos';
    this.etapaChange.emit('basicos');
    this.selectedMotorIndex = 0;
    
    // IMPORTANTE: Notificar al componente padre que el estado cambió
    this.stateChange.emit();
  }
}