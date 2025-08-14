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
	const key = trimmed.toLowerCase();
	const now = Date.now();
	const recentAt = state.recentNames.get(key) || 0;
	if (now - recentAt < 10000) {
		return; // ignore duplicates within 10s
	}
	state.recentNames.set(key, now);
	// prune old dedupe entries (>5 min)
	for (const [k, ts] of state.recentNames) {
		if (now - ts > 5 * 60 * 1000) state.recentNames.delete(k);
	}
	state.lastUsefulMessageTs = now;
	state.pendingNames.push(trimmed);
	if (!state.typingInProgress) {
		processTypingQueue();
	}
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

// Heurystyczne: wyciągnij potencjalne imię (1-3 słowa, litery + polskie znaki, myślnik/apostrof), Title Case
function extractValidName(message) {
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
		const name = extractValidName(msg);
		if (!name) continue;
		appendName(name);
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

function setupUi() {
	els.connectBtn = qs('connectBtn');
	els.disconnectBtn = qs('disconnectBtn');
	els.ytInput = qs('ytInput');
	els.apiKeyInput = qs('apiKeyInput');
	els.manualName = qs('manualName');
	els.list = qs('nameList');
	els.listContainer = qs('listContainer');
	els.statusBox = qs('statusBox');

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
}

window.addEventListener('DOMContentLoaded', setupUi);