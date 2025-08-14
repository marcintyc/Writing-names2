'use strict';

const state = {
	connected: false,
	apiKey: '',
	videoId: '',
	liveChatId: '',
	nextPageToken: undefined,
	pollTimeoutId: null,
	typingInProgress: false,
	pendingNames: [],
	currentPollMs: 3000,
	lastUsefulMessageTs: Date.now(),
	recentNames: new Map(),
	authorLastAcceptedAt: new Map(), // New map for author cooldown
	nameCounts: new Map(),
	confettiEnabled: true,
};

const els = {
	connectBtn: null,
	disconnectBtn: null,
	ytInput: null,
	apiKeyInput: null,
	manualName: null,
	list: null,
	listContainer: null,
	statusBox: null,
	statsList: null,
	testKeyBtn: null,
	testLiveBtn: null,
};

function qs(id) { return document.getElementById(id); }

function setStatus(text) {
	if (!els.statusBox) return;
	els.statusBox.textContent = text;
}

function toggleUiConnected(connected) {
	state.connected = connected;
	els.connectBtn.disabled = connected;
	els.disconnectBtn.disabled = !connected;
	els.ytInput.disabled = connected;
	els.apiKeyInput.disabled = connected;
	els.testKeyBtn.disabled = connected;
}

// Typewriter settings
const TYPING_DELAY_SHORT_MS = 70; // for long texts (faster but still human-like)
const TYPING_DELAY_MED_MS = 90;  // medium length
const TYPING_DELAY_LONG_MS = 110; // short texts (slower, more readable)

function getTypingDelayFor(text) {
	const len = (text || '').length;
	if (len > 20) return TYPING_DELAY_SHORT_MS;
	if (len > 12) return TYPING_DELAY_MED_MS;
	return TYPING_DELAY_LONG_MS;
}

function appendName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return;
	incrementNameCount(trimmed);
	state.pendingNames.push(trimmed);
	if (!state.typingInProgress) {
		processTypingQueue();
	}
}

function incrementNameCount(name) {
	const current = state.nameCounts.get(name) || 0;
	const next = current + 1;
	state.nameCounts.set(name, next);
	renderStats();
	maybeConfetti(next, name);
}

function renderStats() {
	if (!els.statsList) return;
	const entries = Array.from(state.nameCounts.entries());
	if (entries.length === 0) { els.statsList.innerHTML = ''; return; }
	entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	const top = entries.slice(0, 10);
	const max = Math.max(...top.map(([, c]) => c));
	const rows = top.map(([n, c]) => {
		const width = Math.max(6, Math.round((c / max) * 100));
		const safeName = n.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		return `
			<li class="stat-row">
				<div class="stat-name">${safeName}</div>
				<div class="stat-count">${c}</div>
				<div class="stat-bar"><span style="width:${width}%"></span></div>
			</li>
		`;
	}).join('');
	els.statsList.innerHTML = rows;
}

function maybeConfetti(count, name) {
	if (!state.confettiEnabled || typeof window.confetti !== 'function') return;
	const milestones = [3, 5, 10, 20, 50];
	if (!milestones.includes(count)) return;
	const originX = 0.3 + Math.random() * 0.4;
	window.confetti({ particleCount: Math.min(250, 60 + count * 5), spread: 70, origin: { x: originX, y: 0.2 } });
}

async function processTypingQueue() {
	if (state.typingInProgress) return;
	state.typingInProgress = true;
	try {
		while (state.pendingNames.length > 0) {
			const nextText = state.pendingNames.shift();
			const li = document.createElement('li');
			li.classList.add('typing');
			const textNode = document.createTextNode('');
			const caret = document.createElement('span');
			caret.className = 'typing-caret';
			li.appendChild(textNode);
			li.appendChild(caret);
			els.list.appendChild(li);

			await typeOutText(textNode, caret, nextText);

			li.classList.remove('typing');
		}
	} finally {
		state.typingInProgress = false;
	}
}

async function typeOutText(textNode, caretEl, fullText) {
	const baseDelay = getTypingDelayFor(fullText);
	const chars = Array.from(fullText);
	for (let i = 0; i < chars.length; i++) {
		textNode.textContent += chars[i];
		// jitter: +-40% around base
		let jitter = baseDelay * (0.6 + Math.random() * 0.8);
		// small extra pause after spaces and punctuation
		if (/\s|[.,!?;:]/.test(chars[i])) {
			jitter += 80 + Math.random() * 140;
		}
		await new Promise((r) => setTimeout(r, Math.round(jitter)));
		requestAnimationFrame(scrollLastToCenter);
	}
	if (caretEl && caretEl.parentNode) {
		caretEl.parentNode.removeChild(caretEl);
	}
}

function scrollLastToCenter() {
	if (!els.list || !els.list.lastElementChild) return;
	const container = els.list;
	const last = els.list.lastElementChild;
	const lastRect = last.getBoundingClientRect();
	const containerRect = container.getBoundingClientRect();
	const offset = (lastRect.top + lastRect.bottom) / 2 - (containerRect.top + containerRect.bottom) / 2;
	container.scrollBy({ top: offset, behavior: 'smooth' });
}

function isLikelyCommand(message) {
	return message.startsWith('!') || message.startsWith('/') || message.startsWith('~');
}

function normalizeLetters(input) {
	let s = String(input || '').toLowerCase();
	try { s = s.replace(/[^\p{L}]+/gu, ''); } catch { s = s.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç]+/g, ''); }
	return s;
}

function isDiddySpam(message) {
	const letters = normalizeLetters(message);
	if (!letters) return false;
	if (letters.includes('diddy')) return true;
	if (/^(?:di)+(?:dy)+$/.test(letters)) return true; // e.g. didydidy
	// Broad fallback for short strings made of only d/i/y with all three present
	if (letters.length <= 10 && /^[diy]+$/.test(letters) && letters.includes('d') && letters.includes('i') && letters.includes('y')) return true;
	return false;
}

function isNoiseMessage(message) {
	const s = String(message || '').toLowerCase();
	if (!s) return true;
	if (s.includes('http://') || s.includes('https://') || s.includes('www.')) return true;
	// Requests to write/say the name
	const noisePhrases = [
		'write my name','can you write my name','say my name','name please','name pls','please write my name',
		'napisz moje imie','napisz moje imię','czy mozesz napisac','czy możesz napisać','napisz moje nazwisko'
	];
	if (noisePhrases.some(p => s.includes(p))) return true;
	// Greetings-only
	if (/^(hi|hello|siema|cześć|czesc|hej|yo|sup|hola)[.!?\s]*$/.test(s)) return true;
	// DIDDY meme
	if (isDiddySpam(s)) return true;
	return false;
}

// Heurystyczne: wyciągnij potencjalne imię (1-3 słowa, litery + polskie znaki, myślnik/apostrof), Title Case
function extractValidName(message) {
	if (isNoiseMessage(message)) return null;
	if (!message) return null;
	let s = String(message).trim();
	if (!s) return null;
	// Usuń wszystko poza literami (unicode), spacjami, myślnikiem i apostrofem
	try {
		s = s.replace(/[^\p{L}\s'\-]/gu, '');
	} catch {
		// Fallback bez \p{L}
		s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]/g, '');
	}
	// Redukuj wielokrotne spacje
	s = s.replace(/\s+/g, ' ').trim();
	if (!s) return null;
	const tokens = s.split(' ');
	if (tokens.length < 1 || tokens.length > 3) return null;
	// Każdy token 2-20 znaków, zaczyna się literą
	for (const t of tokens) {
		if (t.length < 2 || t.length > 20) return null;
		if (!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç]/.test(t)) return null;
	}
	// Title Case
	const titled = tokens.map(tok => tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase());
	const candidate = titled.join(' ');
	// Profanity blocklist
	if (containsProfanity(candidate)) return null;
	// Diddy again on sanitized
	if (isDiddySpam(candidate)) return null;
	return candidate;
}

function containsProfanity(text) {
	const s = text.toLowerCase();
	// Minimalna lista (PL/EN). Można rozszerzyć wedle potrzeb.
	const bad = [
		'kurwa','chuj','pizda','jebac','jebać','spierdalaj','debil','idiota','szmata','frajer',
		'fuck','shit','bitch','asshole','faggot','nigger','cunt','slut','bastard','retard'
	];
	return bad.some(w => s.includes(w));
}

function extractVideoId(input) {
	const raw = (input || '').trim();
	if (!raw) return '';
	// If pure 11-char id
	if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
	try {
		const url = new URL(raw);
		if (url.hostname.includes('youtube.com')) {
			const v = url.searchParams.get('v');
			if (v) return v;
			// youtube.com/live/<id>
			const parts = url.pathname.split('/').filter(Boolean);
			const liveIdx = parts.indexOf('live');
			if (liveIdx !== -1 && parts[liveIdx + 1]) return parts[liveIdx + 1];
		}
		if (url.hostname === 'youtu.be') {
			const id = url.pathname.replace(/^\//, '');
			if (id) return id;
		}
	} catch {}
	return raw;
}

async function fetchLiveChatId(videoId, apiKey) {
	const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
	const res = await fetch(endpoint);
	if (!res.ok) throw new Error(`videos.list HTTP ${res.status}`);
	const data = await res.json();
	const item = data.items && data.items[0];
	const live = item && item.liveStreamingDetails;
	const chatId = live && (live.activeLiveChatId || live.concurrentViewers && live.activeLiveChatId);
	if (!chatId) throw new Error('Brak aktywnego live chat dla tego wideo.');
	return chatId;
}

async function pollChatOnce() {
	if (!state.liveChatId || !state.apiKey) return;
	const base = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
	const params = new URLSearchParams({
		liveChatId: state.liveChatId,
		part: 'snippet,authorDetails',
		key: state.apiKey,
	});
	if (state.nextPageToken) params.set('pageToken', state.nextPageToken);
	const url = `${base}?${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`liveChat.messages HTTP ${res.status}`);
	const data = await res.json();

	const items = Array.isArray(data.items) ? data.items : [];
	let appended = 0;
	for (const it of items) {
		const msg = it?.snippet?.displayMessage || '';
		if (!msg) continue;
		if (isLikelyCommand(msg)) continue;
		const authorId = it?.authorDetails?.channelId || it?.authorDetails?.channelUrl || it?.authorDetails?.displayName || '';
		if (typeof isAuthorCoolingDown === 'function' && isAuthorCoolingDown(authorId)) continue;
		const name = extractValidName(msg);
		if (!name) continue;
		appendName(name);
		if (typeof markAuthorAccepted === 'function') markAuthorAccepted(authorId);
		state.lastUsefulMessageTs = Date.now();
		appended++;
	}

	state.nextPageToken = data.nextPageToken;
	const recommended = Number(data.pollingIntervalMillis || 1500);
	const POLL_MIN_MS = 5000;
	const POLL_MAX_MS = 15000;
	let nextMs = Math.max(recommended, POLL_MIN_MS);
	if (appended === 0) {
		nextMs = Math.min(POLL_MAX_MS, Math.floor((state.currentPollMs || nextMs) * 1.5));
	}
	// Jeżeli od ostatniego zaakceptowanego imienia minęła >1 min, przejdź do max
	if (Date.now() - state.lastUsefulMessageTs > 60000) {
		nextMs = POLL_MAX_MS;
	}
	state.currentPollMs = nextMs;
	state.pollTimeoutId = setTimeout(() => pollChatLoop().catch(onPollError), state.currentPollMs);
}

async function pollChatLoop() {
	if (!state.connected) return;
	await pollChatOnce();
}

function onPollError(err) {
	console.error(err);
	setStatus('Błąd odczytu czatu. Sprawdz klucz API i ID filmu.');
	// spróbuj ponownie po chwili
	state.pollTimeoutId = setTimeout(() => pollChatLoop().catch(onPollError), 3000);
}

async function connectYouTube() {
	if (state.connected) disconnectYouTube();
	const apiKey = els.apiKeyInput.value.trim();
	const videoInput = els.ytInput.value.trim();
	if (!apiKey) return setStatus('Podaj klucz API YouTube.');
	if (!videoInput) return setStatus('Podaj URL lub ID filmu.');
	const videoId = extractVideoId(videoInput);
	if (!videoId) return setStatus('Nie udało się rozpoznać ID filmu.');

	state.apiKey = apiKey;
	state.videoId = videoId;
	state.currentPollMs = 3000;
	setStatus('Pobieranie liveChatId…');
	try {
		const chatId = await fetchLiveChatId(videoId, apiKey);
		state.liveChatId = chatId;
		setStatus(`Połączono z live chat: ${videoId}`);
		toggleUiConnected(true);
		state.connected = true;
		state.nextPageToken = undefined;
		pollChatLoop().catch(onPollError);
	} catch (err) {
		console.error(err);
		setStatus('Nie udało się uzyskać liveChatId. Czy stream jest na żywo i klucz API poprawny?');
	}
}

function disconnectYouTube() {
	state.connected = false;
	if (state.pollTimeoutId) {
		clearTimeout(state.pollTimeoutId);
		state.pollTimeoutId = null;
	}
	toggleUiConnected(false);
	setStatus('Niepołączono z czatem.');
}

async function testApiKey() {
	const key = els.apiKeyInput.value.trim();
	if (!key) { setStatus('Wpisz klucz API, aby go przetestować.'); return; }
	els.testKeyBtn.disabled = true;
	setStatus('Testowanie klucza API…');
	try {
		const url = `https://www.googleapis.com/youtube/v3/i18nLanguages?part=snippet&hl=pl&key=${encodeURIComponent(key)}`;
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const data = await res.json();
		if (Array.isArray(data?.items)) {
			setStatus('Klucz API wygląda OK.');
		} else {
			setStatus('Odpowiedź nieprawidłowa – sprawdź uprawnienia klucza.');
		}
	} catch (e) {
		console.error(e);
		setStatus('Błąd testu klucza API. Sprawdź ograniczenia i poprawność.');
	} finally {
		els.testKeyBtn.disabled = state.connected;
	}
}

function isAuthorCoolingDown(authorId) {
	if (!authorId) return false;
	const now = Date.now();
	const last = state.authorLastAcceptedAt?.get(authorId) || 0;
	return (now - last) < 5000; // 5s cooldown per author
}

function markAuthorAccepted(authorId) {
	if (!authorId) return;
	if (!state.authorLastAcceptedAt) state.authorLastAcceptedAt = new Map();
	state.authorLastAcceptedAt.set(authorId, Date.now());
}

async function testLive() {
	const key = els.apiKeyInput.value.trim();
	const videoInput = els.ytInput.value.trim();
	if (!key) return setStatus('Podaj klucz API do testu LIVE.');
	if (!videoInput) return setStatus('Podaj URL lub ID filmu do testu LIVE.');
	const videoId = extractVideoId(videoInput);
	if (!videoId) return setStatus('Nie rozpoznano ID filmu.');
	setStatus('Sprawdzanie liveChatId dla tego wideo…');
	try {
		const chatId = await fetchLiveChatId(videoId, key);
		if (chatId) setStatus(`OK: liveChatId jest dostępne dla ${videoId}.`);
		else setStatus('Nie znaleziono liveChatId. Transmisja może nie być na żywo.');
	} catch (e) {
		console.error(e);
		setStatus('Błąd testu LIVE. Czy film jest na żywo i klucz API ma dostęp do YouTube Data API v3?');
	}
}

function setupUi() {
	els.connectBtn = qs('connectBtn');
	els.disconnectBtn = qs('disconnectBtn');
	els.ytInput = qs('ytInput');
	els.apiKeyInput = qs('apiKeyInput');
	els.manualName = qs('manualName');
	els.list = qs('nameList');
	els.listContainer = qs('listContainer');
	els.statusBox = qs('statusBox');
	els.statsList = qs('statsList');
	els.testKeyBtn = qs('testKeyBtn');
	els.testLiveBtn = qs('testLiveBtn');

	els.connectBtn.addEventListener('click', connectYouTube);
	els.disconnectBtn.addEventListener('click', disconnectYouTube);
	els.ytInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectYouTube(); });
	els.apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectYouTube(); });
	els.manualName.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			const name = extractValidName(els.manualName.value);
			if (name) appendName(name);
			els.manualName.value = '';
		}
	});
	els.testKeyBtn.addEventListener('click', testApiKey);
	els.testLiveBtn.addEventListener('click', testLive);
}

window.addEventListener('DOMContentLoaded', setupUi);