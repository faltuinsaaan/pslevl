const WebSocket = require('ws');

const signalingUrl = 'ws://localhost:8080';

const phone = new WebSocket(signalingUrl);
const browser = new WebSocket(signalingUrl);

let phoneId;
let browserId;

console.log('Connecting clients...');

phone.on('open', () => {
    console.log('Phone connected');
    phone.send(JSON.stringify({ type: 'identify', payload: { clientType: 'phone' } }));
});

browser.on('open', () => {
    console.log('Browser connected');
    browser.send(JSON.stringify({ type: 'identify', payload: { clientType: 'browser' } }));
});

phone.on('message', (data) => {
    const msg = JSON.parse(data);
    // console.log('Phone received:', msg);
    if (msg.type === 'identify-ack') {
        phoneId = msg.payload.id;
        console.log(`Phone identified: ${phoneId}`);
        checkReady();
    }
});

browser.on('message', (data) => {
    const msg = JSON.parse(data);
    // console.log('Browser received:', msg);
    if (msg.type === 'identify-ack') {
        browserId = msg.payload.id;
        console.log(`Browser identified: ${browserId}`);
        checkReady();
    } else if (msg.type === 'offer') {
        console.log('Browser received OFFER from Phone!');
        if (msg.payload.sdp === 'TEST_SDP' && msg.senderId === phoneId) {
            console.log('SUCCESS: Signaling relay works! Sender ID matched.');
            process.exit(0);
        } else {
            console.error('FAIL: Payload or Sender ID mismatch');
            process.exit(1);
        }
    }
});

function checkReady() {
    if (phoneId && browserId) {
        console.log('Both identified. Sending offer from Phone to Browser...');
        phone.send(JSON.stringify({
            type: 'offer',
            targetId: browserId,
            payload: { sdp: 'TEST_SDP' }
        }));
    }
}

// Timeout
setTimeout(() => {
    console.error('TIMEOUT: Test did not complete in time');
    process.exit(1);
}, 5000);
