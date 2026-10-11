const express = require('express');
const fs = require('fs-extra');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
res.send(`
<html><head><title>COOLGUY TECH PANEL</title><meta name="viewport" content="width=device-width"><style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;text-align:center;padding:20px}.card{background:#1a1a1a;border:1px solid #333;padding:20px;border-radius:10px;max-width:400px;margin:auto}input{width:90%;padding:12px;border-radius:8px;border:none;margin:10px 0}button{background:#00ff88;color:#000;padding:12px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;width:95%}#code{font-size:24px;font-weight:bold;color:#00ff88;margin:15px 0}</style></head><body><div class="card"><h1>COOLGUY TECH PANEL</h1><p>WhatsApp Bot Hosting for 1B Users</p><h3>Get Pairing Code</h3><input id="number" placeholder="Enter Whatsapp Number 256..."><button onclick="getCode()">GET CODE</button><div id="code"></div><div id="status" style="color:#aaa;margin-top:10px"></div><p>Made by David Murungi | Uganda</p></div><script>async function getCode(){const num=document.getElementById('number').value;const codeDiv=document.getElementById('code');const status=document.getElementById('status');if(!num){alert('Enter number');return}codeDiv.innerText='Generating...';status.innerText='Please wait 10 seconds...';try{const res=await fetch('/code?number='+num);const data=await res.json();if(data.code){codeDiv.innerText=data.code;status.innerText='Now go to WhatsApp > Linked Devices > Link with phone number and enter this code FAST!';}else{codeDiv.innerText='❌ '+(data.error||'Failed');status.innerText='';}}catch(e){codeDiv.innerText='❌ Server Error';}}</script></body></html>
`);
});

app.get('/code', async (req, res) => {
let num = req.query.number?.replace(/[^0-9]/g,'');
if(!num || num.length < 10) return res.json({error:'Invalid number. Use 256781539746'});
const id = num;
try{
if(fs.existsSync(`./auth_${id}`)){
const creds = fs.readFileSync(`./auth_${id}/creds.json`, 'utf8');
if(creds.includes('"registered":true')){
return res.json({error:'Already registered - Delete auth folder in Render or use new number'});
}
await fs.remove(`./auth_${id}`);
}
const { state, saveCreds } = await useMultiFileAuthState(`./auth_${id}`);
const sock = makeWASocket({
auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
logger: pino({level:'silent'}),
printQRInTerminal: false,
browser: Browsers.ubuntu('Chrome')
});
sock.ev.on('creds.update', saveCreds);
await delay(3000);
let code = await sock.requestPairingCode(num);
code = code?.match(/.{1,4}/g)?.join("-");
console.log(`Code for ${id}: ${code}`);
res.json({code: code});

sock.ev.on('connection.update', async (u) => {
if(u.connection === 'open'){
console.log('Connected', id);
await delay(3000);
console.log('Creds ready for', id);
}
});

} catch(e){
console.log(e);
res.json({error:e.message});
}
});

app.listen(PORT, ()=>console.log('COOLGUY TECH PANEL RUNNING ON '+PORT));
