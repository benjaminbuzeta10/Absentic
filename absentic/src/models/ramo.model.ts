// El modelo de un ramo: qué campos tiene un dato de esta app.
// Va en su propia carpeta porque cualquier página (inicio, informes, detalle)
// que muestre ramos necesita esta misma forma.

export type EstadoAsistencia = 'asistido' | 'falta' | 'nulo';

export interface Bloque {
  id: number;
  dia: string;          // 'Lunes', 'Martes', ...
  horaInicio: string;   // '08:00'
  horaTermino: string;  // '09:30'
}

export interface Sesion {
  fecha: string;        // 'Lunes 2 de mar'
  bloqueId: number;
  estado: EstadoAsistencia;
}

export interface Ramo {
  id: number;
  nombre: string;
  asistenciaMinima: number;   // porcentaje exigido, ej: 75
  fechaInicio: string;        // '2026-03-02'
  fechaTermino: string;       // '2026-07-03'
  bloques: Bloque[];
  sesiones: Sesion[];
}
