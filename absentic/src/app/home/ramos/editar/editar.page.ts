import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
  IonInput, IonButton, IonIcon, IonFooter, IonTabBar, IonTabButton, IonLabel,
} from '@ionic/angular';

// Los iconos se deben registrar antes de usarlos en el HTML
import { addIcons } from 'ionicons';
import { add, arrowBack, arrowForward, trashOutline, home, barChartOutline } from 'ionicons/icons';

// Servicios para leer y guardar en Supabase
import { Ramo, RamoService } from '../../../../services/ramo.service';
import { Bloque, BloqueService } from '../../../../services/bloque.service';

// Un bloque de horario tal como se llena en el formulario
interface BloqueFormulario {
  dia: string;      // Ej: 'lunes' ('' si todavia no se elige)
  inicio: string;   // Ej: '08:00'
  termino: string;  // Ej: '09:30'
}

@Component({
  selector: 'app-editar',
  templateUrl: './editar.page.html',
  styleUrls: ['./editar.page.scss'],
  // 'ion-page' hace que este componente ocupe toda la pantalla encima de ramos
  host: { class: 'ion-page' },
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
    IonInput, IonButton, IonIcon, IonFooter, IonTabBar, IonTabButton, IonLabel,
  ],
})
export class EditarPage implements OnInit {
  // INPUT: ramos (padre) nos pasa el id del ramo asi: <app-editar [idRamo]="...">
  idRamo = input.required<number>();

  // OUTPUT: avisamos a ramos (padre) que hay que cerrar esta pagina
  volver = output<void>();

  // Con inject() pedimos a Angular los servicios que necesita esta pagina
  private ramoService = inject(RamoService);
  private bloqueService = inject(BloqueService);

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

  // Bloques que se editan en el formulario
  bloques: BloqueFormulario[] = [];

  // Bloques que tenia el ramo antes de editar (se borran al guardar)
  bloquesAnteriores: Bloque[] = [];

  // Usamos signal() porque la app no usa zone.js:
  // asi la pantalla se actualiza despues de un "await"
  cargando = signal(true);    // true mientras se traen los datos del ramo
  guardando = signal(false);  // true mientras se guarda (desactiva el boton)
  error = signal('');         // Mensaje de error, si algo sale mal

  constructor() {
    // Registramos los iconos que usa esta pagina
    addIcons({ add, arrowBack, arrowForward, trashOutline, home, barChartOutline });
  }

  // Angular llama esta funcion al crear el componente (el input ya tiene su valor)
  async ngOnInit() {
    try {
      const id = this.idRamo();

      // 1) Buscamos el ramo y llenamos el formulario con sus datos
      const ramos = await this.ramoService.obtenerRamos();
      const ramo = ramos.find((r) => r.id_ramo === id);
      if (!ramo) {
        this.error.set('No se encontro el ramo.');
        return;
      }
      this.nombre = ramo.ramo;
      this.fechaInicio = ramo.fecha_inicio ?? '';
      this.fechaTermino = ramo.fecha_final ?? '';

      // 2) Buscamos sus bloques (por id_ramo, o el bloque antiguo guardado en ramo.id_bloque)
      const todosLosBloques = await this.bloqueService.obtenerBloques();
      this.bloquesAnteriores = todosLosBloques.filter(
        (b) => b.id_ramo === id || b.id_bloque === ramo.id_bloque,
      );

      // 3) Pasamos cada bloque al formato del formulario
      for (const bloque of this.bloquesAnteriores) {
        this.bloques.push(this.bloqueAFormulario(bloque));
      }

      // Si el ramo no tenia bloques, dejamos uno vacio para llenar
      if (this.bloques.length === 0) {
        this.agregarBloque();
      }
    } catch (e) {
      console.error('Error al cargar el ramo:', e);
      this.error.set('No se pudo cargar el ramo.');
    } finally {
      // Al cambiar este signal, la pantalla se vuelve a dibujar con los datos
      this.cargando.set(false);
    }
  }

  // Convierte un bloque de la base de datos al formato del formulario
  // Ej: { dia: 'Lunes', horario: '08:00 - 09:30' } -> { dia: 'lunes', inicio: '08:00', termino: '09:30' }
  bloqueAFormulario(bloque: Bloque): BloqueFormulario {
    // Separamos el horario en inicio y termino
    const partes = (bloque.horario ?? '').split('-');
    const inicio = (partes[0] ?? '').trim();
    const termino = (partes[1] ?? '').trim();

    // Dejamos el dia en minusculas y sin tildes, igual que en la lista "dias"
    const dia = (bloque.dia ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

    return { dia: dia, inicio: inicio, termino: termino };
  }

  // Agrega un bloque vacio al final de la lista
  agregarBloque() {
    this.bloques.push({ dia: '', inicio: '08:00', termino: '09:30' });
  }

  // Quita un bloque de la lista segun su posicion
  quitarBloque(posicion: number) {
    this.bloques.splice(posicion, 1);
  }

  // Calcula las clases del semestre: semanas entre las fechas x cantidad de bloques
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

  // Guarda los cambios del ramo y reemplaza sus bloques
  async guardar() {
    this.guardando.set(true);
    this.error.set('');

    try {
      const id = this.idRamo();

      // 1) Actualizamos el nombre y las fechas del ramo.
      //    Tambien dejamos id_bloque en null: ahora los bloques se enlazan con id_ramo,
      //    y si no lo hacemos la base de datos no deja borrar el bloque antiguo.
      await this.ramoService.actualizarRamo(id, {
        ramo: this.nombre.trim(),
        fecha_inicio: this.fechaInicio,
        fecha_final: this.fechaTermino,
        id_bloque: null,
      });

      // 2) Borramos los bloques que tenia antes
      for (const bloque of this.bloquesAnteriores) {
        await this.bloqueService.eliminarBloque(bloque.id_bloque!);
      }

      // 3) Creamos los bloques tal como quedaron en el formulario
      for (const bloque of this.bloques) {
        await this.bloqueService.agregarBloque({
          dia: bloque.dia,
          horario: bloque.inicio + ' - ' + bloque.termino, // Ej: '08:00 - 09:30'
          id_ramo: id,
        });
      }

      // 4) Avisamos a ramos (padre) para que cierre esta pagina y recargue
      this.volver.emit();
    } catch (e) {
      console.error('Error al guardar los cambios:', e);
      this.error.set('No se pudieron guardar los cambios. Intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
