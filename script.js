'use strict';

const state = {
	client: null,
	connected: false,
	channelName: '',
	messageQueue: [],
	autoScrollLock: false,
};

const els = {
	connectBtn: null,
	disconnectBtn: null,
	channelInput: null,
	manualName: null,
	list: null,
	listContainer: null,
	statusBox: null,
};

function qs(id) { return document.getElementById(id); }

function setStatus(text, type = 'info') {
	if (!els.statusBox) return;
	els.statusBox.textContent = text;
}

function toggleUiConnected(connected) {
	state.connected = connected;
	els.connectBtn.disabled = connected;
	els.disconnectBtn.disabled = !connected;
	els.channelInput.disabled = connected;
}

function appendName(name) {
	const trimmed = String(name || '').trim();
	if (!trimmed) return;
	const li = document.createElement('li');
	li.textContent = trimmed;
	els.list.appendChild(li);
	requestAnimationFrame(scrollLastToCenter);
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

function setupTwitch() {
	if (state.client) {
		try { state.client.disconnect(); } catch {}
		state.client = null;
	}
	const channel = els.channelInput.value.trim();
	if (!channel) {
		setStatus('Podaj nazwę kanału i spróbuj ponownie.');
		return;
	}
	state.channelName = channel;
	setStatus('Łączenie z czatem Twitch…');

	// Anonymous read-only connection
	const client = new tmi.Client({
		connection: { reconnect: true, secure: true },
		identity: { username: 'justinfan' + Math.floor(Math.random() * 100000), password: 'oauth:anonymous' },
		channels: [channel]
	});

	client.on('connected', () => {
		setStatus(`Połączono z #${channel}`);
		toggleUiConnected(true);
	});

	client.on('disconnected', (reason) => {
		setStatus(`Rozłączono: ${reason || 'nieznany powód'}`);
		toggleUiConnected(false);
	});

	client.on('message', (target, tags, message, self) => {
		if (self) return;
		if (isLikelyCommand(message)) return; // ignore bot commands
		appendName(message);
	});

	client.on('notice', (channel, msgid, message) => {
		if (message) setStatus(message);
	});

	client.on('reconnect', () => setStatus('Ponowne łączenie…'));
	client.on('join', () => setStatus(`Dołączono do #${channel}`));
	client.on('part', () => setStatus(`Opuściliśmy #${channel}`));

	client.connect().catch((err) => {
		console.error(err);
		setStatus('Błąd połączenia. Sprawdź nazwę kanału lub odśwież stronę.');
	});

	state.client = client;
}

function disconnectTwitch() {
	if (state.client) {
		try { state.client.disconnect(); } catch {}
		state.client = null;
	}
	toggleUiConnected(false);
	setStatus('Niepołączono z czatem.');
}

function setupUi() {
	els.connectBtn = qs('connectBtn');
	els.disconnectBtn = qs('disconnectBtn');
	els.channelInput = qs('channelInput');
	els.manualName = qs('manualName');
	els.list = qs('nameList');
	els.listContainer = qs('listContainer');
	els.statusBox = qs('statusBox');

	els.connectBtn.addEventListener('click', setupTwitch);
	els.disconnectBtn.addEventListener('click', disconnectTwitch);
	els.channelInput.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') setupTwitch();
	});
	els.manualName.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			appendName(els.manualName.value);
			els.manualName.value = '';
		}
	});
}

window.addEventListener('DOMContentLoaded', setupUi);