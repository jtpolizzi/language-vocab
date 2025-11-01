import { State, subscribe } from '../state.js';

export function mountSettings(){
  let bd = document.querySelector('.backdrop');
  if(!bd){
    bd = document.createElement('div'); bd.className='backdrop';
    bd.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3>Settings</h3>
      <section>
        <strong>Word List columns</strong>
        <div class="grid" id="cols"></div>
      </section>
      <section>
        <strong>Default sort</strong>
        <div class="grid" id="sorts"></div>
      </section>
      <div class="actions"><button class="iconbtn" id="close">Close</button></div>
    </div>`;
    document.body.appendChild(bd);
    bd.addEventListener('click', (e)=>{ if(e.target===bd) bd.style.display='none' });
    bd.querySelector('#close').onclick = ()=> bd.style.display='none';
  }

  function render(){
    const cols = bd.querySelector('#cols'); cols.innerHTML='';
    Object.entries(State.columns).forEach(([k,v])=>{
      const L = document.createElement('label');
      const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!v;
      cb.onchange = ()=> State.set('columns', { ...State.columns, [k]: cb.checked });
      L.appendChild(cb);
      L.appendChild(document.createTextNode(' '+k));
      cols.appendChild(L);
    });

    const sorts = bd.querySelector('#sorts'); sorts.innerHTML='';
    ['spanish','english','pos','cefr','tags','star','weight'].forEach(k=>{
      const L = document.createElement('label');
      const rb = document.createElement('input'); rb.type='radio'; rb.name='v23-sorts'; rb.value=k; rb.checked = (State.sort.key===k);
      rb.onchange = ()=> State.set('sort', { key:k, dir:'asc' });
      L.appendChild(rb); L.appendChild(document.createTextNode(' '+k));
      sorts.appendChild(L);
    });
  }

  render(); subscribe(render);
  window.addEventListener('open-settings', ()=> bd.style.display='grid');
}
