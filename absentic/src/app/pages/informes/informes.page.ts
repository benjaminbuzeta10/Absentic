import { Component, computed, inject, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonContent, IonCard, IonList, IonItem,
  IonLabel, IonNote, IonIcon, IonProgressBar, IonSpinner, ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, warning } from 'ionicons/icons';
import { Ramo } from '../../../models/ramo.model';
import { RamosService } from '../../../services/ramos.service';

// Radio del anillo del promedio; la circunferencia define cuánto se pinta.
const RADIO = 36;

@Component({
  selector: 'app-informes',
  templateUrl: './informes.page.html',
  styleUrls: ['./informes.page.scss'],
  imports: [
    IonHeader, IonToolbar, IonContent, IonCard, IonList, IonItem,
    IonLabel, IonNote, IonIcon, IonProgressBar, IonSpinner,
  ],
})
export class InformesPage implements ViewWillEnter {
  private servicio = inject(RamosService);

  cargando = signal(false);
  private ramos = signal<Ramo[]>([]);

  // Cada ramo con su % y si cumple el mínimo: lo usan la comparativa y el estado por ramo.
  resumen = computed(() =>
    this.ramos().map((ramo) => {
      const porcentaje = this.servicio.porcentajeAsistencia(ramo);
      return { ramo, porcentaje, alDia: porcentaje >= ramo.asistenciaMinima };
    }),
  );

  promedio = computed(() => {
    const lista = this.resumen();
    if (lista.length === 0) return 0;
    return Math.round(lista.reduce((suma, r) => suma + r.porcentaje, 0) / lista.length);
  });

  alDia = computed(() => this.resumen().filter((r) => r.alDia).length);
  enRiesgo = computed(() => this.resumen().filter((r) => !r.alDia).length);
  totalBloques = computed(() => this.ramos().reduce((suma, r) => suma + r.bloques.length, 0));

  radio = RADIO;
  circunferencia = 2 * Math.PI * RADIO;
  // Parte pintada del anillo, proporcional al promedio.
  trazo = computed(() => `${(this.promedio() / 100) * this.circunferencia} ${this.circunferencia}`);

  constructor() {
    addIcons({ checkmark, warning });
  }

  async ionViewWillEnter() {
    this.cargando.set(this.ramos().length === 0);
    this.ramos.set(await this.servicio.todos());
    this.cargando.set(false);
  }
}
