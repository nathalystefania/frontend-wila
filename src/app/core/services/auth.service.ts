// import { Injectable, inject } from '@angular/core';
// import { HttpClient } from '@angular/common/http';
// import { environment } from '../../../environments/environment';
// import { AuthCredentials, AuthResponse } from '../models/auth.models';

// @Injectable({ providedIn: 'root' })
// export class AuthService {

//     private http = inject(HttpClient);
//     private apiUrl = environment.apiUrl;
//     private tokenKey = 'auth_token';

//     register(data: any) {
//         return this.http.post(`${this.apiUrl}/api/auth/register`, data);
//     }

//     login(data: any) {
//         return this.http.post(`${this.apiUrl}/api/auth/login`, data);
//     }

//     getToken(): string | null {
//         const t = localStorage.getItem(this.tokenKey);
//         if (!t || t === 'null' || t === 'undefined') return null;
//         return t.trim();
//     }

//     saveSession(res: { token: string; email?: string; user_id?: number }) {
//         localStorage.setItem(this.tokenKey, res.token);
//     }

//     logout() {
//         localStorage.clear();
//     }

//     isAuthenticated(): boolean {
//         return !!localStorage.getItem('token');
//     }
// }


import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { AuthCredentials, AuthResponse } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private platformId = inject(PLATFORM_ID);
    private baseUrl = environment.apiUrl;

    private tokenKey = 'auth_token';
    private userKey = 'auth_user';

    private get isBrowser(): boolean {
        return isPlatformBrowser(this.platformId);
    }

    register(data: AuthCredentials) {
        return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/register`, data);
    }

    login(data: AuthCredentials) {
        return this.http.post<AuthResponse>(`${this.baseUrl}/api/auth/login`, data);
    }

    saveSession(res: AuthResponse) {
        if (!this.isBrowser) return;
        localStorage.setItem(this.tokenKey, res.token);
        localStorage.setItem(this.userKey, JSON.stringify({ email: res.email, userId: res.user_id }));
    }

    getToken(): string | null {
        if (!this.isBrowser) return null;
        const t = localStorage.getItem(this.tokenKey);
        if (!t || t === 'null' || t === 'undefined') return null;
        return t.trim();
    }

    logout() {
        if (!this.isBrowser) return;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    isAuthenticated(): boolean {
        if (!this.isBrowser) return false;
        const token = this.getToken();
        return !!token;
    }

    getUser() {
        if (!this.isBrowser) return null;
        const userData = localStorage.getItem(this.userKey);
        if (!userData || userData === 'null') return null;
        try {
            return JSON.parse(userData);
        } catch {
            return null;
        }
    }
}