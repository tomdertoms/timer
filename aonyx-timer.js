// Aonyx Timer v0.9 — Minimal Proof
// Zentrale Anzeige, lädt Dörfer (am_farm/list), testet Laufzeit (calculate_time)

(function(){
  'use strict';
  if (!window.TribalWars || !window.game_data) {
    alert('Aonyx: Bitte im Spiel (Karte oder Versammlungsplatz) ausführen.');
    return;
  }

  const LS = 'aonyx_test_';
  const save = (k,v)=>localStorage.setItem(LS+k,JSON.stringify(v));
  const load = (k,d)=>{try{const s=localStorage.getItem(LS+k);return s?JSON.parse(s):d;}catch(e){return d;}};
  const $ = id=>document.getElementById(id);

  const old = document.getElementById('aonyx_test_panel');
  if (old) old.remove();

  const panel = document.createElement('div');
  panel.id = 'aonyx_test_panel';
  Object.assign(panel.style,{
    position:'fixed',top:'15%',left:'50%',transform:'translateX(-50%)',
    background:'#fff',border:'2px solid #333',borderRadius:'8px',padding:'12px',
    zIndex:2147483647,width:'500px',textAlign:'center',fontFamily:'Arial'
  });
  panel.innerHTML = `
    <h3>🦦 Aonyx Testpanel</h3>
    <div id="ax_status" style="margin-bottom:8px;color:#666">Bereit.</div>
    <button id="ax_load_vills">Dörfer laden</button>
    <button id="ax_check_time" style="margin-left:6px">Test Laufzeit</button>
    <div id="ax_output" style="margin-top:10px;font-size:13px;text-align:left;max-height:250px;overflow:auto;border-top:1px solid #ccc;padding-top:6px"></div>
  `;
  document.body.appendChild(panel);

 function msg(t){
  const el = panel.querySelector('#ax_status');
  if (!el) {
    console.warn('[Aonyx] ax_status nicht gefunden, Retry in 100ms.');
    setTimeout(() => {
      const el2 = panel.querySelector('#ax_status');
      if (el2) el2.textContent = t;
      else console.warn('[Aonyx] msg() konnte ax_status auch beim Retry nicht finden.');
    }, 100);
    return;
  }
  el.textContent = t;
}
  function out(t){ $('#ax_output').innerHTML += `<div>${t}</div>`; }

  async function loadVillages(){
    msg('Lade Dörfer...');
    try{
      const resp = await new Promise(res=>TribalWars.post('game.php',{screen:'am_farm',ajax:'1',ajaxaction:'list',village:game_data.village.id},res));
      const j = typeof resp==='string'?JSON.parse(resp):resp;
      if(j && Array.isArray(j.villages)){
        save('villages',j.villages);
        msg(`Gefunden: ${j.villages.length} Dörfer`);
        out(`<b>Dörfer:</b> ${j.villages.map(v=>`${v.name} (${v.x}|${v.y})`).join(', ')}`);
        return j.villages;
      }
    }catch(e){
      console.error('Fehler loadVillages',e);
      msg('Fehler beim Laden der Dörfer.');
    }
    return [];
  }

  async function testDuration(){
    const vills = load('villages',[]);
    if(!vills.length){ msg('Keine Dörfer geladen.'); return; }
    const v = vills[0];
    const unit = 'spear';
    const tx = v.x+2, ty = v.y+1;
    msg(`Berechne Laufzeit für ${unit} von ${v.name} → ${tx}|${ty}...`);
    try{
      const resp = await new Promise(res=>TribalWars.post('game.php',{
        screen:'place',ajax:'1',ajaxaction:'calculate_time',
        village:v.id,x:tx,y:ty,unit:unit,h:game_data.csrf
      },res));
      const j = typeof resp==='string'?JSON.parse(resp):resp;
      const dur = j?.response?.duration||j?.data?.duration||j?.duration||null;
      if(dur){
        msg('Laufzeit erfolgreich erhalten.');
        out(`🕒 ${unit} von ${v.x}|${v.y} → ${tx}|${ty}: ${Math.round(dur/1000)}s`);
      }else{
        msg('Keine gültige Laufzeit.');
        out(`<span style="color:#c33">n/a</span> ${JSON.stringify(resp)}`);
      }
    }catch(e){
      msg('Fehler beim Berechnen.');
      out(`<span style="color:#c33">${e}</span>`);
    }
  }

queueMicrotask(() => {
  const loadBtn = panel.querySelector('#ax_load_vills');
  const timeBtn = panel.querySelector('#ax_check_time');
  if (loadBtn && timeBtn) {
    loadBtn.onclick = loadVillages;
    timeBtn.onclick = testDuration;
    console.log('[Aonyx] Buttons verbunden.');
  } else {
    console.warn('[Aonyx] Buttons nicht gefunden – DOM-Lag?');
  }
});

  console.log('[Aonyx] Minimal Proof geladen.');
})();



