export interface PlantaDraft {
    nombre: string;
    ubicacion?: string | null;
    email_notificaciones?: string | null;
}

export interface Planta {
    id: number;
    nombre: string;
    ubicacion?: string | null;
    email_notificaciones?: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreatePlantaResponse {
    id: number;
}