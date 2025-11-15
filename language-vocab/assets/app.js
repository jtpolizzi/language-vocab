import { mountFlashcards } from './components/Flashcards.js';
import { mountSettings } from './components/SettingsModal.js';
import { mountTopBar } from './components/TopBar.js';
import { mountWordList } from './components/WordList.js';
import { mountWordMatch } from './components/WordMatch.js';
import { mountMultipleChoice } from './components/MultipleChoice.js';
import { State, hydrateWords } from './state.js';

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

// --- TSV loader ---
function parseTSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split('\t').map(h => h.trim());
    const idx = {
        word: headers.findIndex(h => /^(word|spanish)$/i.test(h)),
        definition: headers.findIndex(h => /^(definition|english)$/i.test(h)),
        POS: headers.findIndex(h => /^pos$/i.test(h)),
        CEFR: headers.findIndex(h => /^cefr$/i.test(h)),
        Tags: headers.findIndex(h => /^tags?$/i.test(h)),
    };
    const out = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.every(c => !c || !c.trim())) continue;
        out.push({
            word: (idx.word >= 0 ? cols[idx.word] : '').trim(),
            definition: (idx.definition >= 0 ? cols[idx.definition] : '').trim(),
            POS: (idx.POS >= 0 ? cols[idx.POS] : '').trim(),
            CEFR: (idx.CEFR >= 0 ? cols[idx.CEFR] : '').trim(),
            Tags: (idx.Tags >= 0 ? cols[idx.Tags] : '').trim(),
        });
    }
    return out;
}

async function loadData() {
    try {
        const res = await fetch('data/words.tsv', { cache: 'no-store' });
        if (!res.ok) throw new Error('TSV not found');
        const txt = await res.text();
        const raw = parseTSV(txt);
        hydrateWords(raw || [], { source: 'tsv', loadedAt: Date.now() });
    } catch (e) {
        hydrateWords([], { source: 'none', loadedAt: Date.now() });
    }
    renderRoute();
}

loadData();
