import { Component, signal } from '@angular/core';
// RouterLink es necesario para que funcione routerLink en el HTML (barra inferior)
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonCard, IonList, IonItem,
  IonLabel, IonNote, IonIcon, IonProgressBar, IonSpinner, ViewWillEnter,
  IonTabButton, IonTabBar, IonFooter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, warning, home, barChartOutline } from 'ionicons/icons';

// Servicios que leen los datos reales de Supabase
import { Ramo, RamoService } from '../../../services/ramo.service';
import { Bloque, BloqueService } from '../../../services/bloque.service';
import { Asistencia, AsistenciaService } from '../../../services/asistencia.service';

// Porcentaje minimo de asistencia para aprobar un ramo (igual que en el home)
const ASISTENCIA_MINIMA = 75;

// Por ahora mostramos un solo alumno (igual que en el home)
const ID_USUARIO = 2;

// Radio del anillo del promedio; con el se calcula la circunferencia
const RADIO = 36;

// Lo que necesita cada ramo para mostrarse en la comparativa y en el estado por ramo
interface ResumenRamo {
  id: number;               // id_ramo (lo usa el @for para identificar cada fila)
  nombre: string;           // Nombre del ramo
  porcentaje: number;       // Porcentaje de asistencia (0 a 100)
  cantidadBloques: number;  // Cuantos bloques horarios tiene el ramo
  clases: number;           // Cuantos registros de asistencia tiene el alumno en el ramo
  alDia: boolean;           // true si el porcentaje llega al minimo
}

@Component({
  selector: 'app-informes',
  templateUrl: './informes.page.html',
  styleUrls: ['./informes.page.scss'],
  imports: [
    RouterLink,
    IonHeader, IonToolbar, IonContent, IonCard, IonList, IonItem,
    IonLabel, IonNote, IonIcon, IonProgressBar, IonSpinner, IonTabButton, IonTabBar, IonFooter,
  ],
})
export class InformesPage implements ViewWillEnter {

  // Minimo exigido, para usarlo en el HTML (marca de la barra y textos)
  minimo = ASISTENCIA_MINIMA;

  // Datos del anillo: radio y largo total de la circunferencia
  radio = RADIO;
  circunferencia = 2 * Math.PI * RADIO;

  // Todo lo que se muestra va en signal(), porque llega despues de un "await"
  // y la app no usa zone.js: sin signal la pantalla no se actualizaria
  cargando = signal(false);          // true mientras se traen los datos por primera vez
  error = signal('');                // Mensaje de error ('' si no hay error)
  resumen = signal<ResumenRamo[]>([]); // Un elemento por cada ramo que se muestra
  promedio = signal(0);              // Promedio de los porcentajes de todos los ramos
  alDia = signal(0);                 // Cuantos ramos estan al dia
  enRiesgo = signal(0);              // Cuantos ramos estan en riesgo
  totalBloques = signal(0);          // Suma de los bloques de todos los ramos
  trazo = signal('0 0');             // Parte pintada del anillo (stroke-dasharray)

  constructor(
    private ramoService: RamoService,
    private bloqueService: BloqueService,
    private asistenciaService: AsistenciaService,
  ) {
    // Registramos todos los iconos que usa esta pagina, incluidos los de la barra inferior.
    // Si falta alguno, el icono no se dibuja (queda en blanco).
    addIcons({ checkmark, warning, home, barChartOutline });
  }

  // Ionic llama esta funcion cada vez que se entra a esta pagina,
  // asi los datos se actualizan si cambiaron en otra pagina
  ionViewWillEnter() {
    this.cargarDatos();
  }

  // Trae los datos de Supabase y calcula todo lo que se muestra
  async cargarDatos() {
    // Mostramos el spinner solo la primera vez (si ya hay datos, se reemplazan sin parpadeo)
    if (this.resumen().length === 0) {
      this.cargando.set(true);
    }
    this.error.set('');

    try {
      // Traemos todos los ramos y todos los bloques
      const todosLosRamos = await this.ramoService.obtenerRamos();
      const bloques = await this.bloqueService.obtenerBloques();

      // Asistencia solo del alumno que estamos mostrando
      const asistenciasAlumno = await this.asistenciaService.obtenerAsistenciaPorUsuario(ID_USUARIO);

      // Toda la asistencia, para detectar ramos nuevos (sin asistencia de nadie)
      const todaLaAsistencia = await this.asistenciaService.obtenerAsistencia();

      // Elegimos los ramos que se muestran y armamos el resumen de cada uno
      const lista: ResumenRamo[] = [];
      for (const ramo of todosLosRamos) {
        if (this.debeMostrarse(ramo, asistenciasAlumno, todaLaAsistencia)) {
          lista.push(this.crearResumen(ramo, bloques, asistenciasAlumno));
        }
      }

      // Guardamos la lista y calculamos los totales de la tarjeta de arriba
      this.resumen.set(lista);
      this.calcularTotales(lista);
    } catch (error) {
      console.error('Error al cargar los informes:', error);
      this.error.set('No se pudieron cargar los informes.');
    }

    // Terminamos de cargar (con o sin error)
    this.cargando.set(false);
  }

  // Dice si un ramo se muestra:
  // - si el alumno tiene asistencia en el, o
  // - si nadie tiene asistencia en el (es un ramo recien creado)
  debeMostrarse(ramo: Ramo, asistenciasAlumno: Asistencia[], todaLaAsistencia: Asistencia[]): boolean {
    // Revisamos si el alumno tiene algun registro en este ramo
    for (const a of asistenciasAlumno) {
      if (a.id_ramo === ramo.id_ramo) {
        return true;
      }
    }

    // Revisamos si alguien (cualquier alumno) tiene algun registro en este ramo
    for (const a of todaLaAsistencia) {
      if (a.id_ramo === ramo.id_ramo) {
        return false; // Tiene asistencia, pero no del alumno: no se muestra
      }
    }

    // Nadie tiene asistencia: es un ramo nuevo y si se muestra
    return true;
  }

  // Arma el resumen de un ramo: porcentaje, bloques, clases y si esta al dia
  crearResumen(ramo: Ramo, bloques: Bloque[], asistenciasAlumno: Asistencia[]): ResumenRamo {
    // Contamos los bloques del ramo:
    // los que tienen su id_ramo, o el bloque antiguo guardado en ramo.id_bloque
    let cantidadBloques = 0;
    for (const b of bloques) {
      if (b.id_ramo === ramo.id_ramo || b.id_bloque === ramo.id_bloque) {
        cantidadBloques++;
      }
    }

    // Recorremos la asistencia del alumno en este ramo
    let clases = 0;     // Todos los registros del ramo
    let presentes = 0;  // Registros 'presente'
    let ausentes = 0;   // Registros 'ausente' (los 'nulo' no se cuentan)
    for (const a of asistenciasAlumno) {
      if (a.id_ramo === ramo.id_ramo) {
        clases++;
        if (a.estado === 'presente') {
          presentes++;
        }
        if (a.estado === 'ausente') {
          ausentes++;
        }
      }
    }

    // Porcentaje de asistencia (si no hay clases contadas, se considera 100%)
    const contadas = presentes + ausentes;
    let porcentaje = 100;
    if (contadas > 0) {
      porcentaje = Math.round((presentes / contadas) * 100);
    }

    return {
      id: ramo.id_ramo!,
      nombre: ramo.ramo,
      porcentaje: porcentaje,
      cantidadBloques: cantidadBloques,
      clases: clases,
      alDia: porcentaje >= ASISTENCIA_MINIMA,
    };
  }

  // Calcula los datos de la tarjeta "Promedio de asistencia"
  calcularTotales(lista: ResumenRamo[]) {
    let sumaPorcentajes = 0;
    let alDia = 0;
    let enRiesgo = 0;
    let totalBloques = 0;

    // Sumamos los datos de cada ramo
    for (const r of lista) {
      sumaPorcentajes = sumaPorcentajes + r.porcentaje;
      totalBloques = totalBloques + r.cantidadBloques;
      if (r.alDia) {
        alDia++;
      } else {
        enRiesgo++;
      }
    }

    // Promedio de los porcentajes (0 si no hay ramos)
    let promedio = 0;
    if (lista.length > 0) {
      promedio = Math.round(sumaPorcentajes / lista.length);
    }

    // Parte pintada del anillo: largo proporcional al promedio, y luego el hueco
    const largoPintado = (promedio / 100) * this.circunferencia;

    this.promedio.set(promedio);
    this.alDia.set(alDia);
    this.enRiesgo.set(enRiesgo);
    this.totalBloques.set(totalBloques);
    this.trazo.set(largoPintado + ' ' + this.circunferencia);
  }
}
