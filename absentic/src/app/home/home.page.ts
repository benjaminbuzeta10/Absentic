import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonCard, IonCardContent, IonChip,
  IonProgressBar, IonBadge, IonIcon, IonFab, IonFabButton,
  IonFooter, IonTabBar, IonTabButton, IonLabel,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, home, list, barChartOutline, chevronForward } from 'ionicons/icons';

// servicos pal supabase
import { Ramo, RamoService } from '../../services/ramo.service';
import { Bloque, BloqueService } from '../../services/bloque.service';
import { Asistencia, AsistenciaService } from '../../services/asistencia.service';

// Componente hijo que muestra el detalle de un ramo
import { RamosPage } from './ramos/ramos.page';

// Porcentaje minimo de asistencia para aprobar un ramo
const ASISTENCIA_MINIMA = 75;

// es solo para filtrar por un alumno por ahora
const ID_USUARIO = 2;



// Un chip de la tarjeta, por ejemplo "Lunes ×2"
interface ChipDia {
  dia: string;       // Dia de la semana
  cantidad: number;  // Cuantos bloques tiene el ramo ese dia
}

// Lo que necesita cada tarjeta de la lista para mostrarse
interface TarjetaRamo {
  id: number;               // id_ramo (para abrir el detalle)
  nombre: string;           // Nombre del ramo
  chips: ChipDia[];         // Dias de clase con su cantidad de bloques
  porcentaje: number;       // Porcentaje de asistencia (0 a 100)
  faltasRestantes: number;  // Cuantas veces mas puede faltar
  alDia: boolean;           // true si esta sobre la asistencia minima
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    RouterLink, RamosPage,
    IonHeader, IonToolbar, IonContent, IonCard, IonCardContent, IonChip,
    IonProgressBar, IonBadge, IonIcon, IonFab, IonFabButton,
    IonFooter, IonTabBar, IonTabButton, IonLabel,
  ],
})
export class HomePage {

  // Lista de tarjetas que se muestra en pantalla
  tarjetas = signal<TarjetaRamo[]>([]);

  // texto que se muestra mientras cargan los datos o si hay error
  mensaje = signal('Cargando ramos...');

  // id del ramo abierto. Si es null, se muestra la lista; si tiene un numero,
  // se muestra el detalle (hijo) y se le pasa este id por su input
  ramoSeleccionado = signal<number | null>(null);

  constructor(
    private ramoService: RamoService,
    private bloqueService: BloqueService,
    private asistenciaService: AsistenciaService,
  ) {
    // registramos los iconos que usa esta pagina
    addIcons({ add, home, list, barChartOutline, chevronForward });
  }

  // ionic llama esta funcion cada vez que se entra a la pagina
  ionViewWillEnter() {
    this.cargarDatos();
  }

  // Trae los datos de Supabase y arma las tarjetas
  async cargarDatos() {
    try {
      //traemos todos los datos de la base de datos
      const todosLosRamos = await this.ramoService.obtenerRamos();
      const bloques = await this.bloqueService.obtenerBloques();

      // filtramos para el id del usuario que escogimos
      const asistencias = await this.asistenciaService.obtenerAsistenciaPorUsuario(ID_USUARIO);

      // hacemo un filtro para saber que ramos tiene el alumno
      // Traemos toda la asistencia para detectar ramos nuevos (sin asistencia de nadie)
      const todaLaAsistencia = await this.asistenciaService.obtenerAsistencia();

      // Mostramos los ramos donde el alumno tiene asistencia,
      // y tambien los ramos recien creados que aun no tienen asistencia
      const ramos = todosLosRamos.filter((ramo) =>
        asistencias.some((a) => a.id_ramo === ramo.id_ramo) ||
        !todaLaAsistencia.some((a) => a.id_ramo === ramo.id_ramo),
      );

      console.log(ramos)
      // Convertimos cada ramo en una tarjeta


      this.tarjetas.set(ramos.map((ramo) => this.crearTarjeta(ramo, bloques, asistencias)));

      // Si no hay ramos, mostramos un aviso
      this.mensaje.set(ramos.length === 0 ? 'No hay ramos registrados.' : '');
    } catch (error) {
      console.error('Error al cargar los ramos:', error);
      this.mensaje.set('No se pudieron cargar los ramos.');
    }
  }


  // Abre el detalle: guardamos el id y el HTML se lo pasa al hijo por su input
  abrirRamo(id: number) {
    this.ramoSeleccionado.set(id);
  }

  // El hijo aviso (output "volver"): cerramos el detalle y recargamos,
  // porque en el detalle se pudo cambiar la asistencia
  cerrarRamo() {
    this.ramoSeleccionado.set(null);
    this.cargarDatos();
  }

  // Arma los datos de una tarjeta a partir de un ramo
  crearTarjeta(ramo: Ramo, bloques:Bloque[], asistencias: Asistencia[]): TarjetaRamo {
    // Buscamos todos los bloques (dia y horario) de este ramo:
    // los que tienen su id_ramo, o el bloque guardado en ramo.id_bloque
    const bloquesDelRamo = bloques.filter(
      (b) => b.id_ramo === ramo.id_ramo || b.id_bloque === ramo.id_bloque,
    );

    // Nos quedamos solo con la asistencia de este ramo
    const registros = asistencias.filter((a) => a.id_ramo === ramo.id_ramo);

    // Contamos cuantas veces estuvo presente y cuantas falto
    // (las clases "nulo" no cuentan: se suspendieron)
    const presentes = registros.filter((a) => a.estado === 'presente').length;
    const ausentes = registros.filter((a) => a.estado === 'ausente').length;
    const contadas = presentes + ausentes;

    // Porcentaje de asistencia (si no hay registros, se considera 100%)
    const porcentaje = contadas === 0 ? 100 : Math.round((presentes / contadas) * 100);

    // Total de clases del semestre: semanas entre las fechas × bloques por semana.
    // Si el ramo no tiene fechas, usamos la cantidad de registros de asistencia.
    const totalClases = this.contarSemanas(ramo) * bloquesDelRamo.length || registros.length;

    // Faltas permitidas = el 25% de las clases (porque se exige 75%)
    const faltasPermitidas = Math.floor(totalClases * (100 - ASISTENCIA_MINIMA) / 100);

    return {
      id: ramo.id_ramo!,
      nombre: ramo.ramo,
      chips: this.contarBloquesPorDia(bloquesDelRamo),
      porcentaje: porcentaje,
      faltasRestantes: Math.max(faltasPermitidas - ausentes, 0), // Nunca menor que 0
      alDia: porcentaje >= ASISTENCIA_MINIMA,
    };
  }

  // Agrupa los bloques por dia. Ej: [lunes, lunes, viernes] -> Lunes ×2, Viernes ×1
  contarBloquesPorDia(bloques: Bloque[]): ChipDia[] {
    const chips: ChipDia[] = [];

    for (const bloque of bloques) {
      if (!bloque.dia) continue; // Saltamos bloques sin dia

      // Ponemos la primera letra en mayuscula: 'lunes' -> 'Lunes'
      const dia = bloque.dia.charAt(0).toUpperCase() + bloque.dia.slice(1);

      // Si ya existe un chip para ese dia, le sumamos 1; si no, lo creamos
      const chipExistente = chips.find((c) => c.dia === dia);
      if (chipExistente) {
        chipExistente.cantidad++;
      } else {
        chips.push({ dia: dia, cantidad: 1 });
      }
    }

    return chips;
  }

  // Cuenta cuantas semanas hay entre la fecha de inicio y la fecha final del ramo
  contarSemanas(ramo: Ramo): number {
    if (!ramo.fecha_inicio || !ramo.fecha_final) {
      return 0;
    }
    const inicio = new Date(ramo.fecha_inicio).getTime();
    const final = new Date(ramo.fecha_final).getTime();
    const unaSemana = 7 * 24 * 60 * 60 * 1000; // milisegundos en una semana
    return Math.ceil((final - inicio) / unaSemana);
  }
}
