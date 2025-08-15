// Names Scraper - Pobieranie imion z całego świata
// Legalne i darmowe API

const fs = require('fs');
const axios = require('axios');

// Konfiguracja
const CONFIG = {
    totalNames: 10000,        // Ile imion pobrać
    batchSize: 100,           // Ile na raz (żeby nie przeciążyć API)
    delayBetweenBatches: 1000, // Opóźnienie między partiami (ms)
    delayBetweenRequests: 50   // Opóźnienie między pojedynczymi requestami (ms)
};

// Funkcja pobierająca imiona z Random User Generator (bez limitu)
async function fetchNamesFromRandomUser(count) {
    const names = new Set();
    const batches = Math.ceil(count / CONFIG.batchSize);
    
    console.log(`🔄 Pobieram ${count} imion w ${batches} partiach...`);
    
    for (let batch = 0; batch < batches; batch++) {
        const batchCount = Math.min(CONFIG.batchSize, count - batch * CONFIG.batchSize);
        console.log(`📦 Partia ${batch + 1}/${batches}: ${batchCount} imion`);
        
        for (let i = 0; i < batchCount; i++) {
            try {
                const response = await axios.get('https://randomuser.me/api/');
                const user = response.data.results[0];
                
                // Dodaj imię i nazwisko
                names.add(user.name.first);
                names.add(user.name.last);
                
                // Dodaj narodowość
                const nationality = user.nat;
                
                if (i % 10 === 0) {
                    console.log(`   ✅ ${user.name.first} ${user.name.last} (${nationality})`);
                }
                
                // Małe opóźnienie między requestami
                await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenRequests));
                
            } catch (error) {
                console.error(`❌ Błąd w partii ${batch + 1}:`, error.message);
            }
        }
        
        // Opóźnienie między partiami
        if (batch < batches - 1) {
            console.log(`⏳ Czekam ${CONFIG.delayBetweenBatches}ms przed następną partią...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
    }
    
    return Array.from(names);
}

// Funkcja pobierająca dodatkowe imiona z różnych źródeł
async function fetchNamesFromMultipleSources() {
    const additionalNames = new Set();
    
    console.log('🌍 Pobieram dodatkowe imiona z różnych źródeł...');
    
    try {
        // Pobierz popularne imiona z różnych krajów
        const countries = ['US', 'GB', 'DE', 'FR', 'ES', 'IT', 'PL', 'RU', 'JP', 'CN', 'IN', 'BR', 'MX', 'CA', 'AU'];
        
        for (const country of countries) {
            try {
                console.log(`🇺🇸 Pobieram imiona z ${country}...`);
                
                // Pobierz 50 imion z każdego kraju
                for (let i = 0; i < 50; i++) {
                    const response = await axios.get(`https://randomuser.me/api/?nat=${country}`);
                    const user = response.data.results[0];
                    
                    additionalNames.add(user.name.first);
                    additionalNames.add(user.name.last);
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                
                console.log(`✅ Pobrano imiona z ${country}`);
                
            } catch (error) {
                console.error(`❌ Błąd dla kraju ${country}:`, error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ Błąd pobierania dodatkowych imion:', error.message);
    }
    
    return Array.from(additionalNames);
}

// Funkcja wzbogacająca imiona o informacje
async function enrichNamesWithInfo(names) {
    const enrichedNames = [];
    const totalNames = names.length;
    
    console.log(`🔍 Wzbogacam ${totalNames} imion o dodatkowe informacje...`);
    
    for (let i = 0; i < totalNames; i++) {
        const name = names[i];
        
        try {
            // Pobierz płeć
            const genderResponse = await axios.get(`https://api.genderize.io/?name=${encodeURIComponent(name)}`);
            const gender = genderResponse.data.gender || 'unknown';
            const genderProbability = genderResponse.data.probability || 0;
            
            // Pobierz narodowość
            const nationalityResponse = await axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(name)}`);
            const nationality = nationalityResponse.data.country[0]?.country_id || 'unknown';
            const nationalityProbability = nationalityResponse.data.country[0]?.probability || 0;
            
            enrichedNames.push({
                name: name,
                gender: gender,
                genderProbability: genderProbability,
                nationality: nationality,
                nationalityProbability: nationalityProbability,
                source: 'API',
                timestamp: new Date().toISOString()
            });
            
            if (i % 100 === 0) {
                console.log(`   🔍 ${i + 1}/${totalNames}: ${name} - ${gender} (${nationality})`);
            }
            
            // Opóźnienie między requestami
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error(`❌ Błąd dla ${name}:`, error.message);
            // Dodaj imię bez dodatkowych informacji
            enrichedNames.push({
                name: name,
                gender: 'unknown',
                genderProbability: 0,
                nationality: 'unknown',
                nationalityProbability: 0,
                source: 'API',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    return enrichedNames;
}

// Funkcja zapisująca do plików
function saveNamesToFiles(names, enrichedNames) {
    console.log('💾 Zapisuję do plików...');
    
    // 1. Prosta lista imion (TXT)
    const txtContent = names.join('\n');
    fs.writeFileSync('names-list.txt', txtContent);
    console.log('   ✅ names-list.txt - lista imion');
    
    // 2. Pełne dane (JSON)
    fs.writeFileSync('names-database.json', JSON.stringify(enrichedNames, null, 2));
    console.log('   ✅ names-database.json - pełne dane');
    
    // 3. CSV dla Excel
    const csvHeader = 'Name,Gender,GenderProbability,Nationality,NationalityProbability,Source,Timestamp\n';
    const csvContent = enrichedNames.map(n => 
        `${n.name},${n.gender},${n.genderProbability},${n.nationality},${n.nationalityProbability},${n.source},${n.timestamp}`
    ).join('\n');
    fs.writeFileSync('names-database.csv', csvHeader + csvContent);
    console.log('   ✅ names-database.csv - dla Excel');
    
    // 4. Statystyki
    const stats = {
        totalNames: names.length,
        uniqueNames: new Set(names).size,
        genderBreakdown: enrichedNames.reduce((acc, n) => {
            acc[n.gender] = (acc[n.gender] || 0) + 1;
            return acc;
        }, {}),
        nationalityBreakdown: enrichedNames.reduce((acc, n) => {
            acc[n.nationality] = (acc[n.nationality] || 0) + 1;
            return acc;
        }, {}),
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('names-stats.json', JSON.stringify(stats, null, 2));
    console.log('   ✅ names-stats.json - statystyki');
    
    // 5. Podsumowanie
    const summary = `
# Baza Imion Świata - Podsumowanie

## 📊 Statystyki:
- **Wszystkie imiona**: ${names.length}
- **Unikalne imiona**: ${new Set(names).size}
- **Data pobrania**: ${new Date().toLocaleString('pl-PL')}

## 📁 Pliki:
- **names-list.txt** - prosta lista imion
- **names-database.json** - pełne dane (JSON)
- **names-database.csv** - dla Excel/Google Sheets
- **names-stats.json** - statystyki

## 🌍 Źródła:
- Random User Generator API (bez limitu)
- Genderize.io API
- Nationalize.io API

## ⚠️ Uwagi:
- Wszystkie API są publiczne i darmowe
- Dane pobrane automatycznie
- Można używać w projektach komercyjnych
    `;
    
    fs.writeFileSync('README.md', summary);
    console.log('   ✅ README.md - dokumentacja');
}

// Główna funkcja
async function main() {
    console.log('🚀 ROZPOCZYNAM POBIERANIE WSZYSTKICH IMION ŚWIATA!');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    
    try {
        // Krok 1: Pobierz podstawowe imiona
        console.log('\n📥 KROK 1: Pobieranie podstawowych imion...');
        const basicNames = await fetchNamesFromRandomUser(CONFIG.totalNames);
        console.log(`✅ Pobrano ${basicNames.length} podstawowych imion`);
        
        // Krok 2: Pobierz dodatkowe imiona z różnych krajów
        console.log('\n🌍 KROK 2: Pobieranie dodatkowych imion z różnych krajów...');
        const additionalNames = await fetchNamesFromMultipleSources();
        console.log(`✅ Pobrano ${additionalNames.length} dodatkowych imion`);
        
        // Krok 3: Połącz wszystkie imiona
        const allNames = [...new Set([...basicNames, ...additionalNames])];
        console.log(`📊 Łącznie: ${allNames.length} unikalnych imion`);
        
        // Krok 4: Wzbogać o informacje (opcjonalnie - może zająć dużo czasu)
        console.log('\n🔍 KROK 3: Wzbogacanie o informacje (płeć, narodowość)...');
        console.log('⚠️  To może zająć dużo czasu ze względu na limity API...');
        
        const enrichedNames = await enrichNamesWithInfo(allNames);
        console.log(`✅ Wzbogacono ${enrichedNames.length} imion`);
        
        // Krok 5: Zapisz do plików
        console.log('\n💾 KROK 4: Zapisuję do plików...');
        saveNamesToFiles(allNames, enrichedNames);
        
        // Podsumowanie
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('\n🎉 GOTOWE!');
        console.log('=' .repeat(60));
        console.log(`⏱️  Czas wykonania: ${duration} sekund`);
        console.log(`📊 Pobrano: ${allNames.length} imion`);
        console.log(`🌍 Narodowości: ${Object.keys(enrichedNames.reduce((acc, n) => {
            acc[n.nationality] = true;
            return acc;
        }, {})).length}`);
        console.log(`📁 Pliki zapisane w folderze`);
        console.log('\n🚀 Możesz teraz użyć tych imion w swojej aplikacji!');
        
    } catch (error) {
        console.error('❌ BŁĄD KRYTYCZNY:', error.message);
        process.exit(1);
    }
}

// Uruchom skrypt
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, fetchNamesFromRandomUser, enrichNamesWithInfo };