# Ściana Imion – YouTube Live Chat

Prosta strona, która odczytuje wiadomości z czatu YouTube na żywo (YouTube Data API v3) i wyświetla je jako listę imion z auto-scrollowaniem do środka. Ma też tryb testowy – możesz wpisywać imiona ręcznie (Enter).

## Funkcje
- Połączenie z czatem YouTube przez `YouTube Data API v3` (wymaga klucza API)
- Podajesz URL lub ID filmu z aktywnym live chatem
- Filtr: ignoruje wiadomości zaczynające się od `!`, `/`, `~`
- Auto-scroll: nowe imię przewija listę tak, aby znalazło się w środku
- Tryb testowy: wpisz imię w polu po lewej i naciśnij Enter
- Gotowe do hostingu na GitHub Pages

## Wymagania
- Klucz API do YouTube Data API v3 (Google Cloud → włącz API, utwórz klucz)
- Zalecane: ogranicz klucz do domeny `https://<twoj-user>.github.io` (Application restrictions → HTTP referrers)

## Uruchomienie lokalne
Otwórz `index.html` w przeglądarce. Wpisz:
- URL/ID filmu live na YouTube
- Klucz API
Kliknij „Połącz”.

## GitHub Pages
1. Utwórz repo i dodaj pliki (`index.html`, `styles.css`, `script.js`, `README.md`, `.nojekyll`).
2. Settings → Pages → Build and deployment → Branch: `main` / folder `/ (root)` → Save.
3. Odwiedź adres z sekcji Pages (np. `https://twoj-user.github.io/nazwa-repo`).

## Uwaga
- Live chat działa tylko gdy transmisja jest aktywna (API zwraca `liveChatId`).
- Limit zapytań zależy od Twojej puli quota API. Aplikacja używa zalecanego `pollingIntervalMillis` z API.
- Bez serwera pośredniczącego używasz własnego klucza API bezpośrednio w przeglądarce.