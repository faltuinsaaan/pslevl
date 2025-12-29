<script lang="ts">
    import { onMount } from "svelte";

    let videoEl: HTMLVideoElement;
    let containerEl: HTMLDivElement;
    let status = "Disconnected";
    let playerCount = 0;
    let ws: WebSocket;
    let pc: RTCPeerConnection;
    let myId: string;
    let streamerId: string | null = null;

    onMount(() => {
        const signalingUrl =
            import.meta.env.VITE_SIGNALING_URL || "ws://localhost:8080";
        ws = new WebSocket(signalingUrl);

        ws.onopen = () => {
            status = "Connected to Signaling";
            ws.send(
                JSON.stringify({
                    type: "identify",
                    payload: { clientType: "browser" },
                }),
            );
        };

        ws.onmessage = async (event) => {
            const msg = JSON.parse(event.data);
            console.log("Received:", msg);

            switch (msg.type) {
                case "identify-ack":
                    myId = msg.payload.id;
                    break;

                case "streamerConnected":
                    streamerId = msg.payload.id || msg.payload.streamerId;
                    status = "Streamer connected - waiting for offer";
                    break;

                case "streamerDisconnected":
                    streamerId = null;
                    status = "Streamer disconnected";
                    if (videoEl) videoEl.srcObject = null;
                    break;

                case "streamerList":
                    if (msg.payload?.streamers?.length > 0) {
                        streamerId = msg.payload.streamers[0].id;
                    }
                    break;

                case "playerCount":
                    playerCount = msg.payload.count;
                    break;

                case "config":
                    console.log("UE Config received:", msg.payload);
                    // Could update ICE servers from UE config
                    break;

                case "offer":
                    console.log("Received Offer");
                    await handleOffer(msg);
                    break;

                case "iceCandidate":
                case "ice-candidate":
                    if (pc && msg.payload) {
                        await pc.addIceCandidate(msg.payload);
                    }
                    break;

                case "ping":
                    ws.send(
                        JSON.stringify({
                            type: "pong",
                            targetId: msg.senderId,
                            payload: msg.payload,
                        }),
                    );
                    break;
            }
        };

        // Input forwarding functions
        function sendInput(type: string, data: any) {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                    JSON.stringify({
                        type,
                        payload: data,
                        targetId: streamerId,
                    }),
                );
            }
        }

        // Keyboard events
        function handleKeyDown(e: KeyboardEvent) {
            e.preventDefault();
            sendInput("KeyDown", {
                keyCode: e.keyCode,
                key: e.key,
                code: e.code,
            });
        }

        function handleKeyUp(e: KeyboardEvent) {
            e.preventDefault();
            sendInput("KeyUp", {
                keyCode: e.keyCode,
                key: e.key,
                code: e.code,
            });
        }

        // Mouse events
        function handleMouseDown(e: MouseEvent) {
            const rect = videoEl.getBoundingClientRect();
            sendInput("MouseDown", {
                button: e.button,
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
            });
        }

        function handleMouseUp(e: MouseEvent) {
            const rect = videoEl.getBoundingClientRect();
            sendInput("MouseUp", {
                button: e.button,
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
            });
        }

        function handleMouseMove(e: MouseEvent) {
            const rect = videoEl.getBoundingClientRect();
            sendInput("MouseMove", {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
                deltaX: e.movementX,
                deltaY: e.movementY,
            });
        }

        function handleWheel(e: WheelEvent) {
            e.preventDefault();
            sendInput("MouseWheel", { deltaY: e.deltaY });
        }

        // Attach event listeners
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        // Latency ticker
        let frameId: number;
        const loop = () => {
            frameId = requestAnimationFrame(loop);
        };
        frameId = requestAnimationFrame(loop);

        ws.onclose = () => {
            status = "Disconnected";
            cancelAnimationFrame(frameId);
        };

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
            if (ws) ws.close();
            if (pc) pc.close();
            cancelAnimationFrame(frameId);
        };
    });

    async function handleOffer(msg: any) {
        console.log("handleOffer called with:", msg);
        try {
            const config = {
                iceServers: [
                    { urls: "stun:stun.l.google.com:19302" },
                    { urls: "stun:stun1.l.google.com:19302" },
                    { urls: "stun:stun2.l.google.com:19302" },
                ],
                iceCandidatePoolSize: 10,
            };
            pc = new RTCPeerConnection(config);
            console.log("RTCPeerConnection created");

            pc.onicecandidate = (event) => {
                if (event.candidate && msg.senderId) {
                    console.log("Sending ICE candidate to:", msg.senderId);
                    ws.send(
                        JSON.stringify({
                            type: "ice-candidate",
                            targetId: msg.senderId,
                            payload: event.candidate,
                        }),
                    );
                }
            };

            pc.ontrack = (event) => {
                console.log("Track received:", event.track.kind);
                if (videoEl && event.streams[0]) {
                    videoEl.srcObject = event.streams[0];
                }
            };

            pc.onconnectionstatechange = () => {
                console.log("Connection state:", pc.connectionState);
                if (pc.connectionState === "connected") {
                    status = "Connected (Streaming)";
                } else if (pc.connectionState === "failed") {
                    status = "Connection Failed";
                }
            };

            pc.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", pc.iceConnectionState);
                if (pc.iceConnectionState === "failed") {
                    status = "ICE Failed - Check network";
                    console.error("ICE connection failed!");
                }
            };

            console.log("Setting remote description:", msg.payload);
            await pc.setRemoteDescription(msg.payload);
            console.log("Remote description set successfully");

            const answer = await pc.createAnswer();
            console.log("Answer created:", answer);

            await pc.setLocalDescription(answer);
            console.log("Local description set");

            // Send Answer back to Phone
            console.log("Sending answer to:", msg.senderId);
            ws.send(
                JSON.stringify({
                    type: "answer",
                    targetId: msg.senderId,
                    payload: answer,
                }),
            );
            status = "Connected (Streaming)";
        } catch (error) {
            console.error("handleOffer ERROR:", error);
            status = "Error: " + (error as Error).message;
        }
    }

    // Screen share function for demo
    async function startScreenShare() {
        try {
            status = "Starting screen share...";
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                },
                audio: false,
            });

            if (videoEl) {
                videoEl.srcObject = stream;
                status = "Screen Share Active! 🎬";
            }

            // Handle when user stops sharing
            stream.getVideoTracks()[0].onended = () => {
                status = "Screen share stopped";
                if (videoEl) videoEl.srcObject = null;
            };
        } catch (err) {
            console.error("Screen share error:", err);
            status = "Screen share cancelled";
        }
    }
</script>

<div class="container">
    <h1>Display Client</h1>
    <p>Status: <strong>{status}</strong></p>

    <div class="controls">
        <button on:click={startScreenShare} class="share-btn">
            📺 Share Your Screen
        </button>
        <p class="hint">
            Click to capture your screen and prove the video pipeline works!
        </p>
    </div>

    <div class="video-container">
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            bind:this={videoEl}
            autoplay
            playsinline
            controls={false}
            on:loadedmetadata={() => {
                // Low latency hint
                // @ts-ignore
                if (videoEl.playoutDelayHint !== undefined) {
                    // @ts-ignore
                    videoEl.playoutDelayHint = 0;
                }
            }}
        ></video>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        background: #000;
        color: #fff;
        font-family: system-ui;
    }
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
    }
    .video-container {
        background: #111;
        width: 80%;
        aspect-ratio: 16/9;
    }
    video {
        width: 100%;
        height: 100%;
        background: black;
    }
    .controls {
        margin-bottom: 20px;
        text-align: center;
    }
    .share-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        padding: 16px 32px;
        font-size: 18px;
        border-radius: 12px;
        cursor: pointer;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }
    .share-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }
    .hint {
        color: #888;
        font-size: 14px;
        margin-top: 8px;
    }
</style>
