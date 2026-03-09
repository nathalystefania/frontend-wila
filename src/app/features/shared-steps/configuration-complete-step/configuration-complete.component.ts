import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

import { OnboardingStateService } from '../../../core/state/onboarding-state.service';
import { AuthService } from '../../../core/services/auth.service';
import { MotoresService } from '../../../core/services/motores.service';
import { PlantasService } from '../../../core/services/plantas.service';

@Component({
  selector: 'app-configuration-complete',
  imports: [
    CommonModule,
    MatIcon,
    MatButton,
    MatProgressSpinnerModule,
  ],
  templateUrl: './configuration-complete.component.html',
  styleUrl: './configuration-complete.component.scss',
})
export class ConfigurationCompleteComponent implements OnInit {
  private state = inject(OnboardingStateService);
  private authService = inject(AuthService);
  private motoresService = inject(MotoresService);
  private plantasService = inject(PlantasService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = true;

  plantaNombre = '—';
  userEmail = '—';
  totalMotores = 0;
  totalAnillos = 0;
  totalCarbones = 0;
  carbonesSincronizados = 0;
  carbonesSinSincronizar = 0;

  async ngOnInit() {
    const plantaId = this.state.getPlantaId();
    this.userEmail = this.authService.getUser()?.email ?? '—';

    if (!plantaId) {
      this.isLoading = false;
      return;
    }

    try {
      const [plantas, motores] = await Promise.all([
        firstValueFrom(this.plantasService.getUserPlantas()),
        firstValueFrom(this.motoresService.getMotoresByPlanta(plantaId)),
      ]);

      this.plantaNombre = plantas.find(p => p.id === plantaId)?.nombre ?? '—';
      this.totalMotores = motores.length;

      let totalAnillos = 0;
      let totalCarbones = 0;
      let sincronizados = 0;

      for (const motor of motores) {
        const anillos = await firstValueFrom(this.motoresService.getAnillosByMotor(motor.id));
        totalAnillos += anillos.length;
        for (const anillo of anillos) {
          const carbones = await firstValueFrom(this.motoresService.getCarbonesByAnillo(anillo.id));
          totalCarbones += carbones.length;
          sincronizados += carbones.filter(c => c.deveui_actual != null).length;
        }
      }

      this.totalAnillos = totalAnillos;
      this.totalCarbones = totalCarbones;
      this.carbonesSincronizados = sincronizados;
      this.carbonesSinSincronizar = totalCarbones - sincronizados;
    } catch {
      // mantener valores en 0 si la API falla
    }

    this.isLoading = false;
    this.cdr.detectChanges();
  }

  constructor(private router: Router) {}

  goTo(route: string) {
    this.router.navigate([route]);
  } 
}
