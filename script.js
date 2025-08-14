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
	for (const it of items) {
		const msg = it?.snippet?.displayMessage || '';
		if (!msg) continue;
		if (isLikelyCommand(msg)) continue;
		appendName(msg);
	}

	state.nextPageToken = data.nextPageToken;
	const interval = Number(data.pollingIntervalMillis || 1500);
	state.pollTimeoutId = setTimeout(() => pollChatLoop().catch(onPollError), interval);
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
			appendName(els.manualName.value);
			els.manualName.value = '';
		}
	});
}

window.addEventListener('DOMContentLoaded', setupUi);