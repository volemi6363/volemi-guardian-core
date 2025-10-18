
const BASE = ""; // same origin

async function api(path, opts={}){
  const r = await fetch(path, { headers:{'Content-Type':'application/json'}, credentials:'same-origin', ...opts });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

async function load(){
  const data = await api('/api/metrics');
  updateGuardian(data.guardianActive);
  updateThresholds(data.thresholds);
  renderCards(data.metrics);
  renderActions(data.lastActions);
}
function updateGuardian(on){
  const btn = document.getElementById('guardianToggle');
  const st  = document.getElementById('guardianState');
  btn.dataset.on = on ? 'true' : 'false';
  btn.textContent = on ? 'Guardian: Açık' : 'Guardian: Kapalı';
  st.textContent  = on ? 'AKTİF' : 'PASİF';
  st.style.background = on ? '#16a34a' : '#334155';
}
function updateThresholds(th){
  document.getElementById('thrGreen').value = th.green;
  document.getElementById('thrYellow').value = th.yellow;
}
function renderCards(metrics){
  const map = [
    ['meta','card-meta','Meta'],
    ['google','card-google','Google'],
    ['tiktok','card-tiktok','TikTok'],
    ['x','card-x','Twitter (X)']
  ];
  map.forEach(([key,id,label])=>{
    const el = document.getElementById(id);
    el.classList.remove('green','yellow','red');
    const m = metrics[key] || { clicks:0, status:'red' };
    el.classList.add(m.status);
    el.querySelector('.note').textContent = `${label}: Bugün ${m.clicks} tık.`;
  });
}
function renderActions(list){
  const ul = document.getElementById('actions');
  ul.innerHTML='';
  list.forEach(a=>{
    const li = document.createElement('li');
    li.textContent = `[${a.at}] ${a.action} ${a.platform ? '('+a.platform+')':''}`;
    ul.appendChild(li);
  });
}

document.getElementById('guardianToggle').onclick = async (e)=>{
  const next = e.currentTarget.dataset.on !== 'true';
  await api('/api/guardian/toggle', { method:'POST', body: JSON.stringify({ active: next }) });
  await load();
};
document.getElementById('saveThr').onclick = async ()=>{
  const green = Number(document.getElementById('thrGreen').value);
  const yellow = Number(document.getElementById('thrYellow').value);
  await api('/api/thresholds', { method:'POST', body: JSON.stringify({ green, yellow }) });
  await load();
};

document.querySelectorAll('.opt').forEach(b=>{
  b.onclick = async ()=>{
    const platform = b.dataset.p;
    await api('/api/optimize', { method:'POST', body: JSON.stringify({ platform }) });
    await load();
  };
});

setInterval(load, 10000);
load();
