import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
  IonIcon, IonProgressBar,
  IonFooter, IonTabBar, IonTabButton, IonLabel,
} from '@ionic/angular';

import { addIcons } from 'ionicons';
import { arrowBack, pencil, chevronDown, chevronUp, home, barChartOutline } from 'ionicons/icons';

import { Ramo, RamoService } from '../../../services/ramo.service';
import { Bloque, BloqueService } from '../../../services/bloque.service';
import { Asistencia, AsistenciaService } from '../../../services/asistencia.service';

// Componente hijo para editar el ramo
import { EditarPage } from './editar/editar.page';



const ASISTENCIA_MINIMA = 75;
const ID_USUARIO = 2;


// nombres de los dias, en el orden de Date.getDay()
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

// meses abreviados, en el orden de Date.getMonth()
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// clase de cierta fecha 
interface Clase {
  fecha: string;            // 'AAAA-MM-DD'
  texto: string;            // Ej: 'Lunes 2 de mar'
  numero: number;           // Clase 1, Clase 2...
  estado: string;           // 'presente', 'ausente', 'nulo' o '' (sin registro)
  registro?: Asistencia;    // Registro de la base de datos (si existe)
}


// cada bloque del ramo y sus clases
interface BloqueVista {
  bloque: Bloque;           // Bloque original de la base de datos
  diaCorto: string;         // Ej: 'LUN'
  inicio: string;           // Ej: '08:00'
  termino: string;          // Ej: '09:30'
  titulo: string;           // Ej: 'Lunes · 08:00–09:30'
  presentes: number;        // Clases asistidas
  contadas: number;         // Clases asistidas + faltas (sin contar nulas)
  porcentaje: number;       // Porcentaje de asistencia del bloque
  clases: Clase[];          // Registro de clases
}

// resumen de la tarjeta de arriba
interface Resumen {
  porcentaje: number;
  presentes: number;
  faltas: number;
  nulos: number;
  cantidadBloques: number;
  faltasRestantes: number;
  alDia: boolean;
}

@Component({
  selector: 'app-ramos',
  templateUrl: './ramos.page.html',
  styleUrls: ['./ramos.page.scss'],
  // 'ion-page' hace que este componente ocupe toda la pantalla encima del home
  host: { class: 'ion-page' },
  imports: [
    EditarPage,
    IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonContent,
    IonIcon, IonProgressBar,
    IonFooter, IonTabBar, IonTabButton, IonLabel,
  ],
})


export class RamosPage implements OnInit {


  // Para usarlo en el HTML
  minimo = ASISTENCIA_MINIMA;

  // Datos que se muestran (signal para que la pantalla se actualice despues de un "await")
  nombreRamo = signal('');
  resumen = signal<Resumen | null>(null);
  bloquesVista = signal<BloqueVista[]>([]);
  mensaje = signal('Cargando...');

  // ids de los bloques que tienen la lista de clases abierta
  abiertos: number[] = [];

  // Datos tal como vienen de la base de datos
  ramo?: Ramo;
  bloques: Bloque[] = [];
  asistencias: Asistencia[] = [];

  // Con inject() pedimos a Angular los servicios que necesita esta pagina
  private ramoService = inject(RamoService);
  private bloqueService = inject(BloqueService);
  private asistenciaService = inject(AsistenciaService);

  // INPUT: el home (padre) nos pasa el id del ramo asi: <app-ramos [idRamo]="...">
  idRamo = input.required<number>();

  // OUTPUT: avisamos al home (padre) que el usuario quiere volver
  volver = output<void>();

  // true cuando se esta editando el ramo (se muestra el hijo "editar")
  editando = signal(false);

  constructor() {
    addIcons({ arrowBack, pencil, chevronDown, chevronUp, home, barChartOutline });
  }

  // Angular llama esta funcion al crear el componente (el input ya tiene su valor)
  ngOnInit() {
    this.cargarDatos();
  }

  // Trae de Supabase el ramo, sus bloques y la asistencia, y arma la pantalla
  async cargarDatos() {
    try {
      // Leemos el id que nos paso el padre por el input
      const id = this.idRamo();

      // Buscamos el ramo
      const ramos = await this.ramoService.obtenerRamos();
      this.ramo = ramos.find((r) => r.id_ramo === id);
      if (!this.ramo) {
        this.mensaje.set('No se encontro el ramo.');
        return;
      }

      // Bloques del ramo (por id_ramo, o el bloque antiguo guardado en ramo.id_bloque)
      const todosLosBloques = await this.bloqueService.obtenerBloques();
      this.bloques = todosLosBloques.filter(
        (b) => b.id_ramo === id || b.id_bloque === this.ramo!.id_bloque,
      );

      // Asistencia del alumno en este ramo
      const asistenciaAlumno = await this.asistenciaService.obtenerAsistenciaPorUsuario(ID_USUARIO);
      this.asistencias = asistenciaAlumno.filter((a) => a.id_ramo === id);

      this.nombreRamo.set(this.ramo.ramo);
      this.mensaje.set('');
      this.armarVista();
    } catch (error) {
      console.error('Error al cargar el ramo:', error);
      this.mensaje.set('No se pudo cargar el ramo.');
    }
  }




// _______________________________________________________________________________
// armar y crear los datos para la vista de los bloques, y los resumenes


  // Abre la pagina de editar (el HTML le pasa el id por su input)
  abrirEditar() {
    this.editando.set(true);
  }

  // El hijo "editar" aviso que termino (output "volver"):
  // cerramos la edicion y recargamos, porque pudieron cambiar los datos
  cerrarEditar() {
    this.editando.set(false);
    this.cargarDatos();
  }

  // Calcula todo lo que se muestra en pantalla a partir de los datos
  armarVista() {

    //Cada bloque con su registro de clases
    const vista = this.bloques.map((b) => this.armarBloque(b));
    this.bloquesVista.set(vista);

    //Resumen de arriba: sumamos todos los estados para tener la cantida total de cada uno
    let presentes = 0, faltas = 0, nulos = 0;
    for (const b of vista) {
      for (const clase of b.clases) {
        if (clase.estado === 'presente') presentes++;
        if (clase.estado === 'ausente') faltas++;
        if (clase.estado === 'nulo') nulos++;
      }
    }
    const contadas = presentes + faltas; // Las nulas no cuentan
    const porcentaje = contadas === 0 ? 100 : Math.round((presentes / contadas) * 100);

    // Faltas restantes (mismo calculo que el home): 25% de las clases del semestre
    const totalClases = this.contarSemanas() * this.bloques.length || contadas;
    const faltasPermitidas = Math.floor(totalClases * (100 - ASISTENCIA_MINIMA) / 100);


    // ponemos los datos para la parte de resumen
    this.resumen.set({
      porcentaje: porcentaje,
      presentes: presentes,
      faltas: faltas,
      nulos: nulos,
      cantidadBloques: this.bloques.length,
      faltasRestantes: Math.max(faltasPermitidas - faltas, 0),
      alDia: porcentaje >= ASISTENCIA_MINIMA,
    });
  }

  // Arma lo que se muestra de un bloque
  armarBloque(bloque: Bloque): BloqueVista {
    // El horario viene como '08:00 - 09:30': lo separamos en inicio y termino
    const partes = (bloque.horario ?? '').split('-');
    const inicio = (partes[0] ?? '').trim();
    const termino = (partes[1] ?? '').trim();

    // Numero del dia de la semana (1 = lunes)
    const numeroDia = this.numeroDelDia(bloque.dia ?? '');
    const nombreDia = DIAS[numeroDia] ?? '';

    // Una clase por cada fecha en que tocaba este bloque
    const clases: Clase[] = this.fechasDeClase(numeroDia).map((fecha, i) => {
      // Buscamos si hay un registro de asistencia para esa fecha y ese bloque
    const registro = this.asistencias.find((a) => a.fecha === fecha && a.bloque === bloque.horario);
      return {
        fecha: fecha,
        texto: this.formatearFecha(fecha),
        numero: i + 1,
        estado: registro?.estado ?? '',
        registro: registro,
      };
    });

    const presentes = clases.filter((c) => c.estado === 'presente').length;
    const contadas = clases.filter((c) => c.estado === 'presente' || c.estado === 'ausente').length;

    // devolvemos los datos que seran ocupados para cada bloque
    return {
      bloque: bloque,
      diaCorto: nombreDia.slice(0, 3).toUpperCase(),
      inicio: inicio,
      termino: termino,
      titulo: nombreDia + ' · ' + inicio + '–' + termino,
      presentes: presentes,
      contadas: contadas,
      porcentaje: contadas === 0 ? 100 : Math.round((presentes / contadas) * 100),
      clases: clases,
    };
  }
// _______________________________________________________________________________
  // Cambia el estado de una clase y lo guarda en Supabase
  async cambiarEstado(bloque: Bloque, clase: Clase, nuevoEstado: string) {
    try {
      if (clase.registro?.id_asistencia) {
        // Ya existe el registro: solo cambiamos su estado
        await this.asistenciaService.actualizarEstado(clase.registro.id_asistencia, nuevoEstado);
        clase.registro.estado = nuevoEstado;
      } else {
        // No existe: creamos un registro nuevo para esa fecha
        const nuevo = await this.asistenciaService.agregarAsistencia({
          id_ramo: this.ramo?.id_ramo,
          bloque: bloque.horario,
          dia: bloque.dia,
          estado: nuevoEstado,
          id_usuario: ID_USUARIO,
          fecha: clase.fecha,
        });
        this.asistencias.push(nuevo);
      }
      // Recalculamos los porcentajes
      this.armarVista();
    } catch (error) {
      console.error('No se pudo guardar el estado:', error);
    }
  }
// _______________________________________________________________________________
  // Abre o cierra la lista de clases de un bloque
  alternarClases(id: number) {
    if (this.abiertos.includes(id)) {
      this.abiertos = this.abiertos.filter((x) => x !== id);
    } else {
      this.abiertos.push(id);
    }
  }

  // true si la lista de clases del bloque esta abierta
  estaAbierto(id: number): boolean {
    return this.abiertos.includes(id);
  }

  // Texto que se muestra en el chip de estado
  textoEstado(estado: string): string {
    if (estado === 'presente') return 'Asistido';
    if (estado === 'ausente') return 'Falta';
    if (estado === 'nulo') return 'Nulo';
    return 'Sin registro';
  }

  //______________funciones de fechas AAAAA___________________________________________

  // Devuelve todas las fechas ('AAAA-MM-DD') de un dia de la semana,
  // desde el inicio del ramo hasta su termino (o hasta hoy, si aun no termina)
  fechasDeClase(numeroDia: number): string[] {
    const fechas: string[] = [];
    if (!this.ramo?.fecha_inicio || !this.ramo?.fecha_final || numeroDia < 0) {
      return fechas;
    }

    const dia = this.crearFecha(this.ramo.fecha_inicio);
    const fin = this.crearFecha(this.ramo.fecha_final);
    const hoy = new Date();

    // Avanzamos dia por dia y guardamos los que coinciden con el dia del bloque
    while (dia <= fin && dia <= hoy) {
      if (dia.getDay() === numeroDia) {
        fechas.push(this.fechaATexto(dia));
      }
      dia.setDate(dia.getDate() + 1);
    }
    return fechas;
  }

  // Convierte 'lunes' / 'Miercoles' en su numero (0 = domingo ... 6 = sabado)
  numeroDelDia(dia: string): number {
    // Quitamos mayusculas y tildes para comparar: 'Miercoles' -> 'miercoles'
    const limpio = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return DIAS.findIndex((d) => limpio(d) === limpio(dia));
  }

  // Crea una fecha local desde 'AAAA-MM-DD' (asi no se corre un dia por la zona horaria)
  crearFecha(texto: string): Date {
    const [anio, mes, dia] = texto.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  // Convierte una fecha en texto 'AAAA-MM-DD'
  fechaATexto(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return fecha.getFullYear() + '-' + mes + '-' + dia;
  }

  // '2026-03-02' -> 'Lunes 2 de mar'
  formatearFecha(texto: string): string {
    const fecha = this.crearFecha(texto);
    return DIAS[fecha.getDay()] + ' ' + fecha.getDate() + ' de ' + MESES[fecha.getMonth()];
  }

  // Semanas entre el inicio y el termino del ramo
  contarSemanas(): number {
    if (!this.ramo?.fecha_inicio || !this.ramo?.fecha_final) {
      return 0;
    }
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    const diferencia = this.crearFecha(this.ramo.fecha_final).getTime() - this.crearFecha(this.ramo.fecha_inicio).getTime();
    return Math.ceil(diferencia / unaSemana);
  }
}
