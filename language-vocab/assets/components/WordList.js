import { State, Prog, subscribe, applyFilters, sortWords } from '../state.js';

export function mountWordList(container){
  container.innerHTML = '';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  const cols = [
    { key:'star', label:'★' },
    { key:'weight', label:'Weight' },
    { key:'spanish', label:'Spanish' },
    { key:'english', label:'English' },
    { key:'pos', label:'POS' },
    { key:'cefr', label:'CEFR' },
    { key:'tags', label:'Tags' },
  ];

  const trh = document.createElement('tr');
  cols.forEach(c=>{
    const th = document.createElement('th'); th.textContent = c.label;
    th.onclick = ()=>{
      const dir = (State.sort.key===c.key && State.sort.dir==='asc') ? 'desc' : 'asc';
      State.set('sort', { key:c.key, dir });
    };
    trh.appendChild(th);
  });
  thead.appendChild(trh);
  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);

  function render(){
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);
    tbody.innerHTML = '';
    for(const w of sorted){
      const tr = document.createElement('tr');
      tr.appendChild(tdStar(w.id));
      tr.appendChild(tdWeight(w.id));
      tr.appendChild(tdText(w.es));
      tr.appendChild(tdText(w.en));
      tr.appendChild(tdText(w.pos));
      tr.appendChild(tdText(w.cefr));
      tr.appendChild(tdText(w.tags));
      tbody.appendChild(tr);
    }
    applyColumnVisibility(table);
  }

  render();
  return subscribe(render);
}

function tdText(text){
  const td = document.createElement('td'); td.textContent = text || '';
  return td;
}

function tdStar(id){
  const td = document.createElement('td');
  const b = document.createElement('button'); b.className='iconbtn'; b.title='Star';
  const setIcon = ()=> b.textContent = (Prog.star(id)?'★':'☆');
  setIcon(); b.onclick = ()=>{ Prog.setStar(id, !Prog.star(id)); setIcon(); };
  td.appendChild(b); return td;
}

function tdWeight(id){
  const td = document.createElement('td');
  const wrap = document.createElement('span'); wrap.className='dots';
  const v = Prog.weight(id);
  for(let i=0;i<5;i++){
    const d = document.createElement('button'); d.className='dot'+(i<=v?' active':''); d.title='Weight '+i;
    d.onclick = ()=>{
      for(let j=0;j<wrap.children.length;j++){ wrap.children[j].classList.toggle('active', j<=i) }
      Prog.setWeight(id, i);
      lab.textContent = ['New','Shaky','OK','Strong','Mastered'][Prog.weight(id)]||'New';
    };
    wrap.appendChild(d);
  }
  const lab = document.createElement('span'); lab.className='weight-label'; lab.textContent=['New','Shaky','OK','Strong','Mastered'][v]||'New';
  wrap.appendChild(lab);
  td.appendChild(wrap);
  return td;
}

function applyColumnVisibility(table){
  const map = { star:'★', weight:'weight', spanish:'spanish', english:'english', pos:'pos', cefr:'cefr', tags:'tags' };
  const headers = Array.from(table.querySelectorAll('thead th')).map(th=>th.textContent.trim().toLowerCase());
  Object.entries(map).forEach(([k,needle])=>{
    const idx = headers.findIndex(h=> h.includes(needle) );
    if(idx<0) return;
    const show = !!State.columns[k];
    table.querySelectorAll(`thead th:nth-child(${idx+1}), tbody td:nth-child(${idx+1})`).forEach(el=> el.classList.toggle('hide', !show));
  });
}
