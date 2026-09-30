import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonInput, IonButton, IonIcon, IonFooter, IonTabBar, IonTabButton, IonLabel,
} from '@ionic/angular';

// Los iconos se deben registrar antes de usarlos en el HTML
import { addIcons } from 'ionicons';
import { add, arrowBack, arrowForward, trashOutline, home, list, barChartOutline } from 'ionicons/icons';

// Servicios para guardar en Supabase
import { RamoService } from '../../../services/ramo.service';
import { BloqueService } from '../../../services/bloque.service';

// Un bloque de horario tal como se llena en el formulario
interface BloqueFormulario {
  dia: string;      // Ej: 'lunes' ('' si todavia no se elige)
  inicio: string;   // Ej: '08:00'
  termino: string;  // Ej: '09:30'
}

@Component({
  selector: 'app-agregar',
  templateUrl: './agregar.page.html',
  styleUrls: ['./agregar.page.scss'],
  imports: [
    FormsModule, RouterLink,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
    IonInput, IonButton, IonIcon, IonFooter, IonTabBar, IonTabButton, IonLabel,
  ],
})
export class AgregarPage {
  // Dias que se muestran como botones: "corto" es el texto del boton
  // y "nombre" es lo que se guarda en la base de datos
  dias = [
    { corto: 'Lun', nombre: 'lunes' },
    { corto: 'Mar', nombre: 'martes' },
    { corto: 'Mie', nombre: 'miercoles' },
    { corto: 'Jue', nombre: 'jueves' },
    { corto: 'Vie', nombre: 'viernes' },
    { corto: 'Sab', nombre: 'sabado' },
    { corto: 'Dom', nombre: 'domingo' },
  ];

  // Campos del formulario (se llenan con [(ngModel)] en el HTML)
  nombre = '';
  asistenciaMinima = 75;  // Por ahora solo se muestra, todavia no se guarda en la base de datos
  fechaInicio = '';       // Formato 'AAAA-MM-DD'
  fechaTermino = '';      // Formato 'AAAA-MM-DD'

  // Lista de bloques de horario (parte con uno)
  bloques: BloqueFormulario[] = [
    { dia: 'lunes', inicio: '08:00', termino: '09:30' },
  ];

  // Usamos signal() porque la app no usa zone.js:
  // asi la pantalla se actualiza despues de un "await"
  guardando = signal(false);  // true mientras se guarda (desactiva el boton)
  error = signal('');         // Mensaje de error, si algo sale mal

  constructor(
    private ramoService: RamoService,
    private bloqueService: BloqueService,
    private router: Router,
  ) {
    // Registramos los iconos que usa esta pagina
    addIcons({ add, arrowBack, arrowForward, trashOutline, home, list, barChartOutline });
  }

  // Agrega un bloque vacio al final de la lista
  agregarBloque() {
    this.bloques.push({ dia: '', inicio: '08:00', termino: '09:30' });
  }

  // Quita un bloque de la lista segun su posicion
  quitarBloque(posicion: number) {
    this.bloques.splice(posicion, 1);
  }

  // Calcula las clases del semestre: semanas entre las fechas × cantidad de bloques
  clasesTotales(): number {
    if (!this.fechaInicio || !this.fechaTermino) {
      return 0;
    }
    const unaSemana = 7 * 24 * 60 * 60 * 1000; // milisegundos en una semana
    const diferencia = new Date(this.fechaTermino).getTime() - new Date(this.fechaInicio).getTime();
    const semanas = Math.ceil(diferencia / unaSemana);
    return semanas > 0 ? semanas * this.bloques.length : 0;
  }

  // Revisa que todos los campos obligatorios esten llenos
  formularioValido(): boolean {
    const datosOk = this.nombre.trim() !== '' && this.fechaInicio !== '' && this.fechaTermino !== '';
    const fechasOk = this.fechaInicio <= this.fechaTermino; // El termino no puede ser antes del inicio
    const bloquesOk = this.bloques.length > 0 && this.bloques.every((b) => b.dia && b.inicio && b.termino);
    return datosOk && fechasOk && bloquesOk;
  }

  // Guarda el ramo y despues cada uno de sus bloques
  async guardar() {
    this.guardando.set(true);
    this.error.set('');

    try {
      // 1) Guardamos el ramo y recibimos su id_ramo
      const ramoGuardado = await this.ramoService.agregarRamo({
        ramo: this.nombre.trim(),
        fecha_inicio: this.fechaInicio,
        fecha_final: this.fechaTermino,
      });

      // 2) Guardamos cada bloque, enlazado al ramo con su id_ramo
      for (const bloque of this.bloques) {
        await this.bloqueService.agregarBloque({
          dia: bloque.dia,
          horario: bloque.inicio + ' - ' + bloque.termino, // Ej: '08:00 - 09:30'
          id_ramo: ramoGuardado.id_ramo,
        });
      }

      // 3) Volvemos al inicio (el home recarga los ramos solo)
      this.router.navigateByUrl('/home');
    } catch (e) {
      console.error('Error al guardar el ramo:', e);
      this.error.set('No se pudo guardar el ramo. Intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }

  // Vuelve al inicio sin guardar
  cancelar() {
    this.router.navigateByUrl('/home');
  }
}
