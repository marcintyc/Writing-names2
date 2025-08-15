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
	countryCounts: new Map(),
	confettiEnabled: true,
	speedMode: 'normal',
	spamMode: 'normal',
	mode: 'names',
	lastSubscriberName: '',
	lastNameInfo: null, // New state variable for name info
	namesDatabase: new Set(), // Database of known names
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
	testNamesBtn: null,
	speedSelect: null,
	refreshBtn: null,
	spamSelect: null,
	eventToasts: null,
	modeSelect: null,
	modeTitle: null,
	modeHint: null,
	statsTitle: null,
	lastSub: null,
	softRefreshBtn: null,
	hamburgerBtn: null,
	fontSelect: null,
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
	if (state.speedMode === 'instant') return 0;
	const len = (text || '').length;
	let base;
	if (len > 20) base = TYPING_DELAY_SHORT_MS;
	else if (len > 12) base = TYPING_DELAY_MED_MS;
	else base = TYPING_DELAY_LONG_MS;
	switch (state.speedMode) {
		case 'fast': base *= 0.5; break;
		case 'slow': base *= 1.6; break;
		default: break;
	}
	return base;
}

function appendEntry(text) {
	const trimmed = String(text || '').trim();
	if (!trimmed) return;
	// blacklist removed: allow re-adding
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

function incrementCountryCount(country) {
	const current = state.countryCounts.get(country) || 0;
	const next = current + 1;
	state.countryCounts.set(country, next);
	renderStats();
	maybeConfetti(next, country);
}

function renderStats() {
	if (!els.statsList) return;
	let map = state.mode === 'countries' ? state.countryCounts : state.nameCounts;
	const entries = Array.from(map.entries());
	if (entries.length === 0) { els.statsList.innerHTML = ''; if (els.statsTitle) els.statsTitle.textContent = state.mode === 'countries' ? 'Countries Rank' : 'Top imiona'; return; }
	entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	const top = entries.slice(0, 10);
	const max = Math.max(...top.map(([, c]) => c));
	const [first, second, third, ...rest] = top;
	const makeRow = (name, count, opts = {}) => {
		const width = Math.max(6, Math.round((count / max) * 100));
		const safeName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		const medal = opts.medal ? `<span class="medal ${opts.medal}"></span>` : '';
		const rankNum = typeof opts.rank === 'number' ? `<span class="rank-num">${opts.rank}</span>` : '';
		return `
			<li class="stat-row ${opts.podium ? 'podium' : ''}">
				<div class="stat-name">${medal}${rankNum}<span>${safeName}</span></div>
				<div class="stat-count">${count}</div>
				<div class="stat-bar"><span style="width:${width}%"></span></div>
			</li>
		`;
	};
	let html = '';
	if (first) html += makeRow(first[0], first[1], { podium: true, medal: 'gold' });
	if (second) html += makeRow(second[0], second[1], { podium: true, medal: 'silver' });
	if (third) html += makeRow(third[0], third[1], { podium: true, medal: 'bronze' });
	rest.forEach((e, idx) => { html += makeRow(e[0], e[1], { rank: idx + 4 }); });
	els.statsList.innerHTML = html;
	if (els.statsTitle) {
		els.statsTitle.textContent = state.mode === 'countries' ? 'Countries Rank' : 'Top imiona';
	}
}

function maybeConfetti(count, name) {
	if (!state.confettiEnabled || typeof window.confetti !== 'function') return;
	const milestones = [3, 5, 10, 20, 50];
	if (!milestones.includes(count)) return;
	const originX = 0.3 + Math.random() * 0.4;
	window.confetti({ particleCount: Math.min(250, 60 + count * 5), spread: 70, origin: { x: originX, y: 0.2 } });
}

function rebuildCountsFromList() {
	state.nameCounts = new Map();
	state.countryCounts = new Map();
	const items = Array.from(els.list.querySelectorAll('li'));
	for (const li of items) {
		const raw = (li.firstChild?.textContent || li.textContent || '').trim();
		if (!raw) continue;
		if (state.mode === 'countries') {
			const c = extractValidCountry(raw);
			if (c) {
				const prev = state.countryCounts.get(c) || 0;
				state.countryCounts.set(c, prev + 1);
			}
		} else {
			const name = await extractValidName(raw);
			if (name) {
				const prev = state.nameCounts.get(name) || 0;
				state.nameCounts.set(name, prev + 1);
			}
		}
	}
	renderStats();
}

function removeAllListEntries(text) {
	const target = String(text || '').toLowerCase().trim();
	if (!target) return;
	const items = Array.from(els.list.querySelectorAll('li'));
	for (const li of items) {
		const raw = (li.firstChild?.textContent || li.textContent || '').trim();
		if (raw && raw.toLowerCase() === target) {
			li.remove();
		}
	}
}

function handleDeleteEntry(li, text) {
	// Legacy: redirect to single remove
	singleRemoveEntry(li, text);
}

function safeDelete(li, text) {
	singleRemoveEntry(li, text);
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
			// delete button (single remove)
			const del = document.createElement('button');
			del.className = 'name-delete';
			del.type = 'button';
			del.textContent = '×';
			del.addEventListener('click', () => singleRemoveEntry(li, nextText));
			li.appendChild(del);
			els.list.appendChild(li);

			await typeOutText(textNode, caret, nextText);

			li.classList.remove('typing');
		}
	} finally {
		state.typingInProgress = false;
	}
}

function singleRemoveEntry(li, text) {
	if (li && li.remove) li.remove();
	// Recompute counts from remaining list
	rebuildCountsFromList();
}

async function typeOutText(textNode, caretEl, fullText) {
	if (state.speedMode === 'instant') {
		textNode.textContent = fullText;
		if (caretEl && caretEl.parentNode) caretEl.parentNode.removeChild(caretEl);
		requestAnimationFrame(scrollLastToCenter);
		return;
	}
	const baseDelay = getTypingDelayFor(fullText);
	const chars = Array.from(fullText);
	for (let i = 0; i < chars.length; i++) {
		textNode.textContent += chars[i];
		let jitter = baseDelay * (0.6 + Math.random() * 0.8);
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
	const noisePhrases = [
		'write my name','can you write my name','say my name','name please','name pls','please write my name',
		'napisz moje imie','napisz moje imię','czy mozesz napisac','czy możesz napisać','napisz moje nazwisko',
		'hello','hi','hey','hej','siema','cześć','czesc','hola','bonjour','hallo','yo','sup','what\'s up','whats up',
		'thank you','thanks','dzieki','dzięki','danke','gracias','merci','thanks for watching','thanks for stream','thank you for stream','love the stream','love your stream',
		'what is this','co to jest','wtf','lol','xd','lmao','rofl','omg','idk','brb','gtg','g2g','btw','asap','gg','wp','ez','nice','cool','pog','poggers',
		'subscribe','subscribed','i subscribed','i just subscribed','subskrybuj','isubbed','i subbed','i just subbed','subbed','new sub','new subscriber','hit the bell','turn on notifications','smash like','drop a like',
		'please','pls','plz','ty','thx','tysm','tyvm','tnx','tks','follow'
	];
	if (noisePhrases.some(p => s.includes(p))) return true;
	if (/^(hi|hello|siema|cześć|czesc|hej|yo|sup|hola)[.!?\s]*$/.test(s)) return true;
	if (isDiddySpam(s)) return true;
	return false;
}

// Test function for name validation
async function testNameExtraction() {
	const testMessages = [
		"pls my sister name Alexa",
		"please write my brother name John",
		"napisz moje siostry imię Anna",
		"name Michael",
		"imie Piotr",
		"pls my friend name Sarah",
		"please my cousin name David",
		"napisz moje imię Krzysztof",
		"write my name Emma",
		"pls name Robert"
	];
	
	console.log("=== Test walidacji imion ===");
	for (const msg of testMessages) {
		const extracted = await extractValidName(msg);
		console.log(`"${msg}" -> "${extracted}"`);
	}
}

// Test function for database functionality
async function testDatabase() {
	console.log("=== Test bazy imion ===");
	console.log(`📊 Załadowane imiona: ${state.namesDatabase.size}`);
	
	const testNames = ['Alexa', 'John', 'Anna', 'Michael', 'Piotr', 'Sarah', 'David', 'Krzysztof', 'Emma', 'Robert'];
	
	for (const name of testNames) {
		const exists = isNameInDatabase(name);
		console.log(`"${name}" -> ${exists ? '✅ Istnieje' : '❌ Nowe'}`);
		
		if (!exists) {
			const result = await addNameToDatabase(name);
			console.log(`   Dodanie: ${result.message}`);
		}
	}
	
	console.log(`📊 Po teście: ${state.namesDatabase.size} imion`);
}

// Simple name validation - extract names from various message formats
async function extractValidName(message) {
	if (isNoiseMessage(message)) return null;
	if (!message) return null;
	
	let s = String(message).trim();
	if (!s) return null;
	
	// Remove symbols except letters, spaces, hyphens and apostrophes
	try {
		s = s.replace(/[^\p{L}\s'\-]/gu, '');
	} catch {
		// Fallback without \p{L}
		s = s.replace(/[^A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]/g, '');
	}
	
	// Reduce multiple spaces
	s = s.replace(/\s+/g, ' ').trim();
	if (!s) return null;
	
	// Common patterns for requesting names
	const namePatterns = [
		/pls?\s+(?:my\s+)?(?:sister\s+)?(?:brother\s+)?(?:friend\s+)?(?:cousin\s+)?name\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i,
		/please\s+(?:write\s+)?(?:my\s+)?(?:sister\s+)?(?:brother\s+)?(?:friend\s+)?(?:cousin\s+)?name\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i,
		/napisz\s+(?:moje\s+)?(?:siostry\s+)?(?:brata\s+)?(?:przyjaciela\s+)?(?:kuzyna\s+)?imię\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i,
		/name\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i,
		/imie\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i,
		/imie\s+([A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-\s]+)/i
	];
	
	// Try to extract name from patterns first
	for (const pattern of namePatterns) {
		const match = s.match(pattern);
		if (match && match[1]) {
			const extractedName = match[1].trim();
			if (isValidNameFormat(extractedName)) {
				const formattedName = formatName(extractedName);
				// Check if name is new and add to database
				await checkAndAddNameToDatabase(formattedName);
				return formattedName;
			}
		}
	}
	
	// If no pattern match, try to extract potential names from the message
	const tokens = s.split(' ');
	if (tokens.length < 1 || tokens.length > 5) return null;
	
	// Look for name-like tokens (2-20 chars, starts with letter)
	const nameTokens = tokens.filter(t => {
		if (t.length < 2 || t.length > 20) return false;
		if (!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç]/.test(t)) return false;
		// Skip common words that are not names
		const commonWords = ['pls', 'please', 'my', 'sister', 'brother', 'friend', 'cousin', 'name', 'imie', 'imię', 'napisz', 'write'];
		return !commonWords.includes(t.toLowerCase());
	});
	
	if (nameTokens.length > 0) {
		// Take the first valid name token
		const formattedName = formatName(nameTokens[0]);
		// Check if name is new and add to database
		await checkAndAddNameToDatabase(formattedName);
		return formattedName;
	}
	
	return null;
}

// Helper function to check and add name to database
async function checkAndAddNameToDatabase(name) {
	if (!name || isNameInDatabase(name)) {
		return; // Name already exists
	}
	
	// Add new name to database
	const result = await addNameToDatabase(name);
	if (result.success) {
		showDatabaseMessage(result.message, true);
	} else {
		showDatabaseMessage(result.message, false);
	}
}

function isValidNameFormat(name) {
	if (!name || name.length < 2 || name.length > 20) return false;
	// Must start with a letter
	if (!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç]/.test(name)) return false;
	// Can contain letters, hyphens, apostrophes
	if (!/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žŻżŹźŞşĆćŁłŃńÓóĄąĘęİıĞğÇç'\-]+$/.test(name)) return false;
	return true;
}

function formatName(name) {
	// Title Case: first letter uppercase, rest lowercase
	return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Database management functions
async function loadNamesDatabase() {
	try {
		const aggregate = new Set();
		const sources = [
			'names-list-25k.txt',
			'names-list-extended.txt',
			'names-list.txt'
		];
		let loadedAny = false;
		for (const src of sources) {
			try {
				const response = await fetch(src);
				if (response.ok) {
					const text = await response.text();
					const names = text.split('\n').map(n => String(n).trim()).filter(Boolean);
					for (const n of names) aggregate.add(n);
					loadedAny = true;
				}
			} catch {}
		}
		if (loadedAny) {
			state.namesDatabase = aggregate;
			console.log(`✅ Loaded ${state.namesDatabase.size} names from database (merged sources)`);
			setStatus?.(`Załadowano bazę: ${state.namesDatabase.size} imion`);
			return true;
		}
	} catch (error) {
		console.warn('⚠️ Could not load names database:', error);
	}
	return false;
}

function isNameInDatabase(name) {
	return state.namesDatabase.has(name);
}

async function addNameToDatabase(name) {
	if (!name || isNameInDatabase(name)) {
		return { success: false, message: `Imię "${name}" już istnieje w bazie!` };
	}
	
	try {
		// Add to local database
		state.namesDatabase.add(name);
		
		// Save to file (this would require server-side functionality)
		// For now, we'll just show a success message
		console.log(`✅ Added "${name}" to database`);
		return { success: true, message: `Imię "${name}" zostało dodane do bazy!` };
	} catch (error) {
		console.error('❌ Error adding name to database:', error);
		return { success: false, message: `Błąd podczas dodawania imienia: ${error.message}` };
	}
}

function showDatabaseMessage(message, isSuccess = true) {
	// Create or update status message
	if (!els.statusBox) return;
	
	const originalText = els.statusBox.textContent;
	els.statusBox.textContent = message;
	els.statusBox.style.color = isSuccess ? '#4CAF50' : '#f44336';
	
	// Restore original text after 3 seconds
	setTimeout(() => {
		els.statusBox.textContent = originalText;
		els.statusBox.style.color = '';
	}, 3000);
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

// Countries DB and aliases
const COUNTRY_NAMES = new Set([
	'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan',
	'Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
	'Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Democratic Republic of the Congo','Denmark','Djibouti','Dominica','Dominican Republic',
	'East Timor (Timor-Leste)','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia',
	'Fiji','Finland','France',
	'Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana',
	'Haiti','Honduras','Hungary',
	'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy',
	'Ivory Coast (Côte d\'Ivoire)','Jamaica','Japan','Jordan',
	'Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan',
	'Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg',
	'Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar',
	'Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway',
	'Oman',
	'Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
	'Qatar',
	'Republic of the Congo','Romania','Russia','Rwanda',
	'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','São Tomé and Príncipe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria',
	'Taiwan','Tajikistan','Tanzania','Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
	'Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan',
	'Vanuatu','Vatican City','Venezuela','Vietnam',
	'Yemen','Zambia','Zimbabwe'
]);

const COUNTRY_ALIASES = new Map([
	['USA','United States'],['U.S.A.','United States'],['US','United States'],['U.S.','United States'],['America','United States'],
	['UK','United Kingdom'],['U.K.','United Kingdom'],['Great Britain','United Kingdom'],['Britain','United Kingdom'],
	['UAE','United Arab Emirates'],['Emirates','United Arab Emirates'],
	['DRC','Democratic Republic of the Congo'],['Congo-Kinshasa','Democratic Republic of the Congo'],
	['Republic of Congo','Republic of the Congo'],['Congo-Brazzaville','Republic of the Congo'],
	['South Korea','South Korea'],['Korea','South Korea'],
	['North Korea','North Korea'],
	['Ivory Coast','Ivory Coast (Côte d\'Ivoire)'],['Cote d\'Ivoire','Ivory Coast (Côte d\'Ivoire)'],['Côte d\'Ivoire','Ivory Coast (Côte d\'Ivoire)'],
	['Czechia','Czech Republic'],
	['Timor-Leste','East Timor (Timor-Leste)'],['East Timor','East Timor (Timor-Leste)'],
	['Sao Tome and Principe','São Tomé and Príncipe'],['Sao Tome','São Tomé and Príncipe'],
	['Vatican','Vatican City']
]);

function extractValidCountry(message) {
	if (!message) return null;
	let s = String(message).trim();
	if (!s) return null;
	// remove symbols except letters and spaces
	s = s.replace(/[^A-Za-z\s\-\.]/g, ' ').replace(/\s+/g, ' ').trim();
	const tokens = s.split(' ');
	// try exact alias match on whole string (up to 3 words)
	const tryWhole = tokens.slice(0, 4).join(' ').trim();
	const normWhole = tryWhole.replace(/\.+/g,'').trim();
	const alias = COUNTRY_ALIASES.get(normWhole) || COUNTRY_ALIASES.get(normWhole.toUpperCase());
	if (alias && COUNTRY_NAMES.has(alias)) return alias;
	// try longest n-gram up to 4 tokens
	for (let n = Math.min(4, tokens.length); n >= 1; n--) {
		for (let i = 0; i + n <= tokens.length; i++) {
			const frag = tokens.slice(i, i+n).join(' ').replace(/\.+/g,'').trim();
			const titled = frag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
			if (COUNTRY_NAMES.has(titled)) return titled;
			const a = COUNTRY_ALIASES.get(frag) || COUNTRY_ALIASES.get(frag.toUpperCase());
			if (a && COUNTRY_NAMES.has(a)) return a;
		}
	}
	return null;
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

async function pollChatOnceInternal(pageToken) {
	const base = 'https://www.googleapis.com/youtube/v3/liveChat/messages';
	const params = new URLSearchParams({
		liveChatId: state.liveChatId,
		part: 'snippet,authorDetails',
		key: state.apiKey,
		maxResults: '200',
	});
	if (pageToken) params.set('pageToken', pageToken);
	const url = `${base}?${params.toString()}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`liveChat.messages HTTP ${res.status}`);
	const data = await res.json();
	return data;
}

function showToast(headline, subline, accent = 'var(--accent)', withFanfare = false) {
	const box = els.eventToasts;
	if (!box) return;
	const t = document.createElement('div');
	t.className = 'toast';
	t.innerHTML = `<div class="headline" style="color:${accent}">${headline}</div>${subline ? `<div class="subline">${subline}</div>` : ''}`;
	box.appendChild(t);
	setTimeout(() => {
		if (typeof window.confetti === 'function') {
			window.confetti({ particleCount: 220, spread: 80, origin: { x: 0.5, y: 0.3 } });
		}
		if (withFanfare) {
			try { playFanfare(); } catch {}
		}
	}, 50);
	setTimeout(() => { t.remove(); }, 6500);
}

function playFanfare() {
	const AudioCtx = window.AudioContext || window.webkitAudioContext;
	if (!AudioCtx) return;
	const ctx = new AudioCtx();
	const now = ctx.currentTime;
	function beep(freq, t0, dur, gain = 0.08) {
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'triangle';
		o.frequency.value = freq;
		g.gain.setValueAtTime(0, now + t0);
		g.gain.linearRampToValueAtTime(gain, now + t0 + 0.02);
		g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
		o.connect(g).connect(ctx.destination);
		o.start(now + t0);
		o.stop(now + t0 + dur + 0.05);
	}
	// Simple 3-note fanfare
	beep(523.25, 0.00, 0.25); // C5
	beep(659.25, 0.28, 0.25); // E5
	beep(783.99, 0.56, 0.35, 0.1); // G5
}

function handleLiveChatItem(it) {
	const msg = it?.snippet?.displayMessage || '';
	const authorName = it?.authorDetails?.displayName || 'Ktoś';
	const isSponsor = !!it?.authorDetails?.isChatSponsor;
	const type = it?.snippet?.type || it?.snippet?.messageType || '';
	const superChat = it?.snippet?.superChatDetails;
	if (superChat) {
		const amount = superChat?.amountDisplayString || '';
		const scMsg = superChat?.userComment || '';
		const sub = scMsg ? `“${scMsg}”` : 'Dziękujemy za wsparcie!';
		showToast(`${authorName} – Super Chat ${amount}`, sub, '#ffcc00', true);
		return 'event';
	}
	if (type && /sponsor|member/i.test(type)) {
		state.lastSubscriberName = authorName;
		if (els.lastSub) els.lastSub.textContent = `Ostatni sub/członek: ${authorName}`;
		showToast(`${authorName} dołączył jako członek!`, 'Dziękujemy za wsparcie!', '#19c37d', true);
		return 'event';
	}
	if (isSponsor) {
		state.lastSubscriberName = authorName;
		if (els.lastSub) els.lastSub.textContent = `Ostatni sub/członek: ${authorName}`;
		showToast(`${authorName} just subscribed!`, 'Witamy w ekipie!', '#19c37d', true);
		return 'event';
	}
	return 'message';
}

async function pollChatOnce() {
	if (!state.liveChatId || !state.apiKey) return;
	let data = await pollChatOnceInternal(state.nextPageToken);
	let appended = 0;
	let pagesFetched = 0;
	while (true) {
		const items = Array.isArray(data.items) ? data.items : [];
		for (const it of items) {
			const eventResult = handleLiveChatItem(it);
			if (eventResult === 'event') continue;
			const msg = it?.snippet?.displayMessage || '';
			if (!msg) continue;
			if (isLikelyCommand(msg)) continue;
			const authorId = it?.authorDetails?.channelId || it?.authorDetails?.channelUrl || it?.authorDetails?.displayName || '';
			if (typeof isAuthorCoolingDown === 'function' && isAuthorCoolingDown(authorId)) continue;
			if (state.mode === 'countries') {
				const country = extractValidCountry(msg);
				if (!country) continue;
				appendEntry(country);
				incrementCountryCount(country);
			} else {
				const name = await extractValidName(msg);
				if (!name) continue;
				appendEntry(name);
				incrementNameCount(name);
			}
			if (typeof markAuthorAccepted === 'function') markAuthorAccepted(authorId);
			state.lastUsefulMessageTs = Date.now();
			appended++;
		}
		state.nextPageToken = data.nextPageToken;
		pagesFetched++;
		if (data.nextPageToken && pagesFetched < 10) {
			data = await pollChatOnceInternal(data.nextPageToken);
			continue;
		}
		break;
	}
	const recommended = Number(data.pollingIntervalMillis || 1500);
	const POLL_MIN_MS = 5000;
	const POLL_MAX_MS = 15000;
	let nextMs = Math.max(recommended, POLL_MIN_MS);
	if (appended === 0) {
		nextMs = Math.min(POLL_MAX_MS, Math.floor((state.currentPollMs || nextMs) * 1.5));
	}
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
		// Use a public videos.list request (lighter and widely permitted)
		const url = `https://www.googleapis.com/youtube/v3/videos?part=id&id=dQw4w9WgXcQ&key=${encodeURIComponent(key)}`;
		const res = await fetch(url);
		let body = null;
		try { body = await res.json(); } catch {}
		if (!res.ok) {
			const reason = body?.error?.errors?.[0]?.reason || body?.error?.message || `HTTP ${res.status}`;
			setStatus(`Błąd testu klucza: ${reason}. Sprawdź ograniczenia referrer i włącz YouTube Data API v3.`);
			return;
		}
		const items = Array.isArray(body?.items) ? body.items : [];
		if (items.length > 0) {
			setStatus('Klucz API działa (videos.list OK).');
		} else {
			setStatus('Odpowiedź nieoczekiwana – sprawdź ustawienia klucza.');
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
	if (state.spamMode === 'off') return false;
	const now = Date.now();
	const last = state.authorLastAcceptedAt?.get(authorId) || 0;
	const cooldown = state.spamMode === 'strict' ? 8000 : 5000;
	return (now - last) < cooldown;
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

function clearUiAndState() {
	state.pendingNames = [];
	state.nameCounts = new Map();
	state.countryCounts = new Map();
	state.recentNames = new Map();
	state.authorLastAcceptedAt = new Map();
	els.list.innerHTML = '';
	renderStats();
}

async function handleRefresh() {
	clearUiAndState();
	if (state.connected) {
		disconnectYouTube();
		await new Promise(r => setTimeout(r, 300));
		connectYouTube();
	} else {
		setStatus('Odświeżono. Wpisz dane i Połącz.');
	}
}

async function clearUiButKeepLastN(n) {
	const items = Array.from(els.list.querySelectorAll('li'));
	const keep = items.slice(-n).map(li => (li.firstChild?.textContent || li.textContent || '').trim()).filter(Boolean);
	els.list.innerHTML = '';
	state.pendingNames = [];
	state.recentNames = new Map();
	state.authorLastAcceptedAt = new Map();
	if (state.mode === 'countries') {
		state.countryCounts = new Map();
		for (const k of keep) {
			const c = extractValidCountry(k);
			if (c) incrementCountryCount(c);
		}
	} else {
		state.nameCounts = new Map();
		for (const k of keep) {
			const name = await extractValidName(k);
			if (name) incrementNameCount(name);
		}
	}
	for (const k of keep) appendEntry(k);
}

async function handleSoftRefresh() {
	clearUiButKeepLastN(2);
	setStatus('Odświeżono widok – pozostawiono 2 ostatnie wpisy.');
}

function applyModeTexts() {
	if (!els.modeTitle || !els.modeHint || !els.statsTitle || !els.manualName) return;
	if (state.mode === 'countries') {
		els.modeTitle.textContent = 'Mode: Countries';
		els.modeHint.textContent = 'Type your country in English in the chat, or enter below and press Enter.';
		els.statsTitle.textContent = 'Countries Rank';
		els.manualName.placeholder = 'Type your country and press Enter…';
	} else {
		els.modeTitle.textContent = 'Tryb: Imiona';
		els.modeHint.textContent = 'Napisz imię na czacie albo wpisz poniżej i Enter.';
		els.statsTitle.textContent = 'Top imiona';
		els.manualName.placeholder = 'Wpisz i Enter…';
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
	els.testNamesBtn = qs('testNamesBtn');
	els.testDatabaseBtn = qs('testDatabaseBtn');
	els.speedSelect = qs('speedSelect');
	els.refreshBtn = qs('refreshBtn');
	els.spamSelect = qs('spamSelect');
	els.eventToasts = qs('eventToasts');
	els.modeSelect = qs('modeSelect');
	els.modeTitle = qs('modeTitle');
	els.modeHint = qs('modeHint');
	els.statsTitle = qs('statsTitle');
	els.lastSub = qs('lastSub');
	els.softRefreshBtn = qs('softRefreshBtn');
	els.hamburgerBtn = qs('hamburgerBtn');
	els.fontSelect = qs('fontSelect');

	els.connectBtn.addEventListener('click', connectYouTube);
	els.disconnectBtn.addEventListener('click', disconnectYouTube);
	els.ytInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectYouTube(); });
	els.apiKeyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') connectYouTube(); });
	els.manualName.addEventListener('keydown', async (e) => {
		if (e.key === 'Enter') {
			if (state.mode === 'countries') {
				const c = extractValidCountry(els.manualName.value);
				if (c) { appendEntry(c); incrementCountryCount(c); }
			} else {
				const name = await extractValidName(els.manualName.value);
				if (name) { appendEntry(name); incrementNameCount(name); }
			}
			els.manualName.value = '';
		}
	});
	els.testKeyBtn.addEventListener('click', testApiKey);
	els.testLiveBtn.addEventListener('click', testLive);
	els.testNamesBtn.addEventListener('click', testNameExtraction);
	els.testDatabaseBtn.addEventListener('click', testDatabase);
	els.speedSelect.addEventListener('change', () => { state.speedMode = els.speedSelect.value; });
	els.refreshBtn.addEventListener('click', handleRefresh);
	if (els.softRefreshBtn) els.softRefreshBtn.addEventListener('click', handleSoftRefresh);
	els.spamSelect.addEventListener('change', () => { state.spamMode = els.spamSelect.value; });
	els.modeSelect.addEventListener('change', () => {
		state.mode = els.modeSelect.value;
		applyModeTexts();
		renderStats();
	});
	if (els.hamburgerBtn) {
		els.hamburgerBtn.addEventListener('click', () => {
			document.body.classList.toggle('show-panels');
			applyModeTexts();
		});
	}
	if (els.fontSelect) {
		const applyFontClass = (val) => {
			document.body.classList.remove('font-solway','font-caveat','font-dancing','font-lora','font-montserrat','font-shadows','font-greatvibes');
			switch (val) {
				case 'caveat': document.body.classList.add('font-caveat'); break;
				case 'dancing': document.body.classList.add('font-dancing'); break;
				case 'lora': document.body.classList.add('font-lora'); break;
				case 'montserrat': document.body.classList.add('font-montserrat'); break;
				case 'shadows': document.body.classList.add('font-shadows'); break;
				case 'greatvibes': document.body.classList.add('font-greatvibes'); break;
				default: document.body.classList.add('font-solway'); break;
			}
		};
		applyFontClass(els.fontSelect.value || 'solway');
		els.fontSelect.addEventListener('change', () => applyFontClass(els.fontSelect.value));
	}
	// ensure initial texts align with default mode
	applyModeTexts();
}

window.addEventListener('DOMContentLoaded', async () => {
	setupUi();
	// Load names database on startup
	await loadNamesDatabase();
});