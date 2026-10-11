const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const bots = {};

async function startBot(number){
try{
const { state, saveCreds } = await useMultiFileAuthState(`./auth_${number}`);
const sock = makeWASocket({
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
logger: pino({level:'silent'}),
printQRInTerminal: false,
browser: Browsers.macOS('Desktop'),
markOnlineOnConnect: false
});
sock.ev.on('creds.update', saveCreds);
sock.ev.on('connection.update', async (up)=>{
const { connection, lastDisconnect } = up;
if(connection==='close'){
let reason = lastDisconnect?.error?.output?.statusCode;
if(reason!== DisconnectReason.loggedOut){
console.log('Reconnecting '+number);
startBot(number);
} else {
console.log('Logged out '+number);
await fs.remove(`./auth_${number}`);
}
}
if(connection==='open'){
console.log('✅ BOT '+number+' CONNECTED!');
}
});

sock.ev.on('messages.upsert', async ({messages})=>{
let m = messages[0];
if(!m.message || m.key.fromMe) return;
let text = (m.message.conversation || m.message.extendedTextMessage?.text || '').trim();
let sender = m.key.remoteJid;
if(!text.startsWith('.')) return;
let cmd = text.slice(1).split(' ')[0].toLowerCase();
let args = text.slice(1).split(' ').slice(1).join(' ');

if(cmd==='ping'){
await sock.sendMessage(sender,{text:'🏓 Pong! COOLGUY Bot Online! Speed: '+(Date.now()-m.messageTimestamp*1000)+'ms'});
}
if(cmd==='menu'){
await sock.sendMessage(sender,{text:`🤖 *COOLGUY TECH MENU*\n\n.ping - Check bot\n.menu - This menu\n.owner - Owner\n.alive - Bot status\n\nMade by David Murungi | Uganda 🇺🇬`});
}
if(cmd==='owner'){ await sock.sendMessage(sender,{text:'👑 Owner: David Murungi\n📞 +256781539746'}); }
if(cmd==='alive'){ await sock.sendMessage(sender,{text:'✅ Bot Alive! COOLGUY TECH is running!'}); }
});

bots[number]=sock;
}catch(e){ console.log('StartBot Error:', e); }
}

// Home Page
app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>COOLGUY TECH</title>
<style>body{background:#0f0f0f;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{background:#1a1a1a;padding:30px;border-radius:20px;width:90%;max-width:400px;text-align:center;box-shadow:0 0 20px #00ff88}
input{width:100%;padding:12px;border-radius:10px;border:none;margin:10px 0;text-align:center;font-size:18px}
button{background:#00ff88;color:#000;padding:12px;width:100%;border:none;border-radius:10px;font-weight:bold;font-size:18px;cursor:pointer}
.code{font-size:28px;color:#00ff88;margin:15px 0;font-weight:bold;letter-spacing:2px}
small{color:#888}</style></head><body><div class="box">
<h2>🤖 COOLGUY TECH</h2><p>Bot Hosting Panel</p><p><b>Get Pairing Code</b></p>
<input id="num" placeholder="256781539746" value="256781539746">
<button onclick="getCode()">GET CODE</button>
<div id="result" class="code"></div>
<p><small>Go to WhatsApp > Linked Devices > Link with phone number > Enter this code FAST (3 sec)!</small></p>
<p><small>Made by David Murungi | Uganda</small></p>
</div><script>
async function getCode(){
let n=document.getElementById('num').value;
if(!n){alert('Enter number');return}
document.getElementById('result').innerHTML='⏳ Generating...';
let r=await fetch('/code?number='+n);
let d=await r.json();
if(d.code){document.getElementById('result').innerHTML=d.code}
else{document.getElementById('result').innerHTML='❌ '+(d.error||'Failed')}
}
</script></body></html>`);
});

// Pairing Code - FIXED!
app.get('/code', async (req,res)=>{
let num = req.query.number?.replace(/[^0-9]/g,'');
if(!num) return res.json({error:'Invalid number'});
const id = num;
console.log('Pairing request for '+id);
try{
// Don't delete if already exists - reuse!
if(!fs.existsSync(`./auth_${id}`)){
await fs.ensureDir(`./auth_${id}`);
}
const { state, saveCreds } = await useMultiFileAuthState(`./auth_${id}`);
const sock = makeWASocket({
version: [2, 3000, 1015901307],
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
logger: pino({level:'silent'}),
printQRInTerminal: false,
browser: Browsers.macOS('Desktop')
});
sock.ev.on('creds.update', saveCreds);

await delay(3000);
let code = await sock.requestPairingCode(num);
let formatted = code?.match(/.{1,4}/g)?.join("-") || code;
console.log('Code for '+id+': '+formatted);
res.json({code: formatted});

// Keep socket alive for 120 seconds for pairing
setTimeout(()=>{ try{sock.end();}catch(e){} }, 120000);

}catch(e){
console.log('Pair Error:', e.message);
res.json({error: e.message});
}
});

app.get('/delete', async (req,res)=>{
let num = req.query.number?.replace(/[^0-9]/g,'');
if(!num) return res.json({error:'Need number'});
await fs.remove(`./auth_${num}`).catch(()=>{});
res.json({success:`Deleted auth for ${num}. Now get new code!`});
});

app.listen(PORT, ()=>console.log('Server running on '+PORT));
