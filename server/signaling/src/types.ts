import { WebSocket } from 'ws';

// Client types - 'streamer' is for Unreal Engine Pixel Streaming instance
export type ClientType = 'phone' | 'browser' | 'server' | 'streamer';

// All supported signaling message types
export type MessageType =
    // Core signaling
    | 'identify' | 'identify-ack'
    | 'offer' | 'answer' | 'iceCandidate' | 'ice-candidate'
    | 'ping' | 'pong' | 'error'
    // Peer management
    | 'peer-joined' | 'peer-left'
    // UE Pixel Streaming specific
    | 'config'                     // Streamer sends configuration
    | 'playerCount'                // Broadcast player count
    | 'playerConnected'            // Player connected notification
    | 'playerDisconnected'         // Player disconnected notification
    | 'streamerConnected'          // Streamer connected notification
    | 'streamerDisconnected'       // Streamer disconnected notification
    | 'streamerList'               // List of available streamers
    // Input forwarding (browser -> streamer)
    | 'input'                      // Generic input event
    | 'KeyDown' | 'KeyUp' | 'KeyPress'
    | 'MouseDown' | 'MouseUp' | 'MouseMove' | 'MouseWheel'
    | 'TouchStart' | 'TouchMove' | 'TouchEnd'
    | 'GamepadButtonPressed' | 'GamepadButtonReleased' | 'GamepadAnalog';

export interface SignalingMessage {
    type: MessageType;
    payload?: any;
    targetId?: string;
    senderId?: string;
    playerId?: string;     // UE player ID
    streamerId?: string;   // UE streamer ID
}

export interface Client {
    id: string;
    type: ClientType;
    ws: WebSocket;
    streamerId?: string;   // For streamers: their streamer ID
    connectedTo?: string;  // For players: which streamer they're connected to
}

// Pixel Streaming configuration from UE
export interface PixelStreamingConfig {
    peerConnectionOptions?: {
        iceServers?: { urls: string[] }[];
    };
}
