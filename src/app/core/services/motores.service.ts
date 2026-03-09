import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MotorDraft } from '../models/motor.models';
import { firstValueFrom } from 'rxjs';

export interface CreateMotorResponse {
  success: boolean;
  motor_id: number;
}

export interface Anillo {
  id: number;
  motor_id: number;
  numero_anillo: number;
  carbones: Carbon[];
}

export interface Carbon {
  id: number;
  anillo_id: number;
  numero_carbon: number;
  deveui_actual?: string | null;
}

export interface CreateCarbonBody {
  numero_carbon: number;
  medida_inicial_mm: number;
  umbral_alerta_perc: number;
  duracion_estimada_dias: number;
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

    // Crear múltiples motores secuencialmente
    async createMotores(plantaId: number, motores: MotorDraft[]) {
        const results = [];
        for (const motor of motores) {
            const result = await firstValueFrom(this.createMotor(plantaId, motor));
            results.push(result);
        }
        return results;
    }

    // Obtener anillos existentes de un motor
    getAnillosByMotor(motorId: number) {
        return this.http.get<Anillo[]>(this.buildUrl(`/api/motores/${motorId}/anillos`));
    }

    // Eliminar un anillo
    deleteAnillo(anilloId: number) {
        return this.http.delete<void>(this.buildUrl(`/api/anillos/${anilloId}`));
    }

    // Crear un anillo para un motor
    createAnillo(motorId: number, numeroAnillo: number) {
        return this.http.post<Anillo>(
            this.buildUrl(`/api/motores/${motorId}/anillos`),
            { numero_anillo: numeroAnillo }
        );
    }

    // Crear todos los anillos de un motor secuencialmente (1..numAnillos)
    async createAnillosForMotor(motorId: number, numAnillos: number): Promise<Anillo[]> {
        const anillosCreados: Anillo[] = [];
        for (let i = 1; i <= numAnillos; i++) {
            const anillo = await firstValueFrom(this.createAnillo(motorId, i));
            anillosCreados.push(anillo);
        }
        return anillosCreados;
    }

    // Obtener carbones de un anillo
    getCarbonesByAnillo(anilloId: number) {
        return this.http.get<Carbon[]>(this.buildUrl(`/api/anillos/${anilloId}/carbones`));
    }

    // Crear un carbón para un anillo
    createCarbon(anilloId: number, body: CreateCarbonBody) {
        return this.http.post<Carbon>(
            this.buildUrl(`/api/anillos/${anilloId}/carbones`),
            body
        );
    }

    // Eliminar un carbón
    deleteCarbon(carbonId: number) {
        return this.http.delete<void>(this.buildUrl(`/api/carbones/${carbonId}`));
    }

    // Crear todos los carbones de un anillo secuencialmente
    async createCarbonesForAnillo(
        anillo: Anillo,
        cantidadCarbones: number,
        motorDraft: MotorDraft
    ): Promise<number[]> {
        const medidaInicial = parseFloat(String(motorDraft.alto_carbon_mm));
        const umbralAlerta = parseFloat(String(motorDraft.prealarma_mm));
        const duracionEstimada = parseInt(String(motorDraft.minimo_cambio_mm), 10);

        const carbonIds: number[] = [];
        for (let i = 1; i <= cantidadCarbones; i++) {
            const body: CreateCarbonBody = {
                numero_carbon: i,
                medida_inicial_mm: medidaInicial,
                umbral_alerta_perc: umbralAlerta,
                duracion_estimada_dias: duracionEstimada,
            };
            const carbon = await firstValueFrom(this.createCarbon(anillo.id, body));
            carbonIds.push(carbon.id);
        }
        return carbonIds;
    }

    // Obtener motores de una planta
    getMotoresByPlanta(plantaId: number) {
        return this.http.get<Motor[]>(this.buildUrl(`/api/plantas/${plantaId}/motores`));
    }

    // Actualizar un motor individual
    updateMotor(motorId: number, motor: MotorDraft) {
        return this.http.put<Motor>(this.buildUrl(`/api/motores/${motorId}`), motor);
    }

    // Eliminar un motor
    deleteMotor(motorId: number) {
        return this.http.delete<void>(this.buildUrl(`/api/motores/${motorId}`));
    }

    // Eliminar solo los anillos y carbones de un motor, sin tocar el motor mismo
    async deleteMotorChildren(motorId: number): Promise<void> {
        let anillos: Anillo[] = [];
        try {
            anillos = await firstValueFrom(this.getAnillosByMotor(motorId));
        } catch (err: any) {
            if (err?.status !== 404) throw err;
        }
        for (const anillo of anillos) {
            let carbones: Carbon[] = [];
            try {
                carbones = await firstValueFrom(this.getCarbonesByAnillo(anillo.id));
            } catch (err: any) {
                if (err?.status !== 404) throw err;
            }
            for (const carbon of carbones) {
                await firstValueFrom(this.deleteCarbon(carbon.id));
            }
            await firstValueFrom(this.deleteAnillo(anillo.id));
        }
    }

    // Eliminar un motor completo en cascada: carbones → anillos → motor
    async deleteMotorCompletely(motorId: number): Promise<void> {
        await this.deleteMotorChildren(motorId);
        try {
            await firstValueFrom(this.deleteMotor(motorId));
        } catch (err: any) {
            if (err?.status !== 404) throw err;
        }
    }

    // Crear o actualizar motores.
    // Si se pasan IDs existentes (almacenados en estado), usa PUT directamente.
    // Si no hay IDs, intenta GET para encontrar motores activos y usa PUT/POST según corresponda.
    // Nunca borra motores (el API hace soft-delete y el constraint de código se mantiene).
    // Devuelve los IDs de los motores en el MISMO orden que el array de entrada.
    async createOrUpdateMotores(plantaId: number, motores: MotorDraft[], existingIds: number[] = []): Promise<number[]> {
        const motorIds: number[] = [];

        if (existingIds.length > 0) {
            // Tenemos IDs guardados: usar PUT para cada motor existente
            for (let i = 0; i < motores.length; i++) {
                if (existingIds[i]) {
                    const motor = await firstValueFrom(this.updateMotor(existingIds[i], motores[i]));
                    motorIds.push(motor.id);
                } else {
                    // Motor nuevo (la cantidad aumentó)
                    const result = await firstValueFrom(this.createMotor(plantaId, motores[i]));
                    motorIds.push(result.motor_id);
                }
            }
            return motorIds;
        }

        // Sin IDs guardados: consultar la API por motores activos
        let motoresExistentes: Motor[] = [];
        try {
            motoresExistentes = await firstValueFrom(this.getMotoresByPlanta(plantaId));
        } catch (err: any) {
            if (err?.status !== 404) throw err;
        }

        for (let i = 0; i < motores.length; i++) {
            const existente = motoresExistentes[i];
            if (existente?.id) {
                const motor = await firstValueFrom(this.updateMotor(existente.id, motores[i]));
                motorIds.push(motor.id);
            } else {
                const result = await firstValueFrom(this.createMotor(plantaId, motores[i]));
                motorIds.push(result.motor_id);
            }
        }
        return motorIds;
    }
}