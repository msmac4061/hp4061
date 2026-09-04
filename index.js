const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

let sock;
let qrCodeData = ""; 
let isConnected = false;

async function connectWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // ટર્મિનલમાંથી બંધ કર્યું
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        
        if (qr) {
            // QR કોડને ઈમેજમાં કન્વર્ટ કરો
            qrcode.toDataURL(qr, (err, url) => {
                qrCodeData = url;
            });
        }

        if (connection === 'close') {
            isConnected = false;
            qrCodeData = ""; 
            console.log('કનેક્શન કપાયું છે, ફરી ચાલુ થાય છે...');
            connectWhatsApp();
        } else if (connection === 'open') {
            isConnected = true;
            qrCodeData = ""; 
            console.log('નંબર કનેક્ટ થઈ ગયો છે!');
        }
    });
}

connectWhatsApp();

// નવો રસ્તો: બ્રાઉઝરમાં QR જોવા માટેની લિંક
app.get('/qr', (req, res) => {
    if (isConnected) {
        res.send("<h2>તમારું WhatsApp પહેલેથી જ કનેક્ટ થઈ ગયું છે!</h2>");
    } else if (qrCodeData) {
        res.send(`<h2>તમારા મોબાઈલમાંથી આ QR કોડ સ્કેન કરો:</h2><img src="${qrCodeData}" style="height:300px; width:300px;"/>`);
    } else {
        res.send("<h2>QR કોડ બની રહ્યો છે, 5 સેકન્ડ પછી પેજ રિફ્રેશ કરો...</h2>");
    }
});

// મેસેજ મોકલવાનો રસ્તો
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    try {
        const id = number + "@s.whatsapp.net";
        await sock.sendMessage(id, { text: message });
        res.status(200).json({ status: "success", info: "Free Message Fired!" });
    } catch (error) {
        res.status(500).json({ status: "error", info: error.message });
    }
});

app.get('/', (req, res) => res.send("Free Master Server is Active!"));
app.listen(PORT, () => console.log(`સર્વર પોર્ટ ${PORT} પર ચાલુ છે`));
