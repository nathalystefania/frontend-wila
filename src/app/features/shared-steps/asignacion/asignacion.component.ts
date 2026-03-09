import { Component, OnInit, OnDestroy, Output, EventEmitter, Input, inject, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, takeUntil, Subject } from 'rxjs';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OnboardingStep } from '../../../core/onboarding/onboarding-step';
import { SensoresService, SensorData } from '../../../core/services/sensores.service';

@Component({
  selector: 'app-asignacion-step',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './asignacion.component.html',
  styleUrl: './asignacion.component.scss',
})
export class AsignacionStepComponent implements OnInit, OnDestroy, OnboardingStep {
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private sensoresService = inject(SensoresService);

  @Input() carbonId!: number;
  @Output() stateChange = new EventEmitter<void>();
  
  isLoading = false;
  sensorData: SensorData[] = [];
  error: string | null = null;
  
  private destroy$ = new Subject<void>();
  private isDestroyed = false;
  private hasLoadedOnce = false;

  ngOnInit() {
    this.openAssignmentDialog();

    if (this.hasLoadedOnce) return;
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
      if (result === true) {
        this.loadSensorData();
      }
    });
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSensorData() {
    if (this.isDestroyed || this.isLoading) return;

    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    this.sensoresService.asignarSensor(this.carbonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (!this.isDestroyed) {
            this.sensorData = [data];
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          if (!this.isDestroyed) {
            this.error = 'Error al cargar los datos del sensor';
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }
      });
  }

  reloadData() {
    if (this.isLoading || this.isDestroyed) return;
    this.loadSensorData();
  }

  // Métodos requeridos por OnboardingStep
  canContinue(): boolean {
    // Puede continuar si no hay error y los datos están cargados
    return !this.error && this.sensorData.length > 0;
  }

  async commit(): Promise<void> {
    if (!this.canContinue()) throw new Error('INVALID_STEP');
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
