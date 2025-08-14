# Ściana Imion – Live Chat

Prosta strona, która odczytuje wiadomości z czatu Twitcha (anonimowo, tylko do odczytu) i wyświetla je jako listę imion z auto-scrollowaniem do środka ekranu. Ma też tryb testowy – możesz wpisywać imiona ręcznie (Enter).

## Funkcje
- Połączenie z czatem Twitch przez `tmi.js` bez logowania (anonimowo)
- Filtr: ignoruje wiadomości zaczynające się od `!`, `/`, `~`
- Auto-scroll: nowe imię przewija listę tak, aby znalazło się w środku
- Tryb testowy: wpisz imię w polu po lewej i naciśnij Enter
- Gotowe do hostingu na GitHub Pages

## Uruchomienie lokalne
Po prostu otwórz `index.html` w przeglądarce (działa bez builda).

## Jak opublikować na GitHub Pages
1. Utwórz repozytorium i wrzuć pliki (`index.html`, `styles.css`, `script.js`, `README.md`).
2. Na GitHubie: Settings → Pages → Build and deployment → Branch: `main` / folder `/ (root)` → Save.
3. Adres strony będzie w sekcji Pages (np. `https://twoj-user.github.io/nazwa-repo`).

## Użycie
- Wpisz nazwę kanału Twitch (np. `wardega`) i kliknij „Połącz”.
- Wiadomości czatu będą pojawiać się po prawej jako imiona.
- Możesz też testować bez Twitcha, wpisując imię w pole „Tryb testowy”.

## Uwaga
Połączenie jest anonimowe i tylko do odczytu. Jeśli czat ma ograniczenia (subscribers only / ograniczenia regionalne), lista może nie działać poprawnie.