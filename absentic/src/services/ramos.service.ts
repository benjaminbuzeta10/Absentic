import { Injectable } from '@angular/core';
import { Bloque, EstadoAsistencia, Ramo, Sesion } from '../models/ramo.model';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Todas las fechas entre inicio y término que caen en ese día de la semana.
function fechasDelDia(inicio: string, termino: string, dia: string): string[] {
  const fechas: string[] = [];
  const actual = new Date(`${inicio}T12:00:00`);
  const fin = new Date(`${termino}T12:00:00`);
  while (actual <= fin) {
    if (DIAS[actual.getDay()] === dia) {
      fechas.push(`${dia} ${actual.getDate()} de ${MESES[actual.getMonth()]}`);
    }
    actual.setDate(actual.getDate() + 1);
  }
  return fechas;
}

// Arma un ramo con una sesión por cada clase del semestre (todas "asistido"),
// y le aplica los cambios de estado indicados por posición.
function crearRamo(
  id: number,
  nombre: string,
  asistenciaMinima: number,
  fechaInicio: string,
  fechaTermino: string,
  bloques: Bloque[],
  cambios: Record<number, EstadoAsistencia> = {},
): Ramo {
  const sesiones: Sesion[] = bloques
    .flatMap((b) => fechasDelDia(fechaInicio, fechaTermino, b.dia).map((fecha) => ({ fecha, bloqueId: b.id })))
    .map((s, i) => ({ ...s, estado: cambios[i] ?? 'asistido' }));
  return { id, nombre, asistenciaMinima, fechaInicio, fechaTermino, bloques, sesiones };
}

@Injectable({ providedIn: 'root' })
export class RamosService {
  // Datos de ejemplo del mockup de Figma, mientras se define el esquema final en Supabase
  // (hoy las tablas ramos/bloques/asistencia no tienen la asistencia mínima por ramo).
  private ramos: Ramo[] = [
    crearRamo(1, 'Matemáticas', 75, '2026-03-02', '2026-07-03', [
      { id: 11, dia: 'Lunes', horaInicio: '08:00', horaTermino: '09:30' },
      { id: 12, dia: 'Lunes', horaInicio: '10:00', horaTermino: '11:30' },
      { id: 13, dia: 'Viernes', horaInicio: '14:00', horaTermino: '15:30' },
    ], { 3: 'falta', 7: 'nulo', 10: 'falta' }),
    crearRamo(2, 'Programación I', 80, '2026-03-03', '2026-07-07', [
      { id: 21, dia: 'Martes', horaInicio: '10:00', horaTermino: '11:30' },
      { id: 22, dia: 'Jueves', horaInicio: '10:00', horaTermino: '11:30' },
    ], { 2: 'falta', 5: 'falta', 7: 'falta' }),
    crearRamo(3, 'Física General', 75, '2026-03-04', '2026-07-08', [
      { id: 31, dia: 'Miércoles', horaInicio: '08:00', horaTermino: '09:30' },
      { id: 32, dia: 'Miércoles', horaInicio: '09:30', horaTermino: '11:00' },
    ], { 1: 'falta', 3: 'falta', 5: 'nulo', 6: 'falta' }),
    crearRamo(4, 'Inglés Técnico', 70, '2026-03-05', '2026-07-09', [
      { id: 41, dia: 'Jueves', horaInicio: '16:00', horaTermino: '17:30' },
    ]),
  ];

  // Trae todos los ramos. Es async para que cambiarlo a Supabase
  // (supabase.from('ramos').select(...)) no obligue a tocar las páginas.
  async todos(): Promise<Ramo[]> {
    return this.ramos;
  }

  // % de asistencia: clases asistidas sobre clases válidas (las "nulo" no cuentan).
  porcentajeAsistencia(ramo: Ramo): number {
    const validas = ramo.sesiones.filter((s) => s.estado !== 'nulo').length;
    if (validas === 0) return 100;
    const asistidas = ramo.sesiones.filter((s) => s.estado === 'asistido').length;
    return Math.round((asistidas / validas) * 100);
  }
}
