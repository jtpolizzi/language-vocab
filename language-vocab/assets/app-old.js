import { State, mapRaw } from './state.js';
import { mountTopBar } from './components/TopBar.js';
import { mountWordList } from './components/WordList.js';
import { mountFlashcards } from './components/Flashcards.js';
import { mountSettings } from './components/SettingsModal.js';

const topbar = document.getElementById('topbar');
const view = document.getElementById('view');

mountTopBar(topbar);
mountSettings();

function renderRoute(){
  const hash = location.hash || '#/list';
  if(hash.startsWith('#/cards')){
    mountFlashcards(view);
  } else {
    mountWordList(view);
  }
}
window.addEventListener('hashchange', renderRoute);

async function loadData(){
  try{
    const res = await fetch('data/words.json', { cache:'no-store' });
    const raw = await res.json();
    State.set('words', mapRaw(raw));
  }catch(e){
    console.error('Failed to load data/words.json', e);
    State.set('words', []);
  }finally{
    renderRoute();
  }
}
loadData();
