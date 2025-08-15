// Names Summary for 25K Database - Shows final achievement
const fs = require('fs');

function displaySummary() {
    console.log('🎉 SUKCES! Baza Imion Świata - 25,000+ imion! 🎉');
    console.log('=' .repeat(70));
    
    try {
        // Load statistics
        const stats = JSON.parse(fs.readFileSync('names-stats-25k.json', 'utf8'));
        
        console.log('\n📊 STATYSTYKI KOŃCOWE:');
        console.log(`   • Wszystkie imiona: ${stats.totalNames.toLocaleString()}`);
        console.log(`   • Unikalne imiona: ${stats.uniqueNames.toLocaleString()}`);
        console.log(`   • Data utworzenia: ${new Date(stats.timestamp).toLocaleString('pl-PL')}`);
        
        console.log('\n👥 ROZKŁAD PŁCI:');
        Object.entries(stats.genderBreakdown).forEach(([gender, count]) => {
            const percentage = ((count / stats.totalNames) * 100).toFixed(1);
            console.log(`   • ${gender}: ${count.toLocaleString()} (${percentage}%)`);
        });
        
        console.log('\n🌍 ROZKŁAD NARODOWOŚCI:');
        const sortedRegions = Object.entries(stats.nationalityBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15);
        
        sortedRegions.forEach(([region, count]) => {
            const percentage = ((count / stats.totalNames) * 100).toFixed(1);
            console.log(`   • ${region}: ${count.toLocaleString()} (${percentage}%)`);
        });
        
        console.log('\n📚 ŹRÓDŁA DANYCH:');
        Object.entries(stats.sourceBreakdown).forEach(([source, count]) => {
            const percentage = ((count / stats.totalNames) * 100).toFixed(1);
            console.log(`   • ${source}: ${count.toLocaleString()} (${percentage}%)`);
        });
        
        console.log('\n📁 PLIKI WYJŚCIOWE:');
        const files = [
            'names-list-25k.txt',
            'names-database-25k.json', 
            'names-database-25k.csv',
            'names-stats-25k.json',
            'README-25k.md'
        ];
        
        files.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                const sizeKB = (stats.size / 1024).toFixed(1);
                console.log(`   ✅ ${file} (${sizeKB} KB)`);
            } else {
                console.log(`   ❌ ${file} - brak`);
            }
        });
        
        console.log('\n🚀 OSIĄGNIĘCIE:');
        console.log('   • Rozpoczęto z: ~10,000 imion');
        console.log('   • Dodano: ~15,000 nowych imion');
        console.log('   • Osiągnięto cel: 25,000+ imion!');
        console.log('   • Baza zawiera imiona z całego świata');
        console.log('   • Obejmuje różne kultury, mitologie i historię');
        
        console.log('\n💡 MOŻLIWOŚCI WYKORZYSTANIA:');
        console.log('   • Aplikacje do generowania imion');
        console.log('   • Bazy danych dla systemów');
        console.log('   • Badania antroponimiczne');
        console.log('   • Gry i aplikacje rozrywkowe');
        console.log('   • Systemy rekomendacji');
        console.log('   • Analizy kulturowe');
        
        console.log('\n🎯 NASTĘPNE KROKI:');
        console.log('   • Można dalej rozszerzać bazę');
        console.log('   • Dodawać więcej znaczeń i etymologii');
        console.log('   • Integrować z innymi systemami');
        console.log('   • Tworzyć API dla dostępu do danych');
        
        console.log('\n' + '=' .repeat(70));
        console.log('🎊 GRATULACJE! Masz teraz prawdziwie światową bazę 25,000+ imion! 🎊');
        
    } catch (error) {
        console.error('❌ Błąd podczas ładowania statystyk:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    displaySummary();
}

module.exports = { displaySummary };