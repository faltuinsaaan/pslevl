import { WebSocketServer, WebSocket } from 'ws';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { Client, ClientType, SignalingMessage, PixelStreamingConfig } from './types';

const PORT = parseInt(process.env.PORT || '8080', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server for health checks
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            connections: clients.size,
            streamers: getStreamers().length,
            players: getPlayers().length,
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(426, { 'Content-Type': 'text/plain' });
        res.end('WebSocket server - upgrade required');
    }
});

// Create WebSocket server on top of HTTP server
const wss = new WebSocketServer({ server });

const clients = new Map<string, Client>();

// Streamer configuration storage
const streamerConfigs = new Map<string, PixelStreamingConfig>();

// Rate limiting map
const connectionRates = new Map<string, number[]>();
const MAX_CONNECTIONS_PER_MINUTE = 20;

function log(level: string, message: string, data?: any) {
    const entry = {
        level,
        time: new Date().toISOString(),
        message,
        ...(data && { data })
    };
    console.log(JSON.stringify(entry));
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60000;
    const requests = connectionRates.get(ip) || [];
    const recentRequests = requests.filter(t => now - t < windowMs);

    if (recentRequests.length >= MAX_CONNECTIONS_PER_MINUTE) {
        return true;
    }

    recentRequests.push(now);
    connectionRates.set(ip, recentRequests);
    return false;
}

// Helper functions
function getStreamers(): Client[] {
    return Array.from(clients.values()).filter(c => c.type === 'streamer');
}

function getPlayers(): Client[] {
    return Array.from(clients.values()).filter(c => c.type === 'browser' || c.type === 'phone');
}

function getPlayerCount(streamerId?: string): number {
    if (streamerId) {
        return Array.from(clients.values()).filter(c => c.connectedTo === streamerId).length;
    }
    return getPlayers().length;
}

function broadcastToPlayers(message: any, streamerId?: string) {
    const players = streamerId
        ? Array.from(clients.values()).filter(c => c.connectedTo === streamerId)
        : getPlayers();

    players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(message));
        }
    });
}

function broadcastToStreamers(message: any) {
    getStreamers().forEach(streamer => {
        if (streamer.ws.readyState === WebSocket.OPEN) {
            streamer.ws.send(JSON.stringify(message));
        }
    });
}

function sendStreamerList(ws: WebSocket) {
    const streamers = getStreamers().map(s => ({
        id: s.id,
        streamerId: s.streamerId || s.id
    }));
    ws.send(JSON.stringify({ type: 'streamerList', payload: { streamers } }));
}

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = req.socket.remoteAddress || 'unknown';

    if (isRateLimited(ip)) {
        log('warn', 'Rate limited connection attempt', { ip });
        ws.close(1008, 'Rate limited');
        return;
    }

    const id = uuidv4();
    let clientType: ClientType | null = null;
    let client: Client;

    log('info', 'New connection', { id, ip });

    const identifyTimeout = setTimeout(() => {
        if (!clientType) {
            log('warn', 'Connection timed out - no identify', { id });
            ws.close(1008, 'Identify timeout');
        }
    }, 30000);

    ws.on('message', (data: string) => {
        try {
            const message: SignalingMessage = JSON.parse(data.toString());

            switch (message.type) {
                case 'identify':
                    clearTimeout(identifyTimeout);
                    clientType = message.payload.clientType;

                    if (clientType) {
                        client = {
                            id,
                            type: clientType,
                            ws,
                            streamerId: message.payload.streamerId
                        };
                        clients.set(id, client);
                        log('info', 'Client identified', { id, type: clientType });

                        // Send acknowledgment
                        ws.send(JSON.stringify({ type: 'identify-ack', payload: { id } }));

                        if (clientType === 'streamer') {
                            // Notify all players about new streamer
                            broadcastToPlayers({
                                type: 'streamerConnected',
                                payload: { id, streamerId: message.payload.streamerId || id }
                            });
                            log('info', 'Streamer connected', { id });
                        } else {
                            // Player joined - notify streamers and send streamer list
                            sendStreamerList(ws);
                            broadcastToStreamers({
                                type: 'playerConnected',
                                payload: { id, type: clientType }
                            });

                            // Auto-connect to first available streamer
                            const streamers = getStreamers();
                            if (streamers.length > 0) {
                                client.connectedTo = streamers[0].id;
                                ws.send(JSON.stringify({
                                    type: 'streamerConnected',
                                    payload: { id: streamers[0].id }
                                }));
                            }

                            // Notify existing peers
                            clients.forEach((c) => {
                                if (c.id !== id && c.ws.readyState === WebSocket.OPEN) {
                                    c.ws.send(JSON.stringify({ type: 'peer-joined', payload: { id, type: clientType } }));
                                    ws.send(JSON.stringify({ type: 'peer-joined', payload: { id: c.id, type: c.type } }));
                                }
                            });
                        }

                        // Broadcast updated player count
                        broadcastToStreamers({ type: 'playerCount', payload: { count: getPlayerCount() } });
                    }
                    break;

                case 'config':
                    // UE streamer sends its configuration
                    if (clientType === 'streamer') {
                        streamerConfigs.set(id, message.payload);
                        log('info', 'Streamer config received', { id });
                        // Forward config to all connected players
                        broadcastToPlayers({ type: 'config', payload: message.payload }, id);
                    }
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                case 'offer':
                case 'answer':
                case 'iceCandidate':
                case 'ice-candidate':
                    // Relay WebRTC signaling messages
                    if (message.targetId) {
                        const target = clients.get(message.targetId);
                        if (target && target.ws.readyState === WebSocket.OPEN) {
                            const relayedMessage = { ...message, senderId: id };
                            target.ws.send(JSON.stringify(relayedMessage));
                        } else {
                            log('warn', 'Target not found', { targetId: message.targetId });
                        }
                    } else if (clientType === 'browser' || clientType === 'phone') {
                        // If no targetId, send to connected streamer
                        const client = clients.get(id);
                        if (client?.connectedTo) {
                            const streamer = clients.get(client.connectedTo);
                            if (streamer && streamer.ws.readyState === WebSocket.OPEN) {
                                const relayedMessage = { ...message, senderId: id, playerId: id };
                                streamer.ws.send(JSON.stringify(relayedMessage));
                            }
                        }
                    } else if (clientType === 'streamer' && message.playerId) {
                        // Streamer sending to specific player
                        const player = clients.get(message.playerId);
                        if (player && player.ws.readyState === WebSocket.OPEN) {
                            const relayedMessage = { ...message, senderId: id };
                            player.ws.send(JSON.stringify(relayedMessage));
                        }
                    }
                    break;

                // Input forwarding messages (browser -> streamer)
                case 'KeyDown':
                case 'KeyUp':
                case 'KeyPress':
                case 'MouseDown':
                case 'MouseUp':
                case 'MouseMove':
                case 'MouseWheel':
                case 'TouchStart':
                case 'TouchMove':
                case 'TouchEnd':
                case 'GamepadButtonPressed':
                case 'GamepadButtonReleased':
                case 'GamepadAnalog':
                case 'input':
                    // Forward input to connected streamer
                    const senderClient = clients.get(id);
                    if (senderClient?.connectedTo) {
                        const streamer = clients.get(senderClient.connectedTo);
                        if (streamer && streamer.ws.readyState === WebSocket.OPEN) {
                            streamer.ws.send(JSON.stringify({ ...message, playerId: id }));
                        }
                    } else {
                        // Send to first available streamer
                        const streamers = getStreamers();
                        if (streamers.length > 0) {
                            streamers[0].ws.send(JSON.stringify({ ...message, playerId: id }));
                        }
                    }
                    break;

                default:
                    log('debug', 'Unknown message type', { type: message.type });
            }
        } catch (err) {
            log('error', 'Error parsing message', { error: (err as Error).message });
        }
    });

    ws.on('close', () => {
        clearTimeout(identifyTimeout);
        log('info', 'Client disconnected', { id, type: clientType });

        const disconnectedClient = clients.get(id);
        clients.delete(id);
        streamerConfigs.delete(id);

        if (clientType === 'streamer') {
            // Notify all players that streamer disconnected
            broadcastToPlayers({ type: 'streamerDisconnected', payload: { id } });
        } else {
            // Notify streamers that player disconnected
            broadcastToStreamers({
                type: 'playerDisconnected',
                payload: { id, count: getPlayerCount() }
            });
        }

        // Notify all peers
        clients.forEach((c) => {
            if (c.ws.readyState === WebSocket.OPEN) {
                c.ws.send(JSON.stringify({ type: 'peer-left', payload: { id } }));
            }
        });

        // Broadcast updated player count
        broadcastToStreamers({ type: 'playerCount', payload: { count: getPlayerCount() } });
    });

    ws.on('error', (err) => {
        log('error', 'WebSocket error', { id, error: err.message });
    });
});

// Start server
server.listen(PORT, () => {
    log('info', 'Signaling server started (Pixel Streaming compatible)', { port: PORT, env: NODE_ENV });
});

// Graceful shutdown
function shutdown(signal: string) {
    log('info', 'Shutdown signal received', { signal });

    clients.forEach((client) => {
        client.ws.close(1001, 'Server shutting down');
    });

    wss.close(() => {
        server.close(() => {
            log('info', 'Server closed');
            process.exit(0);
        });
    });

    setTimeout(() => {
        log('warn', 'Forcing shutdown');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
