import { State, Prog, subscribe, applyFilters, sortWords } from '../state.js';

export function mountFlashcards(container){
  container.innerHTML = '';
  const card = document.createElement('div'); card.className='card';
  const topr = document.createElement('div'); topr.className='topright';
  const foot = document.createElement('div'); foot.className='footmeta';
  card.appendChild(topr); card.appendChild(foot);

  const bar = document.createElement('div'); bar.className='bottombar';
  const prev = document.createElement('button'); prev.className='bigbtn'; prev.textContent='←';
  const next = document.createElement('button'); next.className='bigbtn'; next.textContent='→';
  const count = document.createElement('span'); count.className='counter'; count.textContent='1/1';
  bar.append(prev, count, next);
  document.body.appendChild(bar);
  document.body.classList.add('pad-bottom');

  let showFront = true;
  let index = 0;
  let view = [];

  function computeView(){
    const filtered = applyFilters(State.words);
    const sorted = sortWords(filtered);
    if(State.order && State.order.length){
      const byId = new Map(sorted.map(w=>[w.id,w]));
      const inOrder = State.order.map(id=>byId.get(id)).filter(Boolean);
      if(inOrder.length) return inOrder;
    }
    return sorted;
  }

  function render(){
    view = computeView();
    if(index >= view.length) index = Math.max(0, view.length-1);
    const w = view[index];
    if(!w){ card.textContent = 'No cards match your filters.'; return; }

    card.textContent = showFront ? (w.es||'') : (w.en||'');
    card.appendChild(topr);
    card.appendChild(foot);

    topr.innerHTML = '';
    const star = document.createElement('button'); star.className='iconbtn'; star.title='Star';
    const setStar = ()=> star.textContent = (Prog.star(w.id)?'★':'☆'); setStar();
    star.onclick = ()=>{ Prog.setStar(w.id, !Prog.star(w.id)); setStar(); };
    topr.appendChild(star);

    const dots = document.createElement('span'); dots.className='dots';
    const v = Prog.weight(w.id);
    for(let i=0;i<5;i++){
      const d=document.createElement('button'); d.className='dot'+(i<=v?' active':''); d.title='Weight '+i;
      d.onclick = ()=>{ Prog.setWeight(w.id,i); render(); };
      dots.appendChild(d);
    }
    const lab=document.createElement('span'); lab.className='weight-label'; lab.textContent=['New','Shaky','OK','Strong','Mastered'][v]||'New';
    dots.appendChild(lab);
    topr.appendChild(dots);

    foot.textContent = [w.pos,w.cefr,w.tags].filter(Boolean).join(' • ');
    count.textContent = `${view.length? index+1:0} / ${view.length}`;
  }

  function prevCard(){ if(index>0){ index--; showFront=true; render(); } }
  function nextCard(){ if(index<view.length-1){ index++; showFront=true; render(); } }
  prev.onclick = prevCard; next.onclick = nextCard;
  card.addEventListener('click', ()=>{ showFront = !showFront; render(); });
  card.addEventListener('touchstart', (e)=>{ card.dataset.tX=e.touches[0].clientX; card.dataset.tY=e.touches[0].clientY; card.dataset.tT=Date.now(); }, {passive:true});
  card.addEventListener('touchend', (e)=>{
    const dx=Math.abs(e.changedTouches[0].clientX - (parseFloat(card.dataset.tX)||0));
    const dy=Math.abs(e.changedTouches[0].clientY - (parseFloat(card.dataset.tY)||0));
    const dt=Date.now() - (parseInt(card.dataset.tT)||0);
    if(dx<10 && dy<10 && dt<300){ showFront=!showFront; render(); }
  });

  container.appendChild(card);
  render();
  return subscribe(()=>render());
}
