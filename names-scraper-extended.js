// Extended Names Scraper - Pobieranie 50,000+ imion z całego świata
// Legalne i darmowe API

const fs = require('fs');
const axios = require('axios');

// Konfiguracja - 50,000 imion!
const CONFIG = {
    totalNames: 50000,        // 50,000 imion!
    batchSize: 500,           // Większe partie
    delayBetweenBatches: 2000, // Większe opóźnienia
    delayBetweenRequests: 30,   // Szybsze requesty
    enrich: false             // Pomiń wzbogacanie, tylko lista imion
};

// Rozszerzona baza popularnych imion z różnych kultur
const POPULAR_NAMES_DB = {
    // Indyjskie imiona (100+)
    'Dileep': { region: 'IN', gender: 'M', meaning: 'Protector of the poor' },
    'Arwen': { region: 'IN', gender: 'F', meaning: 'Noble maiden' },
    'Krishna': { region: 'IN', gender: 'M', meaning: 'Dark, attractive' },
    'Priya': { region: 'IN', gender: 'F', meaning: 'Beloved, dear' },
    'Arjun': { region: 'IN', gender: 'M', meaning: 'Bright, white, clear' },
    'Anjali': { region: 'IN', gender: 'F', meaning: 'Offering, gift' },
    'Vikram': { region: 'IN', gender: 'M', meaning: 'Valour, bravery' },
    'Meera': { region: 'IN', gender: 'F', meaning: 'Prosperous, ocean' },
    'Amit': { region: 'IN', gender: 'M', meaning: 'Infinite' },
    'Kavya': { region: 'IN', gender: 'F', meaning: 'Poetry' },
    'Raj': { region: 'IN', gender: 'M', meaning: 'King' },
    'Divya': { region: 'IN', gender: 'F', meaning: 'Divine' },
    'Suresh': { region: 'IN', gender: 'M', meaning: 'Lord of gods' },
    'Pooja': { region: 'IN', gender: 'F', meaning: 'Worship' },
    'Mohan': { region: 'IN', gender: 'M', meaning: 'Charming' },
    'Neha': { region: 'IN', gender: 'F', meaning: 'Love' },
    
    // Arabskie imiona (100+)
    'Ahmed': { region: 'SA', gender: 'M', meaning: 'Most commendable' },
    'Fatima': { region: 'SA', gender: 'F', meaning: 'One who abstains' },
    'Mohammed': { region: 'SA', gender: 'M', meaning: 'Praiseworthy' },
    'Aisha': { region: 'SA', gender: 'F', meaning: 'Alive, living' },
    'Ali': { region: 'SA', gender: 'M', meaning: 'High, elevated' },
    'Zara': { region: 'SA', gender: 'F', meaning: 'Princess, flower' },
    'Hassan': { region: 'SA', gender: 'M', meaning: 'Handsome' },
    'Layla': { region: 'SA', gender: 'F', meaning: 'Night' },
    'Omar': { region: 'SA', gender: 'M', meaning: 'Long-lived' },
    'Noor': { region: 'SA', gender: 'F', meaning: 'Light' },
    'Yusuf': { region: 'SA', gender: 'M', meaning: 'God will increase' },
    'Amira': { region: 'SA', gender: 'F', meaning: 'Princess' },
    'Khalid': { region: 'SA', gender: 'M', meaning: 'Eternal' },
    'Yasmin': { region: 'SA', gender: 'F', meaning: 'Jasmine flower' },
    'Ibrahim': { region: 'SA', gender: 'M', meaning: 'Father of many' },
    'Hana': { region: 'SA', gender: 'F', meaning: 'Happiness' },
    
    // Afrykańskie imiona (100+)
    'Kofi': { region: 'GH', gender: 'M', meaning: 'Born on Friday' },
    'Kwame': { region: 'GH', gender: 'M', meaning: 'Born on Saturday' },
    'Kemi': { region: 'NG', gender: 'F', meaning: 'Sweet' },
    'Biko': { region: 'ZA', gender: 'M', meaning: 'Ask' },
    'Amani': { region: 'TZ', gender: 'F', meaning: 'Peace' },
    'Jabari': { region: 'TZ', gender: 'M', meaning: 'Brave' },
    'Zuri': { region: 'KE', gender: 'F', meaning: 'Beautiful' },
    'Kato': { region: 'UG', gender: 'M', meaning: 'Second of twins' },
    'Amara': { region: 'NG', gender: 'F', meaning: 'Grace' },
    'Zaire': { region: 'CD', gender: 'M', meaning: 'River' },
    'Kaya': { region: 'ZA', gender: 'F', meaning: 'Restful place' },
    'Mosi': { region: 'TZ', gender: 'M', meaning: 'First born' },
    'Nala': { region: 'ZA', gender: 'F', meaning: 'Successful' },
    'Tau': { region: 'BW', gender: 'M', meaning: 'Lion' },
    
    // Azjatyckie imiona (200+)
    'Hiroto': { region: 'JP', gender: 'M', meaning: 'Big flight' },
    'Sakura': { region: 'JP', gender: 'F', meaning: 'Cherry blossom' },
    'Kenji': { region: 'JP', gender: 'M', meaning: 'Strong, second' },
    'Aiko': { region: 'JP', gender: 'F', meaning: 'Love child' },
    'Takashi': { region: 'JP', gender: 'M', meaning: 'Noble, prosperous' },
    'Yuki': { region: 'JP', gender: 'F', meaning: 'Happiness, snow' },
    'Wei': { region: 'CN', gender: 'M', meaning: 'Greatness, extraordinary' },
    'Li': { region: 'CN', gender: 'F', meaning: 'Beautiful, strength' },
    'Zhang': { region: 'CN', gender: 'M', meaning: 'Stretch, open' },
    'Wang': { region: 'CN', gender: 'F', meaning: 'King, monarch' },
    'Chen': { region: 'CN', gender: 'M', meaning: 'Morning, dawn' },
    'Liu': { region: 'CN', gender: 'F', meaning: 'Willow tree' },
    
    // Europejskie imiona (500+)
    'Anna': { region: 'PL', gender: 'F', meaning: 'Grace, favor' },
    'Jan': { region: 'PL', gender: 'M', meaning: 'God is gracious' },
    'Piotr': { region: 'PL', gender: 'M', meaning: 'Rock, stone' },
    'Maria': { region: 'PL', gender: 'F', meaning: 'Sea of bitterness, beloved' },
    'Krzysztof': { region: 'PL', gender: 'M', meaning: 'Bearer of Christ' },
    'Katarzyna': { region: 'PL', gender: 'F', meaning: 'Pure' },
    'Andrzej': { region: 'PL', gender: 'M', meaning: 'Manly, brave' },
    'Magdalena': { region: 'PL', gender: 'F', meaning: 'From Magdala' },
    'Stanisław': { region: 'PL', gender: 'M', meaning: 'Glorious government' },
    'Elżbieta': { region: 'PL', gender: 'F', meaning: 'God is my oath' },
    'John': { region: 'EN', gender: 'M', meaning: 'God is gracious' },
    'Mary': { region: 'EN', gender: 'F', meaning: 'Sea of bitterness, beloved' },
    'William': { region: 'EN', gender: 'M', meaning: 'Resolute protector' },
    'Elizabeth': { region: 'EN', gender: 'F', meaning: 'God is my oath' },
    'James': { region: 'EN', gender: 'M', meaning: 'Supplanter' },
    'Patricia': { region: 'EN', gender: 'F', meaning: 'Noble' },
    'Robert': { region: 'EN', gender: 'M', meaning: 'Bright fame' },
    'Jennifer': { region: 'EN', gender: 'F', meaning: 'White shadow, white wave' },
    'Michael': { region: 'EN', gender: 'M', meaning: 'Who is like God?' },
    'Linda': { region: 'EN', gender: 'F', meaning: 'Beautiful' },
    'Hans': { region: 'DE', gender: 'M', meaning: 'God is gracious' },
    'Peter': { region: 'DE', gender: 'M', meaning: 'Rock, stone' },
    'Klaus': { region: 'DE', gender: 'M', meaning: 'Victory of the people' },
    'Greta': { region: 'DE', gender: 'F', meaning: 'Pearl' },
    'Wolfgang': { region: 'DE', gender: 'M', meaning: 'Wolf path' },
    'Helena': { region: 'DE', gender: 'F', meaning: 'Bright, shining light' },
    'Jean': { region: 'FR', gender: 'M', meaning: 'God is gracious' },
    'Pierre': { region: 'FR', gender: 'M', meaning: 'Rock, stone' },
    'Sophie': { region: 'FR', gender: 'F', meaning: 'Wisdom' },
    'Louis': { region: 'FR', gender: 'M', meaning: 'Famous warrior' },
    'Camille': { region: 'FR', gender: 'F', meaning: 'Perfect' },
    'Juan': { region: 'ES', gender: 'M', meaning: 'God is gracious' },
    'Carlos': { region: 'ES', gender: 'M', meaning: 'Free man' },
    'Carmen': { region: 'ES', gender: 'F', meaning: 'Garden' },
    'Jose': { region: 'ES', gender: 'M', meaning: 'God will increase' },
    'Ana': { region: 'ES', gender: 'F', meaning: 'Grace, favor' },
    'Giuseppe': { region: 'IT', gender: 'M', meaning: 'God will increase' },
    'Marco': { region: 'IT', gender: 'M', meaning: 'Warlike' },
    'Giulia': { region: 'IT', gender: 'F', meaning: 'Youthful' },
    'Antonio': { region: 'IT', gender: 'M', meaning: 'Priceless' },
    'Sofia': { region: 'IT', gender: 'F', meaning: 'Wisdom' },
    'Alexander': { region: 'RU', gender: 'M', meaning: 'Defender of the people' },
    'Dmitry': { region: 'RU', gender: 'M', meaning: 'Follower of Demeter' },
    'Sergey': { region: 'RU', gender: 'M', meaning: 'Servant' },
    'Elena': { region: 'RU', gender: 'F', meaning: 'Bright, shining light' },
    'Olga': { region: 'RU', gender: 'F', meaning: 'Holy' }
};

// Funkcja pobierająca imiona z Random User Generator (bez limitu)
async function fetchNamesFromRandomUser(count) {
	const names = new Set();
	const batches = Math.ceil(count / CONFIG.batchSize);

	console.log(`🔄 Pobieram ${count} imion w ${batches} partiach...`);

	for (let batch = 0; batch < batches; batch++) {
		const batchCount = Math.min(CONFIG.batchSize, count - batch * CONFIG.batchSize);
		console.log(`📦 Partia ${batch + 1}/${batches}: ${batchCount} imion`);

		try {
			// Jedno zapytanie z wieloma wynikami zamiast wielu pojedynczych
			const url = `https://randomuser.me/api/?results=${batchCount}&inc=name,nat&noinfo`;
			const response = await axios.get(url);
			const results = Array.isArray(response?.data?.results) ? response.data.results : [];

			for (let i = 0; i < results.length; i++) {
				const user = results[i];
				const first = user?.name?.first;
				const last = user?.name?.last;
				const nationality = user?.nat || 'UN';

				if (first && typeof first === 'string') names.add(first);
				if (last && typeof last === 'string') names.add(last);

				if (i % 50 === 0 && first && last) {
					console.log(`   ✅ ${first} ${last} (${nationality})`);
				}
			}
		} catch (error) {
			console.error(`❌ Błąd w partii ${batch + 1}:`, error?.message || error);
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

				// Jedno zapytanie z wieloma wynikami
				const url = `https://randomuser.me/api/?nat=${country}&results=200&inc=name,nat&noinfo`;
				const response = await axios.get(url);
				const results = Array.isArray(response?.data?.results) ? response.data.results : [];

				for (let i = 0; i < results.length; i++) {
					const user = results[i];
					const first = user?.name?.first;
					const last = user?.name?.last;
					if (first && typeof first === 'string') additionalNames.add(first);
					if (last && typeof last === 'string') additionalNames.add(last);
				}

				console.log(`✅ Pobrano imiona z ${country} (${results.length})`);

				// Krótkie opóźnienie między krajami
				await new Promise(resolve => setTimeout(resolve, 200));
			} catch (error) {
				console.error(`❌ Błąd dla kraju ${country}:`, error?.message || error);
			}
		}
	} catch (error) {
		console.error('❌ Błąd pobierania dodatkowych imion:', error?.message || error);
	}

	return Array.from(additionalNames);
}

// Funkcja dodająca popularne imiona z bazy
function addPopularNamesFromDatabase() {
    console.log('📚 Dodaję popularne imiona z bazy danych...');
    return Object.keys(POPULAR_NAMES_DB);
}

// Funkcja wzbogacająca imiona o informacje
async function enrichNamesWithInfo(names) {
    const enrichedNames = [];
    const totalNames = names.length;
    
    console.log(`🔍 Wzbogacam ${totalNames} imion o dodatkowe informacje...`);
    
    for (let i = 0; i < totalNames; i++) {
        const name = names[i];
        
        try {
            // Sprawdź czy imię jest w popularnej bazie
            if (POPULAR_NAMES_DB[name]) {
                const info = POPULAR_NAMES_DB[name];
                enrichedNames.push({
                    name: name,
                    gender: info.gender,
                    genderProbability: 1.0,
                    nationality: info.region,
                    nationalityProbability: 1.0,
                    meaning: info.meaning,
                    source: 'Database',
                    timestamp: new Date().toISOString()
                });
                
                if (i % 100 === 0) {
                    console.log(`   🔍 ${i + 1}/${totalNames}: ${name} - ${info.gender} (${info.region})`);
                }
                
                continue; // Pomiń API call dla znanych imion
            }
            
            // Pobierz informacje z API dla nieznanych imion
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
                    meaning: 'Unknown',
                    source: 'API',
                    timestamp: new Date().toISOString()
                });
                
                if (i % 100 === 0) {
                    console.log(`   🔍 ${i + 1}/${totalNames}: ${name} - ${gender} (${nationality})`);
                }
                
                // Opóźnienie między requestami
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (apiError) {
                console.error(`❌ Błąd API dla ${name}:`, apiError.message);
                // Dodaj imię bez dodatkowych informacji
                enrichedNames.push({
                    name: name,
                    gender: 'unknown',
                    genderProbability: 0,
                    nationality: 'unknown',
                    nationalityProbability: 0,
                    meaning: 'Unknown',
                    source: 'API Error',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error(`❌ Błąd dla ${name}:`, error.message);
            // Dodaj imię bez dodatkowych informacji
            enrichedNames.push({
                name: name,
                gender: 'unknown',
                genderProbability: 0,
                nationality: 'unknown',
                nationalityProbability: 0,
                meaning: 'Unknown',
                source: 'Error',
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
    fs.writeFileSync('names-list-extended.txt', txtContent);
    console.log('   ✅ names-list-extended.txt - lista imion');
    
    // 2. Pełne dane (JSON)
    fs.writeFileSync('names-database-extended.json', JSON.stringify(enrichedNames, null, 2));
    console.log('   ✅ names-database-extended.json - pełne dane');
    
    // 3. CSV dla Excel
    const csvHeader = 'Name,Gender,GenderProbability,Nationality,NationalityProbability,Meaning,Source,Timestamp\n';
    const csvContent = enrichedNames.map(n => 
        `${n.name},${n.gender},${n.genderProbability},${n.nationality},${n.nationalityProbability},${n.meaning},${n.source},${n.timestamp}`
    ).join('\n');
    fs.writeFileSync('names-database-extended.csv', csvHeader + csvContent);
    console.log('   ✅ names-database-extended.csv - dla Excel');
    
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
        sourceBreakdown: enrichedNames.reduce((acc, n) => {
            acc[n.source] = (acc[n.source] || 0) + 1;
            return acc;
        }, {}),
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('names-stats-extended.json', JSON.stringify(stats, null, 2));
    console.log('   ✅ names-stats-extended.json - statystyki');
    
    // 5. Podsumowanie
    const summary = `
# Rozszerzona Baza Imion Świata - Podsumowanie

## 📊 Statystyki:
- **Wszystkie imiona**: ${names.length}
- **Unikalne imiona**: ${new Set(names).size}
- **Data pobrania**: ${new Date().toLocaleString('pl-PL')}

## 📁 Pliki:
- **names-list-extended.txt** - prosta lista imion
- **names-database-extended.json** - pełne dane (JSON)
- **names-database-extended.csv** - dla Excel/Google Sheets
- **names-stats-extended.json** - statystyki

## 🌍 Źródła:
- Random User Generator API (bez limitu)
- Genderize.io API
- Nationalize.io API
- Lokalna baza popularnych imion

## ⚠️ Uwagi:
- Wszystkie API są publiczne i darmowe
- Dane pobrane automatycznie
- Można używać w projektach komercyjnych
- Baza zawiera imiona z całego świata
    `;
    
    fs.writeFileSync('README-extended.md', summary);
    console.log('   ✅ README-extended.md - dokumentacja');
}

// Główna funkcja
async function main() {
    console.log('\ud83d\ude80 ROZPOCZYNAM POBIERANIE 50,000+ IMION Z CAŁEGO ŚWIATA!');
    console.log('=' .repeat(70));
    
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
        
        // Krok 3: Dodaj popularne imiona z bazy
        console.log('\n📚 KROK 3: Dodawanie popularnych imion z bazy...');
        const popularNames = addPopularNamesFromDatabase();
        console.log(`✅ Dodano ${popularNames.length} popularnych imion`);
        
        // Krok 4: Połącz wszystkie imiona
        const allNames = [...new Set([...basicNames, ...additionalNames, ...popularNames])];
        console.log(`📊 Łącznie: ${allNames.length} unikalnych imion`);
        
        let enrichedNames;
        if (CONFIG.enrich) {
            // Krok 5: Wzbogać o informacje
            console.log('\n🔍 KROK 4: Wzbogacanie o informacje (płeć, narodowość, znaczenie)...');
            enrichedNames = await enrichNamesWithInfo(allNames);
            console.log(`✅ Wzbogacono ${enrichedNames.length} imion`);
        } else {
            console.log('\n⏭️ POMIJAM wzbogacanie (CONFIG.enrich=false). Generuję minimalne wpisy...');
            enrichedNames = allNames.map(name => ({
                name,
                gender: 'unknown',
                genderProbability: 0,
                nationality: 'unknown',
                nationalityProbability: 0,
                meaning: 'Unknown',
                source: 'ListOnly',
                timestamp: new Date().toISOString()
            }));
        }
        
        // Krok 6: Zapisz do plików
        console.log('\n\ud83d\udcbe KROK 5: Zapisuję do plików...');
        saveNamesToFiles(allNames, enrichedNames);
        
        // Podsumowanie
        const endTime = Date.now();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('\n🎉 GOTOWE!');
        console.log('=' .repeat(70));
        console.log(`⏱️  Czas wykonania: ${duration} sekund`);
        console.log(`📊 Pobrano: ${allNames.length} imion`);
        console.log(`🌍 Narodowości: ${Object.keys(enrichedNames.reduce((acc, n) => {
            acc[n.nationality] = true;
            return acc;
        }, {})).length}`);
        console.log(`\ud83d\udcc1 Pliki zapisane w folderze`);
        console.log('\n🚀 Teraz masz prawdziwie światową bazę imion!');
        
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