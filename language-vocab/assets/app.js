import { mountFlashcards } from './components/Flashcards.js';
import { mountSettings } from './components/SettingsModal.js';
import { mountTopBar } from './components/TopBar.js';
import { mountWordList } from './components/WordList.js';
import { mountWordMatch } from './components/WordMatch.js';
import { mountMultipleChoice } from './components/MultipleChoice.js';
import { State, mapRaw } from './state.js';

const topbar = document.getElementById('topbar');
const view = document.getElementById('view');

mountTopBar(topbar);
mountSettings();

let cleanupView = () => {};

function renderRoute() {
    cleanupView();
    cleanupView = () => {};

    const hash = location.hash || '#/list';
    setActiveNav(hash);
    if (hash.startsWith('#/cards')) {
        cleanupView = mountFlashcards(view) || (() => {});
    } else if (hash.startsWith('#/match')) {
        cleanupView = mountWordMatch(view) || (() => {});
    } else if (hash.startsWith('#/choice')) {
        cleanupView = mountMultipleChoice(view) || (() => {});
    } else {
        cleanupView = mountWordList(view) || (() => {});
    }
}
window.addEventListener('hashchange', renderRoute);

function setActiveNav(hash) {
    const links = document.querySelectorAll('.app-header nav a');
    links.forEach((link) => {
        const target = link.getAttribute('href') || '';
        const isActive = target && hash.startsWith(target);
        link.classList.toggle('active', !!isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

// --- TSV loader (preferred) with JSON fallback ---
function parseTSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split('\t').map(h => h.trim());
    const idx = {
        Spanish: headers.findIndex(h => /^(spanish|word)$/i.test(h)),
        English: headers.findIndex(h => /^(english|definition)$/i.test(h)),
        POS: headers.findIndex(h => /^pos$/i.test(h)),
        CEFR: headers.findIndex(h => /^cefr$/i.test(h)),
        Tags: headers.findIndex(h => /^tags?$/i.test(h)),
    };
    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.every(c => !c || !c.trim())) continue;
        out.push({
            Spanish: (idx.Spanish >= 0 ? cols[idx.Spanish] : '').trim(),
            English: (idx.English >= 0 ? cols[idx.English] : '').trim(),
            POS: (idx.POS >= 0 ? cols[idx.POS] : '').trim(),
            CEFR: (idx.CEFR >= 0 ? cols[idx.CEFR] : '').trim(),
            Tags: (idx.Tags >= 0 ? cols[idx.Tags] : '').trim(),
        });
    }
    return out;
}

async function tryLoadTSV() {
    try {
        const res = await fetch('data/words.tsv', { cache: 'no-store' });
        if (!res.ok) throw new Error('TSV not found');
        const txt = await res.text();
        const raw = parseTSV(txt);
        return raw;
    } catch (e) {
        return null;
    }
}

async function tryLoadJSON() {
    try {
        const res = await fetch('data/words.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('JSON not found');
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function loadData() {
    let raw = await tryLoadTSV();
    if (!raw) raw = await tryLoadJSON();
    if (!raw) raw = [];
    State.set('words', mapRaw(raw));
    renderRoute();
}

loadData();
