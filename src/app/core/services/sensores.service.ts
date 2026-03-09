import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SensorData {
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

@Injectable({ providedIn: 'root' })
export class SensoresService {
    private http = inject(HttpClient);
    private baseUrl = environment.apiUrl;

    private buildUrl(endpoint: string): string {
        return `${this.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    }

    asignarSensor(carbonId: number, deveui: string): Observable<SensorData> {
        return this.http.post<SensorData>(
            this.buildUrl(`/api/carbones/${carbonId}/asignar`),
            { deveui }
        );
    }

    // Obtiene los dispositivos detectados desde la API
    getDispositivosDetectados(): Observable<SensorData[]> {
        return this.http.get<SensorData[]>(this.buildUrl('/api/descubrimientos'));
    }
}
