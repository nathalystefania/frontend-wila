import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreatePlantaResponse, PlantaDraft, Planta } from '../models/planta.models';

@Injectable({ providedIn: 'root' })
export class PlantasService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    // Obtener plantas del usuario autenticado
    getUserPlantas() {
        return this.http.get<Planta[]>(`${this.baseUrl}/api/plantas`);
    }

    createPlanta(body: PlantaDraft) {
        return this.http.post<CreatePlantaResponse>(`${this.baseUrl}/api/plantas`, body);
    }

    // Actualizar planta existente
    updatePlanta(id: number, body: PlantaDraft) {
        return this.http.put<Planta>(`${this.baseUrl}/api/plantas/${id}`, body);
    }
}