# 🚀 INSTRUKCJE URUCHOMIENIA SKRYPTU DO POBIERANIA IMION

## 📋 Wymagania:
- **Node.js** (wersja 14 lub nowsza)
- **npm** (Node Package Manager)

## 🔧 Instalacja i uruchomienie:

### **Krok 1: Sprawdź czy masz Node.js**
```bash
node --version
npm --version
```

Jeśli nie masz, pobierz z: https://nodejs.org/

### **Krok 2: Zainstaluj zależności**
```bash
npm install
```

### **Krok 3: Uruchom skrypt**
```bash
npm start
```

lub

```bash
node names-scraper.js
```

## 📊 Co robi skrypt:

### **1. Pobiera imiona z Random User Generator API**
- **10,000+ imion** w kilku partiach
- **Bez limitu** - API jest darmowe
- **Różne narodowości** - US, GB, DE, FR, ES, IT, PL, RU, JP, CN, IN, BR, MX, CA, AU

### **2. Wzbogaca o informacje**
- **Płeć** - z Genderize.io API
- **Narodowość** - z Nationalize.io API
- **Prawdopodobieństwo** - jak pewne są dane

### **3. Zapisuje do plików**
- **names-list.txt** - prosta lista imion
- **names-database.json** - pełne dane (JSON)
- **names-database.csv** - dla Excel/Google Sheets
- **names-stats.json** - statystyki
- **README.md** - dokumentacja

## ⚠️ Ważne informacje:

### **Limity API:**
- **Random User Generator**: Bez limitu ✅
- **Genderize.io**: 1000 requestów/dzień za darmo ⚠️
- **Nationalize.io**: 1000 requestów/dzień za darmo ⚠️

### **Czas wykonania:**
- **10,000 imion**: ~15-30 minut
- **Zależy od** szybkości internetu i API

### **Legalność:**
- ✅ **Wszystkie API są publiczne i darmowe**
- ✅ **Można używać w projektach komercyjnych**
- ✅ **Dane są automatycznie generowane**

## 🎯 Przykład wyjścia:

```
🚀 ROZPOCZYNAM POBIERANIE WSZYSTKICH IMION ŚWIATA!
============================================================

📥 KROK 1: Pobieranie podstawowych imion...
🔄 Pobieram 10000 imion w 100 partiach...
📦 Partia 1/100: 100 imion
   ✅ John Smith (US)
   ✅ Anna Kowalski (PL)
   ✅ Pierre Dubois (FR)

🌍 KROK 2: Pobieranie dodatkowych imion z różnych krajów...
🇺🇸 Pobieram imiona z US...
✅ Pobrano imiona z US

🔍 KROK 3: Wzbogacanie o informacje (płeć, narodowość)...
🔍 1/10000: John - male (US)

💾 KROK 4: Zapisuję do plików...
   ✅ names-list.txt - lista imion
   ✅ names-database.json - pełne dane
   ✅ names-database.csv - dla Excel
   ✅ names-stats.json - statystyki
   ✅ README.md - dokumentacja

🎉 GOTOWE!
============================================================
⏱️  Czas wykonania: 1200 sekund
📊 Pobrano: 15000 imion
🌍 Narodowości: 15
📁 Pliki zapisane w folderze

🚀 Możesz teraz użyć tych imion w swojej aplikacji!
```

## 🔄 Po uruchomieniu:

1. **Poczekaj** aż skrypt się skończy
2. **Sprawdź pliki** w folderze
3. **Użyj imion** w swojej aplikacji
4. **Wypchnij na GitHub** 🎉

## 🆘 Rozwiązywanie problemów:

### **Błąd: "axios not found"**
```bash
npm install axios
```

### **Błąd: "Cannot find module"**
```bash
npm install
```

### **Błąd: "API limit exceeded"**
- Poczekaj do następnego dnia
- Lub zmniejsz `totalNames` w `CONFIG`

### **Błąd: "Network timeout"**
- Sprawdź połączenie internetowe
- Zwiększ opóźnienia w `CONFIG`

## 🎯 Gotowe! 

Po uruchomieniu będziesz mieć bazę **tysięcy imion z całego świata** w kilku formatach! 🚀