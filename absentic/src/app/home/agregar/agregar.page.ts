import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

interface BloqueHorario {
  dia: string | null;
  inicio: string;
  termino: string;
}

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  imports: [
    FormsModule,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonDatetime,
    IonDatetimeButton,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonTitle,
    IonToolbar,
  ]
})
export class AgregarPage {
  readonly dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  bloques: BloqueHorario[] = [
    { dia: 'Lunes', inicio: '08:00', termino: '09:30' },
    { dia: 'Viernes', inicio: '10:00', termino: '11:30' },
  ];

  seleccionarDia(bloque: BloqueHorario, dia: string): void {
    bloque.dia = dia;
  }

  agregarBloque(): void {
    this.bloques.push({ dia: null, inicio: '', termino: '' });
  }
}

