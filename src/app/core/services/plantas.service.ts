import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CreatePlantaResponse, PlantaDraft } from '../models/planta.models';

@Injectable({ providedIn: 'root' })
export class PlantasService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    createPlanta(body: PlantaDraft) {
        return this.http.post<CreatePlantaResponse>(`${this.baseUrl}/api/plantas`, body);
    }
}