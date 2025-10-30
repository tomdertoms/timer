// 🦦 Aonyx Timer v4.0 – Dialogmodus (funktioniert in-game, wie FarmGod)
(function(){
  'use strict';
  if (!window.TribalWars || !window.game_data) {
    alert('Aonyx Timer: Bitte im Spiel ausführen.');
    return;
  }

  const LS='aonyx_timer_v40_';
  const pad2=n=>String(n).padStart(2,'0');
  const pad3=n=>String(n).padStart(3,'0');
  const fmtHMSms=d=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const parseTime=s=>{if(!s)return null;const m=s.trim().match(/^(\d{1,2}):?(\d{2})?:?(\d{2})?(?:\.(\d{1,3}))?$/);if(!m)return null;
    const d=new Date();d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));return d;};
  const save=(k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load=(k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};
  const timeMask=i=>{i.addEventListener('input',()=>{const r=i.value.replace(/\D/g,'').slice(0,9);
    let h=r.slice(0,2),m=r.slice(2,4),s=r.slice(4,6),ms=r.slice(6,9);
    if(h.length===1)h='0'+h;if(m&&m.length===1)m='0'+m;if(s&&s.length===1)s='0'+s;
    let o='';if(h)o+=h;if(m)o+=':'+m;if(s)o+=':'+s;if(ms)o+='.'+ms;i.value=o;});
    i.addEventListener('blur',()=>{const d=parseTime(i.value);i.value=d?fmtHMSms(d):'';});};

  const UNIT_LABEL={
    spear:'Speer', sword:'Schwert', axe:'Axt', archer:'Bogenschütze', spy:'Späher',
    light:'Leichte Kav.', marcher:'Beritt. Bogi', heavy:'Schwere Kav.',
    ram:'Ramme', catapult:'Katapult', knight:'Paladin'
  };

  // === Container wie FarmGod ===
  const root=document.querySelector('#content_value')||document.body;
  const existing=document.getElementById('aonyx_timer_dialog');if(existing)existing.remove();

  const dialog=document.createElement('div');
  dialog.id='aonyx_timer_dialog';
  Object.assign(dialog.style,{
    position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
    background:'#f9f5e9',border:'2px solid #553',borderRadius:'6px',
    zIndex:999999,padding:'10px',width:'700px',boxShadow:'0 8px 25px rgba(0,0,0,.4)',
    font:'13px Arial',color:'#111'
  });
  dialog.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;background:#e1d2b1;padding:4px 8px;border-radius:4px">
      <b>🦦 Aonyx Timer</b>
      <button id="ax_close" style="background:#fdd;border:1px solid #a33;border-radius:4px;padding:1px 6px">X</button>
    </div>
    <div style="margin-top:8px">
      Ziel: <input id="ax_target" placeholder="123|456" style="width:100px"/>
      Zeit: <input id="ax_time" style="width:140px"/>
      <label><input type="radio" name="ax_mode" value="attack" checked> Angriff</label>
      <label><input type="radio" name="ax_mode" value="support"> Support</label>
      <button id="ax_load">Dörfer laden</button>
      <button id="ax_calc">Laufzeiten</button>
      <div id="ax_count" style="float:right;font-weight:bold">--</div>
    </div>
    <div id="ax_table" style="margin-top:10px;max-height:340px;overflow:auto;border-top:1px solid #ccc;padding-top:6px;background:#fff"></div>
    <div style="margin-top:10px;text-align:right">
      <button id="ax_go" style="background:#2b7aea;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:bold">GO (dein Klick)</button>
    </div>
  `;
  root.appendChild(dialog);

  const $=id=>document.getElementById(id);
  const closeBtn=$('ax_close'),targetIn=$('ax_target'),timeIn=$('ax_time'),
        loadBtn=$('ax_load'),calcBtn=$('ax_calc'),goBtn=$('ax_go'),tableDiv=$('ax_table');

  closeBtn.onclick=()=>dialog.remove();
  targetIn.value=load('target','');
  timeIn.value=load('time',fmtHMSms(new Date()));
  timeMask(timeIn);
  targetIn.addEventListener('input',()=>save('target',targetIn.value));
  timeIn.addEventListener('input',()=>save('time',timeIn.value));

  // Countdown
  setInterval(()=>{
    const t=parseTime(timeIn.value), cd=$('ax_count');
    if(!t||!cd)return;
    const ms=Math.max(0,t.getTime()-Date.now());
    const s=Math.floor(ms/1000)%60, m=Math.floor(ms/60000);
    cd.textContent=`Countdown: ${m>0?m+'m ':''}${s}.${String(ms%1000).padStart(3,'0')}s`;
  },60);

  // ===== Core Funktionen =====
  function getVillages(){
    if(window.TWMap?.villages){
      return Object.values(TWMap.villages).map(v=>({id:v.id,name:v.name,x:v.x,y:v.y}));
    }else if(game_data.player?.villages){
      const vmap=game_data.player.villages;
      return Object.keys(vmap).map(id=>({id,name:vmap[id].name,x:vmap[id].x,y:vmap[id].y}));
    }else{
      const v=game_data.village;
      return [{id:v.id,name:v.name,x:v.x,y:v.y}];
    }
  }

  function calcTravel(unit,fx,fy,tx,ty){
    const ud=game_data.units_data?.[unit];
    if(!ud)return null;
    const dist=Math.hypot(fx-tx,fy-ty);
    const mins=ud.speed*(game_data.config.unit_speed/game_data.config.speed);
    return Math.round(dist*mins*60000);
  }

  function sendCommand(vid,tx,ty,type,units){
    const data={village:vid,screen:'place',ajax:'command',type,x:tx,y:ty,h:game_data.csrf};
    for(const [k,v] of Object.entries(units))data[`units[${k}]`]=v;
    TribalWars.post('game.php',data,r=>console.log('[Aonyx send]',r));
  }

  // ===== Logik =====
  let villages=[];
  loadBtn.onclick=()=>{
    villages=getVillages();
    if(!villages.length)return UI.ErrorMessage('Keine Dörfer gefunden');
    UI.SuccessMessage(`${villages.length} Dörfer geladen`);
    buildTable();
  };

  function buildTable(){
    const units=Object.keys(game_data.units_data||{});
    let html='<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr><th>Dorf</th><th>Einheit</th><th>Laufzeit</th><th>Menge</th></tr></thead><tbody>';
    for(const v of villages){
      html+=`<tr><td colspan="4" style="background:#f7f7f7"><b>${v.name}</b> (${v.x}|${v.y})</td></tr>`;
      for(const u of units){
        html+=`<tr><td>${UNIT_LABEL[u]||u}</td><td>${u}</td><td id="ax_t_${v.id}_${u}">-</td>
          <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" style="width:60px" value="${load('amounts',{})?.[v.id]?.[u]||0}"></td></tr>`;
      }
    }
    html+='</tbody></table>';
    tableDiv.innerHTML=html;
  }

  calcBtn.onclick=()=>{
    const coord=(targetIn.value||'').trim(),m=coord.match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    for(const v of villages){
      for(const u of Object.keys(game_data.units_data||{})){
        const cell=$(`ax_t_${v.id}_${u}`);if(!cell)continue;
        const ms=calcTravel(u,v.x,v.y,tx,ty);
        cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
      }
    }
    UI.SuccessMessage('Laufzeiten berechnet');
  };

  goBtn.onclick=()=>{
    const coord=(targetIn.value||'').trim(),m=coord.match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    const mode=document.querySelector('input[name="ax_mode"]:checked')?.value||'attack';
    for(const v of villages){
      const set=load('amounts',{})[v.id]||{};
      const payload={};
      for(const [u,val] of Object.entries(set))if(+val>0)payload[u]=+val;
      if(Object.keys(payload).length){
        sendCommand(v.id,tx,ty,mode,payload);
        UI.SuccessMessage(`Befehl gesendet aus ${v.name}`);
        return;
      }
    }
    UI.ErrorMessage('Keine Mengen gesetzt');
  };

  UI.SuccessMessage('Aonyx Timer gestartet');
})();
