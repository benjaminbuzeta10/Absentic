import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';



export interface Usuarios {
  nombre?: string | null;
  [campo: string]: unknown;
}

@Injectable({ providedIn: 'root' })

export class UsuarioService {
  async obtenerNombres(): Promise<string[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');

      console.log(data)

    if (error) {
      console.error('Error al obtener los alumnos de Supabase:', error);
      throw error;
    }

    const nombres = ((data ?? []) as Usuarios[])
      .map((alumno) => alumno.nombre?.trim())
      .filter((nombre): nombre is string => Boolean(nombre));

    console.log('Nombres de los alumnos:', nombres);
    return nombres;
  }
}