import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
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

    asignarSensor(carbonId: number): Observable<SensorData> {
        return this.http.post<SensorData>(
            this.buildUrl(`/api/carbones/${carbonId}/asignar`),
            {}
        );
    }

    // Simula la detección de dispositivos cercanos disponibles para asignar
    getDispositivosDetectados(): Observable<SensorData[]> {
        const mock: SensorData[] = [
            {
                deveui: '00180188000000AA',
                fecha: '2026-02-25 12:31:45',
                fcnt: 123,
                bat: 87,
                ax: 0.12, ay: -0.03, az: 1.01,
                gx: 0.5,  gy: -0.2,  gz: 0.1,
                tilt_f: -6.2, tilt_s: 1.4
            },
            {
                deveui: '00180188000000BB',
                fecha: '2026-02-25 12:32:10',
                fcnt: 45,
                bat: 62,
                ax: -0.05, ay: 0.01, az: 0.99,
                gx: 0.1,   gy: 0.3,  gz: -0.1,
                tilt_f: 2.1, tilt_s: -0.8
            },
            {
                deveui: '00180188000000CC',
                fecha: '2026-02-25 12:33:00',
                fcnt: 78,
                bat: 95,
                ax: 0.02, ay: 0.07, az: 1.00,
                gx: -0.2, gy: 0.1,  gz: 0.05,
                tilt_f: 0.5, tilt_s: 3.2
            }
        ];
        return of(mock).pipe(delay(5000));
    }
}
