export interface PlantaDraft {
    nombre: string;
    ubicacion?: string | null;
    email_notificaciones?: string | null;
}

export interface CreatePlantaResponse {
    id: number;
}