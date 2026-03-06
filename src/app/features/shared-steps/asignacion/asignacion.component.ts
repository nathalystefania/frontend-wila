import { Component, OnInit, OnDestroy, Output, EventEmitter, inject, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of, delay, takeUntil, Subject } from 'rxjs';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { OnboardingStep } from '../../../core/onboarding/onboarding-step';

interface SensorData {
  deveui: string;
  fecha: string;
  fcnt: number;
  bat: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  tilt_f: number;
  tilt_s: number;
}

@Component({
  selector: 'app-asignacion-step',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './asignacion.component.html',
  styleUrl: './asignacion.component.scss',
})
export class AsignacionStepComponent implements OnInit, OnDestroy, OnboardingStep {
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  
  @Output() stateChange = new EventEmitter<void>();
  
  isLoading = false;
  sensorData: SensorData[] = [];
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private hasLoadedOnce = false;

  ngOnInit() {
    console.log('AsignacionStepComponent ngOnInit called');
    
    // Abrir dialog al iniciar
    this.openAssignmentDialog();
    
    // Prevenir múltiples inicializaciones
    if (this.hasLoadedOnce) {
      console.warn('Component already initialized, skipping loadSensorData');
      return;
    }
    
    this.hasLoadedOnce = true;
    this.loadSensorData();
  }

  openAssignmentDialog() {
    const dialogRef = this.dialog.open(AssignmentDialogComponent, {
      minWidth: '90vw',
      height: '95vh',
      minHeight: '95vh',
      disableClose: true,
      panelClass: 'custom-assignment-dialog',
      data: {
        title: 'Sincronización de dispositivos físicos',
        message: 'En este paso se vincula cada dispositivo físico con su posición exacta en el motor, considerando el anillo y el orden del carbón.'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog cerrado:', result);
      if (result === true) {
        console.log('Usuario confirmó continuar');
      } else {
        console.log('Usuario canceló la operación');
      }
    });
  }

  ngOnDestroy() {
    console.log('AsignacionStepComponent ngOnDestroy called');
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  getSensorDataSimulated(): Observable<SensorData[]> {
    const mockData: SensorData[] = [
      {
        "deveui": "00180188000000AA",
        "fecha": "2026-02-25 12:31:45",
        "fcnt": 123,
        "bat": 87,
        "ax": 0.12,
        "ay": -0.03,
        "az": 1.01,
        "gx": 0.5,
        "gy": -0.2,
        "gz": 0.1,
        "tilt_f": -6.2,
        "tilt_s": 1.4
      }
    ];
    
    return of(mockData).pipe(delay(5000));
  }

  loadSensorData() {
    // Prevenir ejecución si el componente está destruido
    if (this.isDestroyed) {
      console.warn('Component is destroyed, skipping loadSensorData');
      return;
    }
    
    // Prevenir múltiples cargas simultáneas
    if (this.isLoading) {
      console.warn('Already loading, skipping loadSensorData');
      return;
    }
    
    console.log('Starting loadSensorData');
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges(); // Forzar detección de cambios al iniciar
    
    this.getSensorDataSimulated()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (!this.isDestroyed) {
            console.log('Recibiendo datos, cambiando estado...');
            console.log('isLoading antes:', this.isLoading);
            this.sensorData = data;
            this.isLoading = false;
            console.log('isLoading después:', this.isLoading);
            this.cdr.detectChanges(); // Forzar detección de cambios
            console.log('Datos de sensores cargados:', data);
            console.log('Estado final - isLoading:', this.isLoading, 'sensorData.length:', this.sensorData.length);
          }
        },
        error: (err) => {
          if (!this.isDestroyed) {
            this.error = 'Error al cargar los datos del sensor';
            this.isLoading = false;
            this.cdr.detectChanges(); // Forzar detección de cambios
            console.error('Error:', err);
          }
        }
      });
  }

  reloadData() {
    console.log('reloadData called, isLoading:', this.isLoading, 'isDestroyed:', this.isDestroyed);
    
    // Múltiples verificaciones para prevenir ejecución problemática
    if (this.isLoading || this.isDestroyed) {
      return;
    }
    
    this.loadSensorData();
  }

  // Métodos requeridos por OnboardingStep
  canContinue(): boolean {
    // Puede continuar si no hay error y los datos están cargados
    return !this.error && this.sensorData.length > 0;
  }

  async commit(): Promise<void> {
    // En este paso, solo verificamos que los sensores estén conectados
    if (!this.canContinue()) {
      throw new Error('INVALID_STEP');
    }
    
    console.log('✅ Asignación completada - dispositivos conectados');
  }
}

// Componente de Dialog
@Component({
  selector: 'assignment-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './assignment-dialog.component.html',
  styleUrl: './assignment-dialog.component.scss'
})
export class AssignmentDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<AssignmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
