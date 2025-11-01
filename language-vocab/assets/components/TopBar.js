import { State, subscribe, applyFilters, sortWords, shuffledIds } from '../state.js';

export function mountTopBar(container){
  container.innerHTML = '';
  const panel = document.createElement('div'); panel.className='panel';
  const row = document.createElement('div'); row.className='row';

  const onlyStar = chip('Only ★', State.filters.starred, () => {
    State.set('filters', { ...State.filters, starred: !State.filters.starred });
  });
  row.appendChild(onlyStar);

  for (let n=0;n<=4;n++){
    row.appendChild(chip('W'+n, State.filters.weight.includes(n), () => {
      const set = new Set(State.filters.weight);
      set.has(n) ? set.delete(n) : set.add(n);
      State.set('filters', { ...State.filters, weight: [...set].sort((a,b)=>a-b) });
    }));
  }

  const sh = chip('Shuffle', false, () => {
    const filtered = applyFilters(State.words);
    const ids = shuffledIds(sortWords(filtered));
    State.set('order', ids);
    window.location.hash = '#/cards';
  });
  row.appendChild(sh);

  const sp = document.createElement('span'); sp.className='spacer'; row.appendChild(sp);

  const gear = document.createElement('button'); gear.className='iconbtn'; gear.textContent='⚙'; gear.title='Settings';
  gear.onclick = () => window.dispatchEvent(new CustomEvent('open-settings'));
  row.appendChild(gear);

  panel.appendChild(row);
  container.appendChild(panel);

  return subscribe(()=>{
    onlyStar.setAttribute('aria-pressed', String(State.filters.starred));
    const chips = row.querySelectorAll('[data-weight]');
    chips.forEach(btn=>{
      const n = parseInt(btn.getAttribute('data-weight'),10);
      btn.setAttribute('aria-pressed', String(State.filters.weight.includes(n)));
    });
  });
}

function chip(label, pressed, onClick){
  const b = document.createElement('button'); b.className='chip'; b.textContent=label;
  b.setAttribute('aria-pressed', String(!!pressed));
  b.onclick = onClick;
  if(/^W\d$/.test(label)) b.dataset.weight = label.slice(1);
  return b;
}
