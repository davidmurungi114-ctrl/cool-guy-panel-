const express = require('express');
const fs = require('fs-extra');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// BOT FUNCTION
async function startBot(number) {
    const id = number.replace(/[^0-9]/g,'');
    const authPath = `./auth_${id}`;
    if(!fs.existsSync(authPath)) return;
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
        logger: pino({level:'silent'}),
        browser: Browsers.ubuntu('Chrome')
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        if(u.connection === 'open') console.log(`✅ BOT ${id} CONNECTED!`);
    });
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if(!msg.message || msg.key.fromMe) return;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const from = msg.key.remoteJid;
        if(text === '.ping' || text.toLowerCase() === 'ping'){
            await sock.sendMessage(from, {text: '🏓 Pong! COOLGUY Bot Online! ⚡'});
        }
        if(text === '.menu'){
            await sock.sendMessage(from, {text: `*COOLGUY BOT MENU*\n\n.ping - speed\n.menu - menu\n.alive - status\n.owner - owner\n\nMade by David Murungi 🇺🇬`});
        }
        if(text === '.alive'){
            await sock.sendMessage(from, {text: '✅ COOLGUY Bot is Alive!\nPanel: cool-guy-panel.onrender.com'});
        }
        if(text === '.owner'){
            await sock.sendMessage(from, {text: '👑 Owner: David Murungi\n📍 Uganda'});
        }
    });
}

// Auto-start existing bots on boot
fs.readdirSync('./').forEach(f => {
    if(f.startsWith('auth_')) startBot(f.replace('auth_',''));
});

app.get('/', (req,res)=>{
res.send(`<html><head><title>COOLGUY TECH PANEL</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:20px}.card{background:#1a1a1a;border:1px solid #333;padding:20px;border-radius:15px;max-width:400px;margin:auto}input{width:90%;padding:14px;border-radius:10px;border:none;margin:10px 0;font-size:16px}button{background:#00ff88;color:#000;padding:14px 20px;border:none;border-radius:10px;font-weight:bold;width:95%;font-size:16px} #code{font-size:28px;font-weight:bold;color:#00ff88;margin:20px 0;letter-spacing:2px}</style></head><body><div class="card"><h1>🤖 COOLGUY TECH</h1><p>Bot Hosting Panel</p><h3>Get Pairing Code</h3><input id="number" placeholder="256781539746"><button onclick="getCode()">GET CODE</button><div id="code"></div><div id="status" style="color:#aaa"></div><p style="font-size:12px;margin-top:20px">Made by David Murungi | Uganda</p></div><script>async function getCode(){const num=document.getElementById('number').value;const c=document.getElementById('code');const s=document.getElementById('status');if(!num){alert('Enter number');return}c.innerText='Generating...';s.innerText='Wait 10 sec...';try{const r=await fetch('/code?number='+num);const d=await r.json();if(d.code){c.innerText=d.code;s.innerText='Go to WhatsApp > Linked Devices > Link with phone number > Enter this code FAST (3 sec)!';}else{c.innerText='❌ '+(d.error||'Failed');s.innerText='';}}catch(e){c.innerText='❌ Server Error';}}</script></body></html>`);
});

app.get('/code', async (req,res)=>{
let num = req.query.number?.replace(/[^0-9]/g,'');
if(!num || num.length<10) return res.json({error:'Invalid number'});
const id = num;
try{
if(fs.existsSync(`./auth_${id}`)){
try{const creds = fs.readFileSync(`./auth_${id}/creds.json`,'utf8'); if(creds.includes('"registered":true')) return res.json({error:'Already registered - Use /delete?number='+id+' to reset'});}catch{}
await fs.remove(`./auth_${id}`);
}
const { state, saveCreds } = await useMultiFileAuthState(`./auth_${id}`);
const sock = makeWASocket({ auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))}, logger:pino({level:'silent'}), printQRInTerminal:false, browser:Browsers.ubuntu('Chrome')});
sock.ev.on('creds.update', saveCreds);
await delay(3000);
let code = await sock.requestPairingCode(num);
code = code?.match(/.{1,4}/g)?.join("-");
res.json({code});
sock.ev.on('connection.update', async (u)=>{
if(u.connection==='open'){
console.log('Connected '+id);
await delay(2000);
startBot(id);
}
});
}catch(e){console.log(e); res.json({error:e.message});}
});

app.get('/delete', async (req,res)=>{
let num = req.query.number?.replace(/[^0-9]/g,'');
if(!num) return res.json({error:'Add?number=256...'});
await fs.remove(`./auth_${num}`);
res.json({success:'Deleted auth for '+num+'. Now get new code!'});
});

app.listen(PORT, ()=>console.log('COOLGUY RUNNING ON '+PORT));
