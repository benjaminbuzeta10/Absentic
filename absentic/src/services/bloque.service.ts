import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

// Forma de un bloque de horario, igual que la tabla "bloques"
export interface Bloque {
  id_bloque?: number;        // Lo genera la base de datos, no hace falta enviarlo
  horario?: string | null;   // Ej: '08:30 - 10:00'
  dia?: string | null;       // Ej: 'lunes'
  id_ramo?: number | null;   // Ramo al que pertenece (un ramo puede tener varios bloques)
}

@Injectable({ providedIn: 'root' })
export class BloqueService {

  // Agrega un bloque nuevo y lo devuelve (con su id)
  async agregarBloque(bloque: Bloque) {
    const { data, error } = await supabase
      .from('bloques')
      .insert(bloque)
      .select()
      .single();

    if (error) throw error;
    return data as Bloque;
  }

  // Devuelve todos los bloques
  async obtenerBloques() {
    const { data, error } = await supabase
      .from('bloques')
      .select('*');

    if (error) throw error;
    return data as Bloque[];
  }

  // Elimina un bloque por su id
  // (fallara si algun ramo todavia usa este bloque)
  async eliminarBloque(id_bloque: number) {
    const { error } = await supabase
      .from('bloques')
      .delete()
      .eq('id_bloque', id_bloque);

    if (error) throw error;
  }
}
