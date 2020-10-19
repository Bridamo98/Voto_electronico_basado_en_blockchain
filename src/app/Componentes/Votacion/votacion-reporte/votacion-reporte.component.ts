import { ObtenerResultadosService } from './../../../LogicaP2P/ResultadoVotacion/obtener-resultados.service';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Votacion } from '../../../Modelo/Votacion';
import { VotacionService } from 'src/app/Servicios/votacion.service';
import { OpcionService } from '../../../Servicios/Opcion/opcion.service';
import { TipoVotacion } from '../../../Modelo/TipoVotacion';
import { environment } from '../../../../environments/environment';
import { VotarService } from 'src/app/Servicios/votar.service';
import { Mensaje } from 'src/app/Modelo/Blockchain/mensaje';
import { Subscription } from 'rxjs';
import { ResultsConverterService } from '../../../Utils/results-converter.service';
import { resolve } from 'dns';
import { rejects } from 'assert';
import { Usuario } from 'src/app/Modelo/Usuario';
import { Opcion } from 'src/app/Modelo/Opcion';

declare var inicializar: any;
declare var setVoto: any;
declare var enviarMensaje: any;

@Component({
  selector: 'app-votacion-reporte',
  templateUrl: './votacion-reporte.component.html',
  styleUrls: ['./votacion-reporte.component.css']
})
export class VotacionReporteComponent implements OnInit {

  votacion: Votacion = new Votacion();
  resultadoGanador: string = null;
  tipoVotacion: TipoVotacion = new TipoVotacion();
  private suscripcion: Subscription = null;
  resultados: Map<string, number> = new Map();
  totalVotos: number = 0;
  resultadosNombres: string[] = [];
  //votos: number[] = [];

  //canvas
  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;
  ctx;
  ejeLong = 250;
  dsp: number = 20;
  maxX: number = 300;
  maxY: number = 300;
  maxVal: number = -1;

  constructor(
    private router: Router,
    private rutaActiva: ActivatedRoute,
    private votacionService: VotacionService,
    private opcionService: OpcionService,
    private votarService: VotarService,
    private obtenerResultadosService: ObtenerResultadosService,
    private resultsConverterService: ResultsConverterService
  ) {
    this.votacion.id = this.rutaActiva.snapshot.params.id;
    this.votacion = {
      titulo: '',
      autor: '',
      id: this.votacion.id,
      fechaLimite: new Date(),
      plantillaAsociada: '',
      tipoDeVotacion: -1,
      descripcion: '',
      votos: 0,
      participantes: [],
      almacena: [],
      opcionDeVotacion: [],
      accesosExtra: []
    };
    this.tipoVotacion = { id: -1, nombre: '', descripcion: '' };
  }

  async ngOnInit() {
    this.votacion = await this.getVotacion();
    this.tipoVotacion = await this.actualizarTipo(this.votacion);
    this.votacion.participantes = await this.actualizarParticipantes(this.votacion);
    this.votacion.opcionDeVotacion = await this.actualizarOpciones(this.votacion);
    // inicializar();
    this.solicitarResultados(this.votacion.id.valueOf());
    this.suscripcion = this.obtenerResultadosService.observable.subscribe(() => {
      this.resultadoGanador = this.obtenerResultadosService.obtenerGanador();
      this.actualizarVotos(this.votacion);
      this.dibujar();
    });
  }

  // Solicita al servicio la votación
  getVotacion(): Promise<Votacion>{
    return new Promise<Votacion>((resolve, reject) =>
      this.votacionService.getVotacion(this.votacion.id.valueOf()).subscribe(resolve, reject)
    );
  }

  actualizarTipo(votacion: Votacion): Promise<TipoVotacion> {
    return new Promise<TipoVotacion>((resolve, reject) =>
      this.votacionService.getTipoVotacion(votacion.tipoDeVotacion.valueOf()).subscribe(resolve, reject)
    );
  }

  actualizarParticipantes(votacion: Votacion): Promise<Usuario[]> {
    return new Promise<Usuario[]>((resolve, reject) =>
      this.votacionService.getParticipanteVotacion(votacion.id.valueOf()).subscribe(resolve, reject)
    );
  }

  // Llama al servicio para leer los votos
  actualizarVotos(votacion: Votacion): void {
    votacion.almacena = [{ infoVoto: 1 }, { infoVoto: 1 }, { infoVoto: 0 }, { infoVoto: 1 }, { infoVoto: 0 }, { infoVoto: 2 }];
    //votacion.almacena = [];
    votacion.votos = votacion.almacena.length;

    this.resultados = this.resultsConverterService.obtenerResultadosPopular(this.resultadoGanador, this.votacion.opcionDeVotacion);
    for (const valor of this.resultados.values()) {
      this.totalVotos += valor;
    }
    this.resultadosNombres = Array.from(this.resultados.keys());
    console.log('--------------Resultado Ganador------------', this.resultadoGanador);
    console.log('----Mapa----', this.resultados);
  }

  actualizarOpciones(votacion: Votacion): Promise<Opcion[]> {
    return new Promise<Opcion[]>((resolve, reject) =>
      this.opcionService.getOpcion(votacion.id.valueOf()).subscribe(resolve, reject)
    );
  }

  registrarSolicitud(contenido){
    setVoto(contenido);
  }

  solicitarResultados(idVotacion: number): void {
    console.log('Solicitando resultados');
    const mensaje = new Mensaje(environment.calcularResultados, idVotacion);
    // this.registrarSolicitud(mensaje);
    this.votarService.obtenerValidadores()
      .subscribe(
        result => {
          this.obtenerResultadosService.inicializarResultados(result);
          result.forEach(element => {
            enviarMensaje(mensaje, element.peerId);
          });
        }
      );
  }

  //Dibujar
  dibujar(): void {
    this.canvas.nativeElement.width = this.maxX;
    this.canvas.nativeElement.height = this.maxY;
    this.maxY -= this.dsp;
    this.ctx = this.canvas.nativeElement.getContext("2d");
    this.calcularMaximo();
    let ancho = this.ejeLong / this.votacion.opcionDeVotacion.length;
    let unidad = this.ejeLong / this.maxVal;
    this.dibEjes(this.ejeLong, this.ejeLong);
    this.dibUnidades(unidad);
/*     for (let i = 0; i < this.votos.length; i++) {
      this.dibBarra(this.votacion.opcionDeVotacion[i].nombre.valueOf(), ancho * i, unidad * this.votos[i], ancho);
    } */
    let i = 0;
    for (const opcion of this.votacion.opcionDeVotacion) {
      const nombre = opcion.nombre.valueOf();
      this.dibBarra(nombre, ancho * i, unidad * this.resultados.get(nombre), ancho);
      i++;
    }
  }

  dibEjes(ancho: number, alto: number): void {
    this.ctx.moveTo(this.dsp, this.maxY);
    this.ctx.lineTo(this.dsp, this.maxY - alto);
    this.ctx.moveTo(this.dsp, this.maxY);
    this.ctx.lineTo(ancho + this.dsp, this.maxY);
    this.ctx.stroke();
  }

  dibBarra(nombre: string, x: number, y: number, ancho: number): void {
    this.ctx.fillStyle = "#277ed6";
    this.ctx.fillRect(x + this.dsp, this.maxY - y, ancho - 1, y);
    this.ctx.fillStyle = "#000000";
    this.ctx.font = "10px Arial";
    this.ctx.fillText(nombre.slice(0, 3), x + this.dsp, this.maxY + this.dsp);
  }

  dibUnidades(unidad: number): void {
    this.ctx.font = "8px Arial";
    let nCeros = this.numCeros();
    let numero = 0;
    for (let i = 0; i <= this.ejeLong + 1; i += unidad * Math.pow(10, nCeros)) {
      this.ctx.fillText(numero, 0, this.maxY - i);
      numero += Math.pow(10, nCeros);
    }
  }

  calcularMaximo(): void {
/*     for (let i = 0; i < this.votos.length; i++) {
      if (this.votos[i] > this.maxVal) {
        this.maxVal = this.votos[i];
      }
    } */
    for (const opcion of this.votacion.opcionDeVotacion) {
      let nombre = opcion.nombre.valueOf();
      if (this.resultados.get(nombre) > this.maxVal){
        this.maxVal = this.resultados.get(nombre);
      }
    }
  }

  numCeros(): number {
    let nCeros = 0;
    let val = this.maxVal;
    val /= 10;
    while (val >= 1) {
      nCeros++;
      val /= 10;
    }
    return nCeros;
  }
}
