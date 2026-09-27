import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/angular';
import { UsuarioService } from '../../services/alumno.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class HomePage {

  constructor(private readonly usuarioservice: UsuarioService) {}

  async ionViewWillEnter(): Promise<void> {
    try {
      await this.usuarioservice.obtenerNombres();
    } catch (error) {
      console.error('No se pudieron cargar los alumnos:', error);
    }
  }
}
