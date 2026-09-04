const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());

let sock;
// ઓટો-રિપ્લાય વેરીએબલ
let botStatus = "OFF";
let botMessage = "હું અત્યારે વ્યસ્ત છું, પછી સંપર્ક કરું.";

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'close') {
            connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('WhatsApp Connected!');
        }
    });

    // 🤖 ઓટો-રિપ્લાય બોટ સિસ્ટમ
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify' && botStatus === "ON") {
            const sender = msg.key.remoteJid;
            if (!sender.includes('@g.us')) { // ગ્રુપમાં નહિ જાય
                try {
                    await sock.sendMessage(sender, { text: botMessage });
                } catch (err) {
                    console.log("Auto Reply Error: ", err);
                }
            }
        }
    });
}

connectToWhatsApp();

// 🚀 મેસેજ મોકલવાનો રૂટ
app.post('/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;
        const jid = number + "@s.whatsapp.net";
        await sock.sendMessage(jid, { text: message });
        res.send({ success: true });
    } catch (error) {
        res.status(500).send({ error: error.toString() });
    }
});

// 🤖 બોટ સેટિંગ્સ અપડેટ કરવાનો રૂટ
app.post('/set-auto-reply', (req, res) => {
    botStatus = req.body.status;
    botMessage = req.body.message;
    res.send({ success: true, botStatus, botMessage });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
