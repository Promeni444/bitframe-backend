const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const admin = require('firebase-admin');

const serviceAccount = require("./key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bitframe-autosender-default-rtdb.firebaseio.com" 
});
const db = admin.database();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
    }
});

client.on('qr', (qr) => {
    console.log('--- СКАНИРУЙ ЭТОТ КОД ---');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('✅ WHATSAPP ПОДКЛЮЧЕН!');
    setInterval(checkBase, 60000);
});

async function checkBase() {
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dushanbe' });
    console.log(`[${now}] Ищу сообщения...`);
    const snapshot = await db.ref('scheduled_messages').once('value');
    const tasks = snapshot.val();
    if (!tasks) return;
    for (let id in tasks) {
        let task = tasks[id];
        if (task.time === now && task.status === "pending") {
            const chatId = `${task.phone}@c.us`;
            await client.sendMessage(chatId, task.message);
            await db.ref(`scheduled_messages/${id}`).update({ status: "sent" });
            console.log(`🚀 ОТПРАВЛЕНО на ${task.phone}`);
        }
    }
}

console.log("⏳ Запускаю WhatsApp движок...");
client.initialize();