import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

// Forma de un registro de asistencia, igual que la tabla "asistencia"
export interface Asistencia {
  id_asistencia?: number;      // Lo genera la base de datos, no hace falta enviarlo
  nombre?: string | null;      // Nombre del alumno
  id_ramo?: number | null;     // Ramo al que corresponde
  bloque?: string | null;      // Bloque de horario (texto)
  dia?: string | null;         // Dia de la clase
  estado?: string | null;      // Ej: 'presente', 'ausente'
  id_usuario?: number | null;  // Usuario al que pertenece el registro
  fecha?: string | null;       // Fecha de la clase, formato 'AAAA-MM-DD'
}

@Injectable({ providedIn: 'root' })
export class AsistenciaService {

  // Agrega un registro de asistencia y lo devuelve (con su id)
  async agregarAsistencia(asistencia: Asistencia) {
    const { data, error } = await supabase
      .from('asistencia')
      .insert(asistencia)
      .select()
      .single();

    if (error) throw error;
    return data as Asistencia;
  }

  // Devuelve todos los registros de asistencia
  async obtenerAsistencia() {
    const { data, error } = await supabase
      .from('asistencia')
      .select('*');

    if (error) throw error;
    return data as Asistencia[];
  }

  // Devuelve solo la asistencia de un ramo
  async obtenerAsistenciaPorRamo(id_ramo: number) {
    const { data, error } = await supabase
      .from('asistencia')
      .select('*')
      .eq('id_ramo', id_ramo);

    if (error) throw error;
    return data as Asistencia[];
  }

  // Devuelve solo la asistencia de un usuario (alumno)
  async obtenerAsistenciaPorUsuario(id_usuario: number) {
    const { data, error } = await supabase
      .from('asistencia')
      .select('*')
      .eq('id_usuario', id_usuario);

    if (error) throw error;
    return data as Asistencia[];
  }

  // Cambia el estado de un registro ('presente', 'ausente' o 'nulo')
  async actualizarEstado(id_asistencia: number, estado: string) {
    const { error } = await supabase
      .from('asistencia')
      .update({ estado: estado })
      .eq('id_asistencia', id_asistencia);

    if (error) throw error;
  }

  // Elimina un registro de asistencia por su id
  async eliminarAsistencia(id_asistencia: number) {
    const { error } = await supabase
      .from('asistencia')
      .delete()
      .eq('id_asistencia', id_asistencia);

    if (error) throw error;
  }
}
