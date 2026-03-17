// src/booked-appointment/appointment.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/appointments',
})
export class AppointmentGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-appointment')
  handleJoin(
    @MessageBody() appointmentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`appointment:${appointmentId}`);
  }

  @SubscribeMessage('leave-appointment')
  handleLeave(
    @MessageBody() appointmentId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`appointment:${appointmentId}`);
  }

  // Called by the scheduler after marking an appointment completed
  notifyCompleted(appointmentId: string) {
    this.server
      .to(`appointment:${appointmentId}`)
      .emit('appointment-completed', { appointmentId });
  }
}