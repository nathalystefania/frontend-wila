import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MotorDraft } from '../models/motor.models';
import { firstValueFrom } from 'rxjs';

export interface CreateMotorResponse {
  success: boolean;
  motor_id: number;
}

export interface Motor extends MotorDraft {
  id: number;
}

export interface CreateMotoresResponse {
  success: boolean;
  motores_creados: number;
}

@Injectable({ providedIn: 'root' })
export class MotoresService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    private buildUrl(endpoint: string): string {
        return `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    }

    // Crear un motor individual
    createMotor(plantaId: number, motor: MotorDraft) {
        return this.http.post<CreateMotorResponse>(this.buildUrl(`/api/plantas/${plantaId}/motores`), motor);
    }

    // Verificar si ya existen motores en la planta
    async checkMotoresExist(plantaId: number): Promise<boolean> {
        try {
            const motores = await firstValueFrom(this.getMotoresByPlanta(plantaId));
            return motores && motores.length > 0;
        } catch (error: any) {
            // Si es 404, no existen motores
            if (error.status === 404) {
                return false;
            }
            // Para otros errores, los propagamos
            throw error;
        }
    }

    // Crear múltiples motores (hace varias llamadas individuales)
    createMotores(plantaId: number, motores: MotorDraft[]) {
        const createPromises = motores.map(motor => 
            firstValueFrom(this.createMotor(plantaId, motor))
        );
        
        return Promise.all(createPromises);
    }

    // Obtener motores de una planta
    getMotoresByPlanta(plantaId: number) {
        return this.http.get<Motor[]>(this.buildUrl(`/api/plantas/${plantaId}/motores`));
    }

    // Actualizar un motor individual
    updateMotor(motorId: number, motor: MotorDraft) {
        return this.http.put<Motor>(this.buildUrl(`/api/motores/${motorId}`), motor);
    }

    // Actualizar múltiples motores (hace varias llamadas individuales)
    async updateMotores(plantaId: number, motoresDraft: MotorDraft[]) {
        // Primero obtener motores existentes para conseguir los IDs
        const motoresExistentes = await firstValueFrom(this.getMotoresByPlanta(plantaId));
        
        // Crear promesas de actualización para cada motor
        const updatePromises = motoresDraft.map((motorDraft, index) => {
            const motorExistente = motoresExistentes[index];
            if (motorExistente && motorExistente.id) {
                return firstValueFrom(this.updateMotor(motorExistente.id, motorDraft));
            } else {
                // Si no existe el motor en esa posición, crearlo
                return firstValueFrom(this.createMotor(plantaId, motorDraft));
            }
        });
        
        return Promise.all(updatePromises);
    }

    // Método inteligente: crear o actualizar según existan o no
    async createOrUpdateMotores(plantaId: number, motores: MotorDraft[]) {
        const motoresToExist = await this.checkMotoresExist(plantaId);
        
        if (motoresToExist) {
            // Si ya existen, actualizar
            return this.updateMotores(plantaId, motores);
        } else {
            // Si no existen, crear todos individualmente
            return this.createMotores(plantaId, motores);
        }
    }
}