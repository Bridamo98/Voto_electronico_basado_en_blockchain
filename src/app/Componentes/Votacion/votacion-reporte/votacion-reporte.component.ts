import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Votacion } from '../../../Modelo/Votacion';
import { Usuario } from 'src/app/Modelo/Usuario';

@Component({
  selector: 'app-votacion-reporte',
  templateUrl: './votacion-reporte.component.html',
  styleUrls: ['./votacion-reporte.component.css']
})
export class VotacionReporteComponent implements OnInit {

  votacion: Votacion = new Votacion();

  //canvas
  @ViewChild('canvas', { static: true })
  canvas: ElementRef<HTMLCanvasElement>;
  ctx;
  dsp: number = 20;
  maxX: number = 300;
  maxY: number = 300;
  votos: number[] = [];
  maxVal: number = -1;

  constructor(
    private router: Router,
    private rutaActiva: ActivatedRoute
  ) {
    this.votacion.titulo = this.rutaActiva.snapshot.params.titulo;
  }

  ngOnInit(): void {
    this.getVotacion();
    this.contarVotos();
    this.dibujar();
  }

  // Solicita al servicio la votación
  getVotacion(): void {
    this.votacion = {
      titulo: 'votacion 1',
      fechaLimite: new Date(),
      plantillaAsociada: 'plantilla-1',
      tipoDeVotacion: 'popular',
      participantes: [new Usuario('Brandonn', 0, 'bra@', '123'), new Usuario('Alice', 0, 'ali@', '456'),
      new Usuario('Brandonn', 0, 'bra@', '123'), new Usuario('Alice', 0, 'ali@', '456'),
      new Usuario('Brandonn', 0, 'bra@', '123'), new Usuario('Alice', 0, 'ali@', '456')],
      almacena: [{ infoVoto: 1 }, { infoVoto: 1 }, { infoVoto: 0 }, { infoVoto: 1 }, { infoVoto: 0 }, { infoVoto: 2 }],
      opcionDeVotacion: [{
        descripcion: 'Candidato',
        id: 'a',
        nombre: 'Alice'
      },
      {
        descripcion: 'Candidato',
        id: 'b',
        nombre: 'Bob'
      },
      {
        descripcion: 'Candidato',
        id: 'c',
        nombre: 'Carl'
      }],
      acesosExtra: []
    };
  }

  // Seguramente debe ser reemplazada esta función si se hace la correción
  contarVotos(): void {
    for (let i = 0; i < this.votacion.opcionDeVotacion.length; i++) {
      this.votos.push(0);
    }
    for (let i = 0; i < this.votacion.almacena.length; i++) {
      const v = this.votacion.almacena[i];
      this.votos[v.infoVoto.valueOf()]++;
    }
  }

  dibujar(): void {
    this.canvas.nativeElement.width = this.maxX;
    this.canvas.nativeElement.height = this.maxY;
    this.maxY -= this.dsp;
    this.ctx = this.canvas.nativeElement.getContext("2d");
    this.calcularMaximo();
    let ancho = 250 / this.votacion.opcionDeVotacion.length;
    let unidad = 250 / this.maxVal;
    this.dibEjes(250, 250);
    this.dibUnidades(unidad);
    for (let i = 0; i < this.votos.length; i++) {
      this.dibBarra(this.votacion.opcionDeVotacion[i].nombre.valueOf(), ancho * i, unidad * this.votos[i], ancho);
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
    this.ctx.fillStyle = "#FF0000";
    this.ctx.fillRect(x + this.dsp, this.maxY - y, ancho - 1, y);
    this.ctx.fillStyle = "#000000";
    this.ctx.font = "10px Arial";
    this.ctx.fillText(nombre.slice(0, 3), x + this.dsp, this.maxY + this.dsp);
  }

  dibUnidades(unidad: number): void {
    this.ctx.font = "8px Arial";
    let nCeros = this.numCeros();
    let numero = 0;
    for (let i = 0; i <= 251; i += unidad * Math.pow(10, nCeros)) {
      this.ctx.fillText(numero, 0, this.maxY - i);
      numero += Math.pow(10, nCeros);
    }
  }

  calcularMaximo(): void {
    for (let i = 0; i < this.votos.length; i++) {
      if (this.votos[i] > this.maxVal) {
        this.maxVal = this.votos[i];
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
