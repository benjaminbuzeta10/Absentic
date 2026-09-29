import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon } from '@ionic/angular';
import { UsuarioService } from '../../services/alumno.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonFab, IonFabButton, IonIcon, RouterLink],
})
export class HomePage {
  ramos = [
    {
      ramo: 'Matemáticas',
      duracionDias: 120,
      asistenciaMinima: 50,
      horarios: [
        { dia: 'Lunes', bloque: '08:00 - 09:30' },
        { dia: 'Lunes', bloque: '09:40 - 11:10' },
        { dia: 'Viernes', bloque: '08:00 - 09:30' },
      ],
      asistencias: [
        { fecha: '02/09/2026', presente: true },
        { fecha: '09/09/2026', presente: false },
      ],
    },
    {
      ramo: 'Lenguaje',
      duracionDias: 90,
      asistenciaMinima: 80,
      horarios: [
        { dia: 'Martes', bloque: '10:00 - 11:30' },
        { dia: 'Jueves', bloque: '10:00 - 11:30' },
      ],
      asistencias: [
        { fecha: '03/09/2026', presente: true },
        { fecha: '10/09/2026', presente: true },
      ],
    },
    {
      ramo: 'Ciencias',
      duracionDias: 90,
      asistenciaMinima: 60,
      horarios: [
        { dia: 'Viernes', bloque: '12:00 - 13:30' },
      ],
      asistencias: [
        { fecha: '04/09/2026', presente: true },
        { fecha: '05/09/2026', presente: false },
        { fecha: '06/09/2026', presente: false },
        { fecha: '07/09/2026', presente: false },
      ],
    },
  ];

  contarBloquesPorDia(horarios: { dia: string; bloque: string }[]): { dia: string; cantidad: number }[] {
    const conteoPorDia = new Map<string, number>();

    for (const horario of horarios) {
      conteoPorDia.set(horario.dia, (conteoPorDia.get(horario.dia) ?? 0) + 1);
    }

    return Array.from(conteoPorDia, ([dia, cantidad]) => ({ dia, cantidad }));
  }

  calcularAsistenciaActual(asistencias: { fecha: string; presente: boolean }[]): number {
    if (asistencias.length === 0) {
      return 0;
    }

    const presentes = asistencias.filter((asistencia) => asistencia.presente).length;
    return Math.round((presentes / asistencias.length) * 100);
  }

  constructor(private readonly usuarioservice: UsuarioService) {}

  async ionViewWillEnter(): Promise<void> {
    try {
      await this.usuarioservice.obtenerNombres();
    } catch (error) {
      console.error('No se pudieron cargar los alumnos:', error);
    }
  }
}
