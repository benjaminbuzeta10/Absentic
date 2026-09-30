import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

// Forma de un ramo, igual que la tabla "ramos" de la base de datos
export interface Ramo {
  id_ramo?: number;              // Lo genera la base de datos, no hace falta enviarlo
  ramo: string;                  // Nombre del ramo (obligatorio)
  fecha_inicio?: string | null;  // Formato 'AAAA-MM-DD'
  fecha_final?: string | null;   // Formato 'AAAA-MM-DD'
  id_bloque?: number | null;     // Bloque de horario al que pertenece
}

@Injectable({ providedIn: 'root' })
export class RamoService {

  // Agrega un ramo nuevo y devuelve el ramo guardado (con su id)
  async agregarRamo(ramo: Ramo) {
    const { data, error } = await supabase
      .from('ramos')
      .insert(ramo)
      .select()
      .single();

    if (error) throw error;
    return data as Ramo;
  }

  // Devuelve todos los ramos
  async obtenerRamos() {
    const { data, error } = await supabase
      .from('ramos')
      .select('*');

    if (error) throw error;
    return data as Ramo[];
  }

  // Cambia los datos de un ramo que ya existe (solo los campos que se envian)
  async actualizarRamo(id_ramo: number, cambios: Partial<Ramo>) {
    const { error } = await supabase
      .from('ramos')
      .update(cambios)
      .eq('id_ramo', id_ramo);

    if (error) throw error;
  }

  // Elimina un ramo por su id.
  // Primero borra su asistencia, porque la tabla "asistencia" depende del ramo
  // y la base de datos no deja borrar un ramo que todavia tiene asistencia.
  async eliminarRamo(id_ramo: number) {
    const borrarAsistencia = await supabase
      .from('asistencia')
      .delete()
      .eq('id_ramo', id_ramo);

    if (borrarAsistencia.error) throw borrarAsistencia.error;

    // Tambien borramos los bloques de horario que pertenecen a este ramo
    const borrarBloques = await supabase
      .from('bloques')
      .delete()
      .eq('id_ramo', id_ramo);

    if (borrarBloques.error) throw borrarBloques.error;

    const { error } = await supabase
      .from('ramos')
      .delete()
      .eq('id_ramo', id_ramo);

    if (error) throw error;
  }
}
