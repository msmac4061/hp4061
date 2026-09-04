const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// Meta API ને મેસેજ મોકલવાનું સ્માર્ટ ફંક્શન (વારંવાર કોડ ન લખવો પડે એટલે)
async function sendToWhatsApp(payload) {
    const url = `https://graph.facebook.com/v17.0/${PHONE_NUMBER_ID}/messages`;
    return await axios.post(url, payload, {
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }
    });
}

// ---------------------------------------------------------
// ૧. સિમ્પલ ટેક્સ્ટ મેસેજ મોકલવા (રીમાઈન્ડર, અપડેટ્સ માટે)
// ---------------------------------------------------------
app.post('/send-message', async (req, res) => {
    const { number, message } = req.body;
    try {
        await sendToWhatsApp({
            messaging_product: "whatsapp", to: number, type: "text", text: { body: message }
        });
        res.status(200).json({ status: "success", info: "Text Fired!" });
    } catch (error) {
        res.status(500).json({ status: "error", info: error.message });
    }
});

// ---------------------------------------------------------
// ૨. PDF બિલ અને ચલણ મોકલવા (કંપનીના ડોક્યુમેન્ટ્સ માટે)
// ---------------------------------------------------------
app.post('/send-pdf', async (req, res) => {
    const { number, pdfLink, fileName } = req.body;
    try {
        await sendToWhatsApp({
            messaging_product: "whatsapp", to: number, type: "document",
            document: { link: pdfLink, filename: fileName || "Document.pdf" }
        });
        res.status(200).json({ status: "success", info: "PDF Fired!" });
    } catch (error) {
        res.status(500).json({ status: "error", info: error.message });
    }
});

// ---------------------------------------------------------
// ૩. Webhook (સામેથી આવતા મેસેજ પકડવા અને ઓટો-રિપ્લાય માટે)
// ---------------------------------------------------------
app.get('/webhook', (req, res) => {
    // Meta verification માટે
    if (req.query['hub.verify_token'] === 'HARDI_SMART_TOKEN') {
        res.send(req.query['hub.challenge']);
    } else {
        res.sendStatus(400);
    }
});

app.post('/webhook', async (req, res) => {
    const incomingMsg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (incomingMsg) {
        console.log(`નવો મેસેજ: ${incomingMsg.text?.body}`);
        // અહીં તમે ઓટો-રિપ્લાય સેટ કરી શકશો
    }
    res.sendStatus(200);
});

// ---------------------------------------------------------
// ૪. ઓટોમેટિક ડેઇલી ટાસ્ક (વ્યાજ ગણતરી / પાર્ટી બેલેન્સ રીમાઈન્ડર)
// ---------------------------------------------------------
cron.schedule('0 9 * * *', () => {
    // રોજ સવારે 9 વાગે આ કોડ જાતે જ રન થશે
    console.log("Good Morning! ડેઇલી રીમાઈન્ડર અને વ્યાજ ગણતરી શરૂ...");
});

// સર્વરનું સ્ટેટસ ચેક કરવા
app.get('/', (req, res) => res.send("Master Smart Server is Active!"));

app.listen(PORT, () => {
    console.log(`માસ્ટર સ્માર્ટ સિસ્ટમ પોર્ટ ${PORT} પર લાઇવ છે!`);
});