// ─────────────────────────────────────────────────────────────────────────────
//  src/chat/chat.gateway.ts
// ─────────────────────────────────────────────────────────────────────────────

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  duration?: number;
}

@WebSocketGateway({
  // ✅ Allow all origins — fixes mobile connection drop
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false,
  },
  // ✅ Allow both polling AND websocket — mobile needs polling fallback
  transports: ['websocket', 'polling'],
  // ✅ Increase ping timeout so mobile doesn't disconnect
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private onlineUsers = new Map<string, string>();

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (!userId) {
      client.disconnect(true);
      return;
    }
    client.data.userId = userId;
    this.onlineUsers.set(userId, client.id);
    this.server.emit('user_online', { userId });
    console.log(`[ChatGateway] ✅ connected  userId=${userId}  socket=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const userId: string | undefined = client.data.userId;
    if (userId) {
      this.onlineUsers.delete(userId);
      this.server.emit('user_offline', { userId });
      console.log(`[ChatGateway] ❌ disconnected  userId=${userId}`);
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoin(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.conversationId);
    console.log(`[ChatGateway] ${client.data.userId} joined room ${data.conversationId}`);
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: SendMessagePayload,
    @ConnectedSocket() _client: Socket,
  ) {
    const saved = await this.chatService.saveMessage({
      conversationId: data.conversationId,
      senderId:       data.senderId,
      receiverId:     data.receiverId,
      text:           data.text,
      fileUrl:        data.fileUrl,
      fileType:       data.fileType as any,
      fileName:       data.fileName,
      duration:       data.duration ?? 0,
    });

    this.server.to(data.conversationId).emit('receive_message', saved);
    return saved;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.conversationId).emit('user_typing', { userId: data.userId });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @MessageBody() data: { conversationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.conversationId).emit('user_stop_typing', { userId: data.userId });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    await this.chatService.markAsRead(data.messageId);
    this.server.to(data.conversationId).emit('message_read', { messageId: data.messageId });
  }
}