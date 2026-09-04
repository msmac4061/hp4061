const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
let sock; // WhatsApp કનેક્શન સાચવવા માટે

async function connectWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // સર્વર પર QR કોડ બતાવશે
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (connection === 'close') {
            console.log('કનેક્શન કપાયું છે, ફરી ચાલુ થાય છે...');
            connectWhatsApp();
        } else if (connection === 'open') {
            console.log('તમારો નંબર કનેક્ટ થઈ ગયો છે! હવે ફ્રી મેસેજ ચાલુ.');
        }
    });
}

connectWhatsApp();

app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    try {
        // નંબરની પાછળ @s.whatsapp.net લગાવવું જરૂરી છે
        const id = number + "@s.whatsapp.net";
        await sock.sendMessage(id, { text: message });
        res.status(200).json({ status: "success", info: "Free Message Fired!" });
    } catch (error) {
        res.status(500).json({ status: "error", info: error.message });
    }
});

app.get('/', (req, res) => res.send("Free Master Server is Active!"));

app.listen(PORT, () => console.log(`સર્વર પોર્ટ ${PORT} પર ચાલુ છે`));
