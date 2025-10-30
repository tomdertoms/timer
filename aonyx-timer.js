// 🦦 Aonyx Timer v5.0 
(function(){
  'use strict';
  if(!window.TribalWars||!window.game_data){
    alert('Aonyx Timer: bitte im Spiel ausführen (Karte, Versammlungsplatz, AM).');
    return;
  }

  const LS='aonyx_timer_v50_';
  const $=id=>document.getElementById(id);
  const save=(k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load=(k,d=null)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(_){return d;}};
  const pad2=n=>String(n).padStart(2,'0');
  const pad3=n=>String(n).padStart(3,'0');
  const fmtHMSms=d=>`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
  const parseTime=s=>{
    if(!s)return null;
    const m=s.trim().match(/^(\d{1,2}):?(\d{2})?:?(\d{2})?(?:\.(\d{1,3}))?$/);
    if(!m)return null;
    const d=new Date();
    d.setHours(+m[1]||0,+m[2]||0,+m[3]||0,Number((m[4]||'0').padEnd(3,'0')));
    return d;
  };
  const timeMask=i=>{
    i.addEventListener('input',()=>{
      const r=i.value.replace(/\D/g,'').slice(0,9);
      let h=r.slice(0,2),m=r.slice(2,4),s=r.slice(4,6),ms=r.slice(6,9);
      if(h.length===1)h='0'+h;if(m&&m.length===1)m='0'+m;if(s&&s.length===1)s='0'+s;
      let o='';if(h)o+=h;if(m)o+=':'+m;if(s)o+=':'+s;if(ms)o+='.'+ms;i.value=o;
    });
    i.addEventListener('blur',()=>{const d=parseTime(i.value);i.value=d?fmtHMSms(d):'';});
  };

  const UNIT_LABEL={spear:'Speer',sword:'Schwert',axe:'Axt',archer:'Bogenschütze',
    spy:'Späher',light:'Leichte Kav.',marcher:'Beritt. Bogi',heavy:'Schwere Kav.',
    ram:'Ramme',catapult:'Katapult',knight:'Paladin'};

  // === UI ===
  const dlg=document.createElement('div');
  dlg.id='aonyx_timer_dialog';
  Object.assign(dlg.style,{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
    zIndex:999999,background:'#fff',border:'2px solid #222',borderRadius:'8px',padding:'10px',
    width:'720px',boxShadow:'0 0 30px rgba(0,0,0,.3)',font:'13px Arial',color:'#111'});
  dlg.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;background:#eee;padding:4px 8px;border-radius:6px">
      <b>🦦 Aonyx Timer v5.0</b>
      <button id="ax_close" style="background:#fdd;border:1px solid #c33;border-radius:4px;padding:1px 6px">X</button>
    </div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      Ziel: <input id="ax_target" placeholder="123|456" style="width:100px"/>
      Zeit: <input id="ax_time" style="width:140px"/>
      <label><input type="radio" name="ax_mode" value="attack" checked> Angriff</label>
      <label><input type="radio" name="ax_mode" value="support"> Support</label>
      <button id="ax_load">Dörfer laden</button>
      <button id="ax_calc">Laufzeiten</button>
      <div id="ax_cd" style="margin-left:auto;font-weight:bold">Countdown: --</div>
    </div>
    <div id="ax_table" style="margin-top:10px;max-height:340px;overflow:auto;border-top:1px solid #ccc;padding-top:6px;background:#fafafa"></div>
    <div style="margin-top:10px;text-align:right">
      <button id="ax_go" style="background:#2b7aea;color:#fff;border:none;padding:8px 14px;border-radius:6px;font-weight:bold">GO (dein Klick)</button>
    </div>`;
  document.body.appendChild(dlg);

  const closeBtn=$('ax_close'),targetIn=$('ax_target'),timeIn=$('ax_time'),
        loadBtn=$('ax_load'),calcBtn=$('ax_calc'),goBtn=$('ax_go'),tableDiv=$('ax_table');
  closeBtn.onclick=()=>dlg.remove();
  targetIn.value=load('target','');timeIn.value=load('time',fmtHMSms(new Date()));timeMask(timeIn);
  targetIn.addEventListener('input',()=>save('target',targetIn.value));
  timeIn.addEventListener('input',()=>save('time',timeIn.value));
  setInterval(()=>{const t=parseTime(timeIn.value),el=$('ax_cd');
    if(!t||!el)return;
    const ms=Math.max(0,t.getTime()-Date.now());
    el.textContent=`Countdown: ${Math.floor(ms/60000)}m ${(Math.floor(ms/1000)%60)}.${String(ms%1000).padStart(3,'0')}s`;
  },60);

  // === Dörfer laden (FarmGod-Weg: overview + map/village.txt) ===
  async function loadVillages(){
    UI.SuccessMessage('Lade Dörfer…');
    const html=await new Promise(r=>TribalWars.get('game.php',{screen:'overview_villages',mode:'combined',village:game_data.village.id},r));
    const doc=document.implementation.createHTMLDocument('v');doc.documentElement.innerHTML=html;
    const links=[...doc.querySelectorAll('a[href*="village="]')];
    const v=[],seen=new Set();
    links.forEach(a=>{
      const m=(a.getAttribute('href')||'').match(/village=(\d+)/);
      if(m&&!seen.has(m[1])){seen.add(m[1]);v.push({id:m[1],name:(a.textContent||'').trim()});}
    });
    try{
      const txt=await new Promise((res,rej)=>jQuery.get(location.origin+'/map/village.txt',res).fail(rej));
      const idx=new Map();
      String(txt).split('\n').forEach(line=>{
        const [id,x,y]=line.split(',');
        if(id&&x&&y)idx.set(id,{x:+x,y:+y});
      });
      v.forEach(vv=>Object.assign(vv,idx.get(vv.id)||{}));
    }catch(e){console.warn('map join fail',e);}
    save('vills',v);
    return v;
  }

  // === Laufzeit direkt aus Spiel-API ===
  function getTravelTime(villageId,unit,tx,ty){
    return new Promise(res=>{
      TribalWars.post('game.php',
        {screen:'place',ajax:'1',ajaxaction:'calculate_time',village:villageId,
         x:tx,y:ty,unit:unit,h:game_data.csrf},
        r=>{
          try{
            const j=(typeof r==='string')?JSON.parse(r):r;
            const dur=j?.response?.duration||j?.data?.duration||j?.duration;
            res(dur?+dur:null);
          }catch(e){
            const m=String(r).match(/"duration"\s*:\s*(\d+)/);
            res(m?+m[1]:null);
          }
        });
    });
  }

  // === GO (echter Send) ===
  function sendCommand(villageId,tx,ty,type,units){
    const data={screen:'place',ajax:'command',village:villageId,type,x:tx,y:ty,h:game_data.csrf};
    Object.entries(units).forEach(([k,v])=>data[`units[${k}]`]=v);
    TribalWars.post('game.php',data,r=>{
      try{UI.SuccessMessage('Aonyx: Befehl gesendet');}catch(_){}
      console.log('[Aonyx send]',r);
    });
  }

  // === Tabelle ===
  let VILLS=[];
  loadBtn.onclick=async()=>{
    VILLS=await loadVillages();
    const units=Object.keys(game_data.units_data||{});
    let html='<table class="vis" style="width:100%;border-collapse:collapse"><thead><tr><th>Dorf</th><th>Einheit</th><th>Laufzeit</th><th>Menge</th></tr></thead><tbody>';
    for(const v of VILLS){
      html+=`<tr><td colspan="4" style="background:#f7f7f7"><b>${v.name}</b> (${v.x}|${v.y})</td></tr>`;
      for(const u of units){
        html+=`<tr><td>${UNIT_LABEL[u]||u}</td><td>${u}</td><td id="ax_t_${v.id}_${u}">-</td>
          <td><input class="ax_amt" data-vid="${v.id}" data-unit="${u}" style="width:70px" value="${load('amts',{})?.[v.id]?.[u]||0}"></td></tr>`;
      }
    }
    html+='</tbody></table>';tableDiv.innerHTML=html;
    tableDiv.querySelectorAll('.ax_amt').forEach(inp=>{
      inp.addEventListener('input',()=>{
        const m=load('amts',{});const vid=inp.dataset.vid,u=inp.dataset.unit;
        m[vid]=m[vid]||{};m[vid][u]=+inp.value||0;save('amts',m);
      });
    });
    UI.SuccessMessage(`Dörfer geladen: ${VILLS.length}`);
  };

  calcBtn.onclick=async()=>{
    const m=(targetIn.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    const units=Object.keys(game_data.units_data||{});
    for(const v of VILLS){
      for(const u of units){
        const cell=document.getElementById(`ax_t_${v.id}_${u}`);if(!cell)continue;
        cell.textContent='…';
        const ms=await getTravelTime(v.id,u,tx,ty);
        cell.textContent=ms?`${Math.round(ms/1000)}s`:'n/a';
      }
    }
    UI.SuccessMessage('Laufzeiten aus Spiel berechnet.');
  };

  goBtn.onclick=()=>{
    const m=(targetIn.value||'').trim().match(/^(\d{1,3})\|(\d{1,3})$/);
    if(!m)return UI.ErrorMessage('Ungültiges Ziel');
    const tx=+m[1],ty=+m[2];
    const mode=document.querySelector('input[name="ax_mode"]:checked')?.value||'attack';
    for(const v of VILLS){
      const set=load('amts',{})[v.id]||{};
      const payload={};
      for(const [u,val] of Object.entries(set))if(+val>0)payload[u]=+val;
      if(Object.keys(payload).length){
        sendCommand(v.id,tx,ty,mode,payload);
        return;
      }
    }
    UI.ErrorMessage('Keine Mengen gesetzt');
  };

  UI.SuccessMessage('Aonyx Timer gestartet');
})();
