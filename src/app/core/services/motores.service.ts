import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MotorDraft } from '../models/motor.models';
import { firstValueFrom } from 'rxjs';

export interface CreateMotorResponse {
  success?: boolean;
  motor_id?: number;
  id?: number; // Respuesta real del servidor
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

    // Obtener un motor específico por ID
    getMotorById(motorId: number) {
        return this.http.get<Motor>(this.buildUrl(`/api/motores/${motorId}`));
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

    // Crear motores nuevos.
    // Siempre crea motores nuevos sin verificar existencia (camino feliz)
    async createOrUpdateMotores(plantaId: number, motores: MotorDraft[], existingIds: number[] = []): Promise<number[]> {
        const motorIds: number[] = [];

        // Procesar cada motor
        for (let i = 0; i < motores.length; i++) {
            const motorDraft = motores[i];
            
            console.log(`Creando nuevo motor ${i}:`, motorDraft);
            const result = await firstValueFrom(this.createMotor(plantaId, motorDraft));
            console.log(`Respuesta del servidor para motor ${i}:`, result);
            
            // El servidor puede devolver {id: number} o {motor_id: number, success: boolean}
            const motorId = result.motor_id || result.id;
            
            if (!motorId) {
                console.error(`El servidor no devolvió un ID válido para motor ${i}:`, result);
                throw new Error(`Error al crear motor ${i}: sin ID válido`);
            }
            
            motorIds.push(motorId);
        }
        
        console.log('IDs de motores finales:', motorIds);
        return motorIds;
    }
}