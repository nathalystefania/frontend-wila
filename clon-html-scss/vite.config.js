import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, '1-auth.html'),
        planta: resolve(__dirname, '2-planta.html'),
        motores_basicos: resolve(__dirname, '3a-motores-basicos.html'),
        motores_tecnicos: resolve(__dirname, '3b-motores-tecnicos.html'),
        revision: resolve(__dirname, '4-revision.html'),
        asignacion_motor: resolve(__dirname, '5a-asignacion-motor.html'),
        asignacion_anillo: resolve(__dirname, '5b-asignacion-anillo.html'),
        asignacion_carbon: resolve(__dirname, '5c-asignacion-carbon.html'),
        asignacion_encendido: resolve(__dirname, '5d-asignacion-encendido.html'),
        asignacion_exito: resolve(__dirname, '5e-asignacion-exito.html'),
        complete: resolve(__dirname, '6-complete.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
      },
    },
  },
});
