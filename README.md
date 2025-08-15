# Ściana Imion – YouTube Live Chat

Aplikacja do wyświetlania imion z YouTube Live Chat w czasie rzeczywistym z efektem pisania na maszynie.

## ✨ Nowe funkcje

### 🎯 Ulepszona walidacja imion
- **Inteligentne rozpoznawanie formatów**: Aplikacja teraz rozpoznaje różne sposoby prośby o napisanie imienia:
  - `"pls my sister name Alexa"`
  - `"please write my brother name John"`
  - `"napisz moje siostry imię Anna"`
  - `"name Michael"`
  - `"imie Piotr"`
  - `"pls my friend name Sarah"`

- **Filtrowanie szumu**: Automatycznie ignoruje:
  - Komendy (`!`, `/`, `~`)
  - Wulgaryzmy
  - Linki
  - Mem "DIDDY"
  - Popularne frazy typu "hello", "thanks", "subscribe"

### 🚀 Funkcje testowe
- **Test imion**: Przycisk "Testuj imiona" sprawdza działanie walidacji w konsoli
- **Test API Key**: Weryfikuje poprawność klucza YouTube Data API
- **Test LIVE**: Sprawdza czy wideo jest aktywne

## 🌍 Dostępne API do rozszerzenia bazy imion

### 1. **NameAPI** (https://nameapi.org/)
- **Opis**: Darmowe API z imionami z całego świata
- **Funkcje**: Pochodzenie, znaczenie, popularność
- **Limit**: 1000 requestów/dzień za darmo
- **Endpoint**: `https://api.nameapi.org/names/{name}`

### 2. **Genderize.io** (https://genderize.io/)
- **Opis**: API do określania płci na podstawie imienia
- **Funkcje**: Płeć, prawdopodobieństwo, liczba próbek
- **Limit**: 1000 requestów/dzień za darmo
- **Endpoint**: `https://api.genderize.io/?name={name}`

### 3. **Nationalize.io** (https://nationalize.io/)
- **Opis**: API do określania narodowości na podstawie imienia
- **Funkcje**: Kraj, prawdopodobieństwo
- **Limit**: 1000 requestów/dzień za darmo
- **Endpoint**: `https://api.nationalize.io/?name={name}`

### 4. **Agify.io** (https://agify.io/)
- **Opis**: API do szacowania wieku na podstawie imienia
- **Funkcje**: Wiek, liczba próbek
- **Limit**: 1000 requestów/dzień za darmo
- **Endpoint**: `https://api.agify.io/?name={name}`

### 5. **Behind the Name** (https://www.behindthename.com/api/)
- **Opis**: Największa baza imion z etymologią
- **Funkcje**: Znaczenie, pochodzenie, warianty, historia
- **Limit**: Wymaga rejestracji
- **Endpoint**: `https://www.behindthename.com/api/`

### 6. **Random User Generator** (https://randomuser.me/)
- **Opis**: API generujące losowe profile użytkowników
- **Funkcje**: Imiona, nazwiska, narodowość, płeć
- **Limit**: Bez limitu
- **Endpoint**: `https://randomuser.me/api/?nat={country}`

## 🔧 Jak dodać API do aplikacji

### Przykład integracji z Genderize.io:

```javascript
async function getGenderInfo(name) {
    try {
        const response = await fetch(`https://api.genderize.io/?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return {
            gender: data.gender,
            probability: data.probability,
            count: data.count
        };
    } catch (error) {
        console.error('Błąd API:', error);
        return null;
    }
}

// Użycie w aplikacji
const genderInfo = await getGenderInfo('Alexa');
if (genderInfo) {
    console.log(`${name} - Płeć: ${genderInfo.gender}, Prawdopodobieństwo: ${genderInfo.probability}`);
}
```

### Przykład integracji z Nationalize.io:

```javascript
async function getNationalityInfo(name) {
    try {
        const response = await fetch(`https://api.nationalize.io/?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return data.country.map(country => ({
            country: country.country_id,
            probability: country.probability
        }));
    } catch (error) {
        console.error('Błąd API:', error);
        return null;
    }
}
```

## 📱 Funkcje aplikacji

### Podstawowe funkcje
- **Połączenie z YouTube Live Chat** przez YouTube Data API v3
- **Tryb imion**: Wyświetla imiona z czatu
- **Tryb krajów**: Liczy kraje wymienione na czacie
- **Efekt pisania**: Imiona pojawiają się litera po literze
- **Statystyki**: Licznik imion/krajów w czasie rzeczywistym

### Ustawienia
- **Czcionki**: 7 różnych stylów (Solway, Caveat, Dancing Script, Lora, Montserrat, Shadows Into Light, Great Vibes)
- **Tempo pisania**: Normalne, szybkie, wolne, natychmiastowe
- **Anti-spam**: Normalny, wyłączony, ostry
- **Responsywny design**: Działa na wszystkich urządzeniach

## 🚀 Uruchomienie

1. **Pobierz klucz API**: Zarejestruj się na [Google Cloud Console](https://console.cloud.google.com/)
2. **Włącz YouTube Data API v3**
3. **Otwórz `index.html`** w przeglądarce
4. **Wklej klucz API** i URL wideo YouTube
5. **Kliknij "Połącz"**

## 🔑 Wymagania

- **YouTube Data API v3** klucz
- **Aktywny live chat** na YouTube
- **Nowoczesna przeglądarka** z obsługą ES6+

## 📝 Licencja

MIT License - możesz swobodnie modyfikować i używać w projektach komercyjnych.

## 🤝 Współpraca

Pomysły na ulepszenia? Otwórz issue lub pull request!

---

**Uwaga**: Aplikacja automatycznie filtruje nieodpowiednie treści i szum z czatu, zapewniając czyste wyświetlanie imion.