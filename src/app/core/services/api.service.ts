import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {

    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    get<T>(endpoint: string) {
        return this.http.get<T>(`${this.baseUrl}${endpoint}`);
    }

    post<T>(endpoint: string, body: any) {
        return this.http.post<T>(`${this.baseUrl}${endpoint}`, body);
    }

    put<T>(endpoint: string, body: any) {
        return this.http.put<T>(`${this.baseUrl}${endpoint}`, body);
    }

    delete<T>(endpoint: string) {
        return this.http.delete<T>(`${this.baseUrl}${endpoint}`);
    }
}