const express = require('express');
const fs = require('fs-extra');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const sessions = new Map();

// Home page - COOLGUY TECH PANEL
app.get('/', (req, res) => {
  res.send(`
  <html>
  <head><title>COOLGUY TECH PANEL</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{background:#0a0a0a;color:#fff;font-family:Arial;text-align:center;padding:20px}
    .card{background:#1a1a1a;border-radius:15px;padding:25px;max-width:400px;margin:30px auto;border:2px solid #00ff88}
    input{width:90%;padding:12px;border-radius:8px;border:none;margin:10px 0;font-size:16px}
    button{background:#00ff88;color:#000;padding:12px 25px;border:none;border-radius:8px;font-weight:bold;font-size:16px;width:95%;cursor:pointer}
    #code{font-size:24px;font-weight:bold;color:#00ff88;margin-top:15px;letter-spacing:3px}
  </style></head>
  <body>
    <h1>🔥 COOLGUY TECH PANEL 🔥</h1>
    <p>Real WhatsApp Bot Hosting for 1B Users</p>
    <div class="card">
      <h3>Get Pairing Code</h3>
      <input id="number" placeholder="Enter WhatsApp Number e.g 2567XXXXXXXX"/>
      <button onclick="getCode()">GET CODE</button>
      <div id="code"></div>
      <p id="status" style="color:#aaa;margin-top:10px"></p>
    </div>
    <p>Made by David Murungi | Uganda 🇺🇬</p>
  <script>
    async function getCode(){
      const num=document.getElementById('number').value;
      const codeDiv=document.getElementById('code');
      const status=document.getElementById('status');
      if(!num){alert('Enter number');return}
      codeDiv.innerText='⏳ Generating...';
      status.innerText='Please wait 10 seconds...';
      try{
        const res=await fetch('/code?number='+num);
        const data=await res.json();
        if(data.code){
          codeDiv.innerText=data.code;
          status.innerText='✅ Now go to WhatsApp > Linked Devices > Link with Phone Number > Enter this code: '+data.code;
        }else{
          codeDiv.innerText='❌ '+ (data.error||'Failed');
          status.innerText='';
        }
      }catch(e){codeDiv.innerText='❌ Server Error';}
    }
  </script>
  </body>
  </html>
  `);
});

// Generate Pairing Code API
app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num || num.length < 10) return res.json({error:'Invalid number'});
  
  const id = num;
  try{
    if(fs.existsSync('./auth_'+id)) await fs.remove('./auth_'+id);
    const { state, saveCreds } = await useMultiFileAuthState('./auth_'+id);
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      printQRInTerminal: false,
      browser: ["COOLGUY TECH","Chrome","1.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    if(!sock.authState.creds.registered){
      await delay(1500);
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      res.json({code: code});
      
      // Wait for connection 60s
      sock.ev.on('connection.update', async (u)=>{
        if(u.connection==='open'){
          console.log('Connected:', id);
          await delay(3000);
          // Save creds as JSON for bot hosting later
          const credsPath = './auth_'+id+'/creds.json';
          if(fs.existsSync(credsPath)){
             console.log('Creds ready for', id);
          }
        }
      });
    } else {
      res.json({error:'Already registered'});
    }
  }catch(e){
    console.log(e);
    res.json({error:e.message});
  }
});

app.listen(PORT, ()=>console.log('COOLGUY TECH PANEL running on '+PORT));
