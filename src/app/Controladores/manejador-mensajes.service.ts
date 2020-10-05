import { ConvertersService } from './../Utils/converters.service';
import { Votacion } from './../Modelo/Votacion';
import { CrearVotacionP2PService } from './../LogicaP2P/crear-votacion-p2-p.service';
import { VotarP2PService } from './../LogicaP2P/votar-p2-p.service';
import { BlockchainService } from './../LogicaP2P/blockchain.service';
import { VotarService } from './../Servicios/votar.service';
import { EnvioMensajesService } from './../LogicaP2P/envio-mensajes.service';
import { CifradoService } from './../Servicios/Cifrado-Firma/cifrado.service';
import { environment } from './../../environments/environment';
import { Mensaje } from './../Modelo/Blockchain/mensaje';
import { Injectable } from '@angular/core';
import { ListenerSocketsService } from './../LogicaP2P/listener-sockets.service';
import { Observable } from 'rxjs';
import * as io from 'socket.io-client';
import { AlgoritmoConsensoP2pService } from '../LogicaP2P/algoritmo-consenso-p2p.service';
import { Bloque } from '../Modelo/Blockchain/bloque';
import { Transaccion } from '../Modelo/Blockchain/transaccion';
import { SyncBlockchainP2pService } from '../LogicaP2P/sync-blockchain-p2p.service';

declare var peer_id;

@Injectable({
  providedIn: 'root',
})
export class ManejadorMensajesService {
  socket: any;
  // Atributos de un voto
  voto: any; // se encrypta
  firma: any; // se crea con el voto y sign
  peerValidador: any;
  encryptId: any; // Puede ser la misma pk

  constructor(
    private listenerSocket: ListenerSocketsService,
    private votarP2PService: VotarP2PService,
    public cifradoService: CifradoService,
    public envioMensajesService: EnvioMensajesService,
    private consensoService: AlgoritmoConsensoP2pService,
    private syncBlockchainService: SyncBlockchainP2pService,
    private convertersService: ConvertersService
  ) {}

  setVoto(pVoto) {
    this.voto = pVoto;
  }

  decrypt(data) {
    return this.cifradoService.decrypt(data);
  }

  checkSing(voto, firma, firmaKey) {
    return this.cifradoService.checkSing(voto, firma, firmaKey);
  }

  redirigirMensaje(data: Mensaje, peerId: any) {
    let mensaje;
    if (typeof data === 'string') {
      mensaje = JSON.parse(data);
    } else {
      mensaje = data;
    }

    switch (mensaje.tipoPeticion) {
      case environment.aprobarBloque:
        this.consensoService.aprobarBloque(
          ConvertersService.convertirBloques(mensaje.contenido)
        );
        break;
      case environment.obtenerResultados:
        break;
      case environment.ofrecerBloque:
        console.log('Bloque propuesto recibido', mensaje.contenido);
        this.consensoService.validarBloque(
          ConvertersService.convertirBloques(mensaje.contenido),
          peerId
        );
        break;
      case environment.syncBlockchain:
        this.enviarBlockchainActualizada(mensaje.contenido, peerId);
        break;
        case environment.solicitarBCH:
          this.syncBlockchainService.enviarBlockChainCompleta(peerId);
        break;
      case environment.syncCompleteBlockchain:
        this.syncBlockchainService.syncBlockchainCompleta(mensaje.contenido);
        break;
      case environment.responderPk:
        // Creo el voto con su incripcion
        const votoCifrado = this.cifradoService.encryptExternal(
          mensaje.contenido['pk'],
          this.voto
        );
        const firmaVoto = this.cifradoService.sign(votoCifrado);

        console.log(
          'Firmado?: ' +
            this.cifradoService.checkSing(
              votoCifrado,
              firmaVoto,
              this.cifradoService.getSignaturePublic()
            )
        );

        const votoToServer = {
          voto: votoCifrado,
          firma: firmaVoto,
          firmaKey: this.cifradoService.getSignaturePublic(),
          peerValidador: mensaje.contenido['peerValidador'],
        };
        // let votoToServer;
        // console.log(this.votarService.enviarVoto(votoToServer));

        console.log('Emitiendo al servidor');
        this.listenerSocket.emit('voto', votoToServer);

        break;
      case environment.votar:
        this.votarP2PService.votar(mensaje.contenido);
        //////////////////////////////////////////////////
        this.votarP2PService.imprimirTransacciones();
        /////////////////////////////////////////////////
        break;
      case environment.obtenerPk:
        // generar pk
        const pkAndPeer = {
          pk: this.cifradoService.getEncryptPublicKey(),
          peerValidador: peer_id,
        };

        // Sockets
        this.socket = io(environment.socketUrl);

        // Envio La PK
        const data = new Mensaje(environment.responderPk, pkAndPeer);
        this.envioMensajesService.enviarPk(JSON.stringify(data), peerId);

        break;

      default:
        break;
    }
  }

  enviarBlockchainActualizada(contenido: any, peerId: any) {
    console.log('La actualización que se recibe es', contenido);
    const hash: string = null;
    const blockchain = new Map<number, Map<string, Bloque>>();
    const ultHash = new Map<number, string>();
    ConvertersService.convertirActualizacion(
      contenido,
      hash,
      blockchain,
      ultHash
    );
    this.syncBlockchainService.sincronizarBlockchain(
      contenido['hash'],
      blockchain,
      ultHash,
      peerId
    );
  }
}
