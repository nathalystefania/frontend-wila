import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PlantaDraft } from '../models/planta.models';
import { MotorDraft } from '../models/motor.models';

export interface AuthDraft {
  email: string;
  mode: 'register' | 'login';
}

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  private readonly storageKey = 'onboarding_state';
  private platformId = inject(PLATFORM_ID);
  
  private state: {
    authDraft?: AuthDraft;
    plantaId?: number;
    cantidadMotores?: number;
    plantaDraft?: PlantaDraft;
    motoresDraft?: MotorDraft[];
  } = {};

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (!this.isBrowser) return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error loading onboarding state from localStorage:', error);
      this.state = {};
    }
  }

  private saveToStorage() {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Error saving onboarding state to localStorage:', error);
    }
  }

  // Auth
  setAuthDraft(draft: AuthDraft) {
    this.state.authDraft = draft;
    this.saveToStorage();
  }
  getAuthDraft(): AuthDraft | null {
    return this.state.authDraft ?? null;
  }

  // Planta
  setPlantaId(id: number) {
    this.state.plantaId = id;
    this.saveToStorage();
  }
  getPlantaId(): number | null {
    return this.state.plantaId ?? null;
  }

  setCantidadMotores(n: number) {
    this.state.cantidadMotores = n;
    this.saveToStorage();
  }
  getCantidadMotores(): number | null {
    return this.state.cantidadMotores ?? null;
  }

  setPlantaDraft(draft: PlantaDraft) {
    this.state.plantaDraft = draft;
    this.saveToStorage();
  }
  getPlantaDraft(): PlantaDraft | null {
    return this.state.plantaDraft ?? null;
  }

  // Motores (draft)
  setMotoresDraft(motores: MotorDraft[]) {
    this.state.motoresDraft = motores;
    this.saveToStorage();
  }
  getMotoresDraft(): MotorDraft[] {
    return this.state.motoresDraft ?? [];
  }

  clear() {
    this.state = {};
    if (this.isBrowser) {
      localStorage.removeItem(this.storageKey);
    }
  }
}