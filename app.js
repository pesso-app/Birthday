// ==================== BASE DE DATOS ====================
        
        // Usamos IndexedDB (más robusto que localStorage)
        const DB_NAME = 'BirthdayDB';
        const DB_VERSION = 1;
        const STORE_NAME = 'people';
        
        let db = null;
        let people = [];
        let editingId = null;
        let selectedContacts = new Set();
        let isDarkMode = false;

        const zodiacSigns = [
            { name: 'Capricornio', symbol: '♑', start: [1, 1], end: [1, 19] },
            { name: 'Acuario', symbol: '♒', start: [1, 20], end: [2, 18] },
            { name: 'Piscis', symbol: '♓', start: [2, 19], end: [3, 20] },
            { name: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19] },
            { name: 'Tauro', symbol: '♉', start: [4, 20], end: [5, 20] },
            { name: 'Géminis', symbol: '♊', start: [5, 21], end: [6, 20] },
            { name: 'Cáncer', symbol: '♋', start: [6, 21], end: [7, 22] },
            { name: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22] },
            { name: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22] },
            { name: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22] },
            { name: 'Escorpio', symbol: '♏', start: [10, 23], end: [11, 21] },
            { name: 'Sagitario', symbol: '♐', start: [11, 22], end: [12, 21] },
            { name: 'Capricornio', symbol: '♑', start: [12, 22], end: [12, 31] }
        ];

        // Inicializar IndexedDB
        async function initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    db = request.result;
                    resolve(db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                };
            });
        }

        // CRUD operations
        async function savePersonDB(person) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put(person);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async function deletePersonDB(id) {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async function getAllPeopleDB() {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        // ==================== INICIALIZACIÓN ====================

        window.onload = async () => {
            await initDB();
            await loadData();
            setupPushNotifications();
            loadTheme();
        };

        async function loadData() {
            people = await getAllPeopleDB();
            renderBirthdays();
        }

        // ==================== REFRESH MANUAL (nuevo botón) ====================

        async function refreshData() {
            const btn = document.getElementById('refreshBtn');
            const svg = btn.querySelector('svg');
            
            // Animación de rotación
            svg.style.transition = 'transform 0.5s';
            svg.style.transform = 'rotate(360deg)';
            
            showToast('Actualizando...');
            await loadData();
            
            // Resetear animación
            setTimeout(() => {
                svg.style.transition = 'none';
                svg.style.transform = 'rotate(0deg)';
            }, 500);
            
            showToast('Actualizado');
        }

        // ==================== MODO OSCURO (corregido para notch) ====================

        function toggleDarkMode() {
            isDarkMode = !isDarkMode;
            document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
            
            // Update meta theme-color para el notch de iOS
            const themeColor = isDarkMode ? '#000000' : '#FFFFFF';
            document.getElementById('themeColor').setAttribute('content', themeColor);
            
            // Cambiar status bar style
            const statusBar = document.getElementById('statusBar');
            statusBar.setAttribute('content', isDarkMode ? 'black-translucent' : 'default');
            
            // Toggle icons
            document.getElementById('moonIcon').classList.toggle('hidden', isDarkMode);
            document.getElementById('sunIcon').classList.toggle('hidden', !isDarkMode);
            
            // Save preference
            localStorage.setItem('birthday_theme', isDarkMode ? 'dark' : 'light');
            
            // Forzar actualización del color del notch en iOS
            updateIOSThemeColor(themeColor);
        }

        function updateIOSThemeColor(color) {
            // Crear meta tag temporal para forzar actualización en iOS
            let meta = document.querySelector('meta[name="theme-color"]');
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = 'theme-color';
                document.head.appendChild(meta);
            }
            meta.content = color;
            
            // También actualizar apple-mobile-web-app-status-bar-style
            let appleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
            if (appleStatus) {
                appleStatus.content = isDarkMode ? 'black-translucent' : 'default';
            }
        }

        function loadTheme() {
            const saved = localStorage.getItem('birthday_theme');
            if (saved === 'dark') {
                toggleDarkMode();
            }
        }

        // ==================== NOTIFICACIONES PUSH ====================

        async function setupPushNotifications() {
            if (!('Notification' in window)) return;
            
            checkTodayBirthdays();
            setInterval(checkTodayBirthdays, 3600000);
            
            if (Notification.permission === 'default') {
                setTimeout(() => {
                    if (confirm('¿Permitir notificaciones para recordatorios de cumpleaños?')) {
                        Notification.requestPermission();
                    }
                }, 3000);
            }
        }

        function checkTodayBirthdays() {
            const today = new Date();
            people.forEach(person => {
                const birthDate = new Date(person.birthDate);
                if (birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate()) {
                    showNotification(person);
                }
            });
        }

        function showNotification(person) {
            const age = calculateAge(new Date(person.birthDate));
            
            if (Notification.permission === 'granted') {
                new Notification('🎉 Birthday', {
                    body: `${person.name} cumple ${age} años hoy. ¡Felicítale!`,
                    icon: '/icon-192x192.png',
                    badge: '/icon-72x72.png',
                    tag: `birthday-${person.id}`,
                    requireInteraction: true
                });
            }
        }

        // ==================== EXPORTAR A PDF ====================

        async function exportToPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(24);
            doc.setTextColor(10, 132, 255);
            doc.text('Birthday', 20, 30);
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Exportado: ${new Date().toLocaleDateString('es-ES')}`, 20, 40);
            
            let y = 60;
            doc.setFontSize(11);
            
            const sorted = [...people].sort((a, b) => {
                const da = new Date(a.birthDate);
                const db = new Date(b.birthDate);
                return da.getMonth() - db.getMonth() || da.getDate() - db.getDate();
            });
            
            sorted.forEach((p, i) => {
                const birthDate = new Date(p.birthDate);
                const age = calculateAge(birthDate);
                const days = getDaysUntil(birthDate);
                
                if (y > 270) {
                    doc.addPage();
                    y = 30;
                }
                
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text(p.name, 20, y);
                
                doc.setFont(undefined, 'normal');
                doc.setTextColor(100, 100, 100);
                const dateStr = birthDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                const daysText = days === 0 ? '¡Hoy!' : days === 1 ? 'Mañana' : `En ${days} días`;
                doc.text(`${dateStr} • Cumple ${age + 1} • ${daysText}`, 20, y + 6);
                
                if (p.notes) {
                    doc.setTextColor(150, 150, 150);
                    doc.text(`Notas: ${p.notes}`, 20, y + 12);
                    y += 8;
                }
                
                y += 20;
            });
            
            doc.save(`Birthday-Export-${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('PDF exportado');
        }

        // ==================== RESTO DE FUNCIONES ====================

        function getZodiac(date) {
            const m = date.getMonth() + 1, d = date.getDate();
            for (let z of zodiacSigns) {
                if (m === z.start[0] && d >= z.start[1]) return z;
                if (m === z.end[0] && d <= z.end[1]) return z;
            }
            return zodiacSigns[0];
        }

        function calculateAge(birthDate) {
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
            return age;
        }

        function getDaysUntil(birthDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const next = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
            if (next < today) next.setFullYear(today.getFullYear() + 1);
            return Math.ceil((next - today) / (1000 * 60 * 60 * 24));
        }

        function renderBirthdays(searchTerm = '') {
            const list = document.getElementById('birthdaysList');
            const empty = document.getElementById('emptyState');
            const todaySection = document.getElementById('todaySection');
            
            list.innerHTML = '';
            
            let filtered = people.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const today = filtered.filter(p => getDaysUntil(new Date(p.birthDate)) === 0);
            const upcoming = filtered.filter(p => getDaysUntil(new Date(p.birthDate)) > 0)
                .sort((a, b) => getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate)));

            if (today.length > 0) {
                todaySection.classList.remove('hidden');
                document.getElementById('todayNames').textContent = today.map(p => p.name).join(' y ');
                setTimeout(createConfetti, 500);
            } else {
                todaySection.classList.add('hidden');
            }

            const toRender = upcoming;
            
            if (toRender.length === 0 && today.length === 0) {
                empty.classList.remove('hidden');
                return;
            }
            
            empty.classList.add('hidden');

            toRender.forEach(p => {
                const birthDate = new Date(p.birthDate);
                const days = getDaysUntil(birthDate);
                const age = calculateAge(birthDate);
                const nextAge = days === 0 ? age : age + 1;
                const zodiac = getZodiac(birthDate);
                
                const item = document.createElement('div');
                item.className = 'list-item-ios theme-transition';
                item.onclick = () => editPerson(p.id);
                
                const emojis = { family: '👨‍👩‍👧‍👦', friends: '👯', work: '💼', other: '✨' };
                
                let badge = '';
                if (days === 1) badge = '<span class="badge-ios">Mañana</span>';
                else if (days <= 7) badge = `<span class="badge-ios badge-ios-blue">${days} días</span>`;
                
                item.innerHTML = `
                    <div class="avatar-ios avatar-ios-small">${p.name.charAt(0)}</div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-title-3 truncate" style="color: var(--text-primary);">${p.name}</h3>
                            ${badge}
                        </div>
                        <div class="text-callout" style="color: var(--text-secondary);">
                            ${emojis[p.category]} ${zodiac.symbol} Cumple ${nextAge} • ${birthDate.getDate()} ${birthDate.toLocaleDateString('es-ES', {month:'short'})}
                        </div>
                        ${p.notes ? `<div class="text-footnote mt-1 truncate">${p.notes}</div>` : ''}
                    </div>
                    <svg class="w-6 h-6 flex-shrink-0" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                    </svg>
                `;
                
                list.appendChild(item);
            });
        }

        function createConfetti() {
            const colors = ['#0A84FF', '#FF375F', '#BF5AF2', '#30D158', '#FF9F0A'];
            for (let i = 0; i < 40; i++) {
                const c = document.createElement('div');
                c.className = 'confetti';
                c.style.left = Math.random() * 100 + 'vw';
                c.style.background = colors[Math.floor(Math.random() * colors.length)];
                c.style.animationDelay = Math.random() * 0.5 + 's';
                document.body.appendChild(c);
                setTimeout(() => c.remove(), 3500);
            }
        }

        function updateAvatarPreview() {
            const name = document.getElementById('personName').value;
            document.getElementById('avatarPreview').textContent = name ? name.charAt(0).toUpperCase() : '?';
        }

        function searchBirthdays() {
            renderBirthdays(document.getElementById('searchInput').value);
        }

        function filterBirthdays(filter) {
            document.querySelectorAll('.segment-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filter);
            });
            
            let filtered = people;
            if (filter !== 'all' && filter !== 'upcoming') {
                filtered = people.filter(p => p.category === filter);
            } else if (filter === 'upcoming') {
                filtered = people.filter(p => getDaysUntil(new Date(p.birthDate)) <= 30);
            }
            
            const list = document.getElementById('birthdaysList');
            list.innerHTML = '';
            
            if (filtered.length === 0) {
                document.getElementById('emptyState').classList.remove('hidden');
                return;
            }
            document.getElementById('emptyState').classList.add('hidden');
            
            filtered.sort((a, b) => getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate)))
                .forEach(p => {
                    const birthDate = new Date(p.birthDate);
                    const days = getDaysUntil(birthDate);
                    const age = calculateAge(birthDate);
                    const nextAge = days === 0 ? age : age + 1;
                    const zodiac = getZodiac(birthDate);
                    
                    const item = document.createElement('div');
                    item.className = 'list-item-ios theme-transition';
                    item.onclick = () => editPerson(p.id);
                    
                    const emojis = { family: '👨‍👩‍👧‍👦', friends: '👯', work: '💼', other: '✨' };
                    let badge = '';
                    if (days === 1) badge = '<span class="badge-ios">Mañana</span>';
                    else if (days <= 7) badge = `<span class="badge-ios badge-ios-blue">${days} días</span>`;
                    
                    item.innerHTML = `
                        <div class="avatar-ios avatar-ios-small">${p.name.charAt(0)}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="text-title-3 truncate" style="color: var(--text-primary);">${p.name}</h3>
                                ${badge}
                            </div>
                            <div class="text-callout" style="color: var(--text-secondary);">
                                ${emojis[p.category]} ${zodiac.symbol} Cumple ${nextAge}
                            </div>
                        </div>
                        <svg class="w-6 h-6 flex-shrink-0" style="color: var(--text-tertiary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
                        </svg>
                    `;
                    list.appendChild(item);
                });
        }

        function showAddModal() {
            editingId = null;
            document.getElementById('modalTitle').textContent = 'Nuevo';
            document.getElementById('personName').value = '';
            document.getElementById('birthDate').value = '';
            document.getElementById('category').value = 'family';
            document.getElementById('notes').value = '';
            document.getElementById('deleteBtn').classList.add('hidden');
            document.getElementById('avatarPreview').textContent = '?';
            document.getElementById('personModal').classList.remove('hidden');
        }

        function editPerson(id) {
            const p = people.find(x => x.id === id);
            if (!p) return;
            editingId = id;
            document.getElementById('modalTitle').textContent = 'Editar';
            document.getElementById('personName').value = p.name;
            document.getElementById('birthDate').value = p.birthDate.split('T')[0];
            document.getElementById('category').value = p.category;
            document.getElementById('notes').value = p.notes || '';
            document.getElementById('deleteBtn').classList.remove('hidden');
            document.getElementById('avatarPreview').textContent = p.name.charAt(0);
            document.getElementById('personModal').classList.remove('hidden');
        }

        function closeModal() {
            document.getElementById('personModal').classList.add('hidden');
        }

        async function savePerson() {
            const name = document.getElementById('personName').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            
            if (!name || !birthDate) {
                showToast('Completa el nombre y fecha');
                return;
            }

            const person = {
                id: editingId || Date.now().toString(),
                name,
                birthDate: new Date(birthDate).toISOString(),
                category: document.getElementById('category').value,
                notes: document.getElementById('notes').value.trim()
            };

            await savePersonDB(person);
            
            if (editingId) {
                const idx = people.findIndex(p => p.id === editingId);
                people[idx] = person;
            } else {
                people.push(person);
            }

            renderBirthdays();
            closeModal();
            showToast(editingId ? 'Actualizado' : 'Añadido');
        }

        async function deleteCurrentPerson() {
            if (!confirm('¿Eliminar este cumpleaños?')) return;
            await deletePersonDB(editingId);
            people = people.filter(p => p.id !== editingId);
            renderBirthdays();
            closeModal();
            showToast('Eliminado');
        }

        async function importContacts() {
            selectedContacts.clear();
            document.getElementById('importModal').classList.remove('hidden');
            
            if ('contacts' in navigator) {
                try {
                    const contacts = await navigator.contacts.select(['name', 'birthday'], { multiple: true });
                    displayContacts(contacts.filter(c => c.birthday));
                } catch (err) {
                    showMockContacts();
                }
            } else {
                showMockContacts();
            }
        }

        function showMockContacts() {
            const mock = [
                { name: ['Ana García'], birthday: new Date('1990-03-15') },
                { name: ['Carlos López'], birthday: new Date('1985-07-22') },
                { name: ['María Rodríguez'], birthday: new Date('1992-11-08') }
            ];
            displayContacts(mock);
        }

        function displayContacts(contacts) {
            const list = document.getElementById('contactsList');
            list.innerHTML = '';
            
            contacts.forEach((contact, idx) => {
                const div = document.createElement('div');
                div.className = 'list-item-ios theme-transition';
                div.onclick = () => toggleContact(idx, div);
                
                const date = new Date(contact.birthday);
                
                div.innerHTML = `
                    <div class="avatar-ios avatar-ios-small">${contact.name[0][0]}</div>
                    <div class="flex-1">
                        <div class="text-title-3" style="color: var(--text-primary);">${contact.name[0]}</div>
                        <div class="text-callout" style="color: var(--text-secondary);">${date.toLocaleDateString('es-ES')}</div>
                    </div>
                    <div class="switch-ios ${selectedContacts.has(idx) ? 'active' : ''}" id="switch-${idx}"></div>
                `;
                
                div.dataset.index = idx;
                div.dataset.name = contact.name[0];
                div.dataset.birthday = date.toISOString();
                list.appendChild(div);
            });
            
            updateImportButton();
        }

        function toggleContact(idx, el) {
            const switchEl = el.querySelector('.switch-ios');
            if (selectedContacts.has(idx)) {
                selectedContacts.delete(idx);
                switchEl.classList.remove('active');
            } else {
                selectedContacts.add(idx);
                switchEl.classList.add('active');
            }
            updateImportButton();
        }

        function updateImportButton() {
            const btn = document.getElementById('importBtn');
            btn.textContent = `Importar (${selectedContacts.size})`;
            btn.disabled = selectedContacts.size === 0;
            btn.classList.toggle('opacity-50', selectedContacts.size === 0);
        }

        async function importSelected() {
            const contacts = document.querySelectorAll('#contactsList > div');
            let count = 0;
            
            for (const c of contacts) {
                if (selectedContacts.has(parseInt(c.dataset.index))) {
                    const person = {
                        id: Date.now().toString() + Math.random(),
                        name: c.dataset.name,
                        birthDate: c.dataset.birthday,
                        category: 'friends',
                        notes: ''
                    };
                    await savePersonDB(person);
                    people.push(person);
                    count++;
                }
            }
            
            renderBirthdays();
            closeImportModal();
            showToast(`${count} contactos importados`);
        }

        function switchTab(tab) {
            document.getElementById('tab-device').classList.toggle('active', tab === 'device');
            document.getElementById('tab-manual').classList.toggle('active', tab === 'manual');
            document.getElementById('import-device').classList.toggle('hidden', tab !== 'device');
            document.getElementById('import-manual').classList.toggle('hidden', tab !== 'manual');
        }

        function closeImportModal() {
            document.getElementById('importModal').classList.add('hidden');
            selectedContacts.clear();
        }

        function showStats() {
            if (people.length === 0) return;
            
            const thisMonth = people.filter(p => new Date(p.birthDate).getMonth() === new Date().getMonth()).length;
            const avgAge = Math.round(people.reduce((a, p) => a + calculateAge(new Date(p.birthDate)), 0) / people.length);
            const next = people.sort((a, b) => getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate)))[0];
            
            document.getElementById('statTotal').textContent = people.length;
            document.getElementById('statThisMonth').textContent = thisMonth;
            document.getElementById('statAvgAge').textContent = avgAge;
            document.getElementById('statNext').textContent = next ? getDaysUntil(new Date(next.birthDate)) + 'd' : '-';
            
            document.getElementById('statsModal').classList.remove('hidden');
        }

        function closeStats() {
            document.getElementById('statsModal').classList.add('hidden');
        }

        function showToast(msg) {
            const t = document.createElement('div');
            t.className = 'toast-ios';
            t.textContent = msg;
            document.getElementById('toastContainer').appendChild(t);
            setTimeout(() => t.remove(), 2500);
        }

        window.onclick = (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                closeModal();
                closeImportModal();
                closeStats();
            }
        };

// ==================== NUEVAS FUNCIONALIDADES BIRTHDAY V3c ====================
// Switches corregidos con clases CSS apropiadas

// ==================== 1. CONFIGURACIÓN Y SETTINGS ====================

const SETTINGS_KEY = 'birthday_settings';

const defaultSettings = {
    reminders: {
        enabled: true,
        items: [
            { days: 7, time: '09:00', enabled: true, label: '1 semana antes' },
            { days: 3, time: '09:00', enabled: true, label: '3 días antes' },
            { days: 1, time: '09:00', enabled: true, label: '1 día antes' },
            { days: 0, time: '09:00', enabled: true, label: 'El mismo día' }
        ]
    },
    theme: {
        color: 'default',
        darkMode: false
    },
    backup: {
        lastAutoBackup: null
    }
};

function getSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultSettings;
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== 2. MODAL DE SETTINGS CON SWITCHES CORREGIDOS ====================

function showSettingsModal() {
    const settings = getSettings();
    const currentTheme = settings.theme.color;
    const isDark = settings.theme.darkMode;

    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center';
    modal.onclick = (e) => { if(e.target === modal) closeSettings(); };

    modal.innerHTML = `
        <div class="settings-sheet w-full sm:max-w-md sm:rounded-3xl theme-transition" onclick="event.stopPropagation()">
            <!-- Handle para cerrar -->
            <div class="flex justify-center pt-3 pb-2" onclick="closeSettings()">
                <div class="w-10 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            <!-- Header -->
            <div class="px-6 pb-4 flex items-center justify-between border-b" style="border-color: var(--separator);">
                <h2 class="text-title-1" style="color: var(--text-primary);">Ajustes</h2>
                <button onclick="closeSettings()" class="p-2 rounded-full active:scale-90 transition" style="background: var(--bg-tertiary);">
                    <svg class="w-5 h-5" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <div class="px-6 py-4 space-y-6 overflow-y-auto max-h-[70vh]">

                <!-- Sección: Apariencia -->
                <div>
                    <h3 class="text-caption mb-3 uppercase tracking-wider">Apariencia</h3>

                    <!-- Modo Oscuro - CORREGIDO CON CLASES ESPECÍFICAS -->
                    <div class="glass-card p-4 mb-4 theme-transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${isDark ? '☀️' : '🌙'}</span>
                                <div>
                                    <div class="text-title-3" style="color: var(--text-primary);">Modo ${isDark ? 'Claro' : 'Oscuro'}</div>
                                    <div class="text-footnote" style="color: var(--text-secondary);">${isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}</div>
                                </div>
                            </div>
                            <button onclick="toggleDarkModeFromSettings()" 
                                    class="dark-mode-toggle ${isDark ? 'active' : ''}">
                                <span class="toggle-knob"></span>
                            </button>
                        </div>
                    </div>

                    <!-- Selector de Tema de Color -->
                    <div class="glass-card p-4 theme-transition">
                        <div class="text-title-3 mb-3" style="color: var(--text-primary);">Color de acento</div>
                        <div class="grid grid-cols-3 gap-2">
                            ${Object.entries(THEMES).map(([key, theme]) => `
                                <button onclick="setTheme('${key}'); updateSettingsTheme('${key}')" 
                                        class="theme-option p-3 rounded-xl border-2 transition-all ${currentTheme === key ? 'border-current active' : 'border-transparent'}"
                                        style="background: ${theme.gradient};">
                                    <span class="text-white text-sm font-semibold">${theme.name}</span>
                                    ${currentTheme === key ? '<span class="ml-1">✓</span>' : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Sección: Notificaciones -->
                <div>
                    <h3 class="text-caption mb-3 uppercase tracking-wider">Notificaciones</h3>
                    <div class="glass-card p-4 theme-transition">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">🔔</span>
                                <div>
                                    <div class="text-title-3" style="color: var(--text-primary);">Recordatorios</div>
                                    <div class="text-footnote" style="color: var(--text-secondary);">Alertas anticipadas</div>
                                </div>
                            </div>
                            <button onclick="toggleRemindersEnabled()" 
                                    class="reminder-master-switch ${settings.reminders.enabled ? 'active' : ''}">
                                <span class="switch-knob"></span>
                            </button>
                        </div>

                        ${settings.reminders.enabled ? `
                            <div class="space-y-3 pt-3 border-t" style="border-color: var(--separator);">
                                ${settings.reminders.items.map((r, i) => `
                                    <div class="flex items-center justify-between">
                                        <span class="text-callout" style="color: var(--text-primary);">${r.label}</span>
                                        <div class="flex items-center gap-2">
                                            <input type="time" value="${r.time}" 
                                                   onchange="updateReminderTime(${i}, this.value)"
                                                   class="time-input text-center"
                                                   style="background: var(--bg-tertiary); border: none; border-radius: 8px; padding: 6px; width: 80px; color: var(--text-primary); font-size: 14px;">
                                            <!-- USAR CLASE switch-ios ORIGINAL -->
                                            <div class="switch-ios switch-small ${r.enabled ? 'active' : ''}" onclick="toggleReminderItem(${i})"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <button onclick="testNotification()" class="w-full mt-4 py-3 rounded-xl font-semibold text-callout active:scale-95 transition"
                                    style="background: rgba(10, 132, 255, 0.1); color: var(--ios-blue);">
                                🔔 Probar notificación
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Sección: Datos (solo Backup) -->
                <div>
                    <h3 class="text-caption mb-3 uppercase tracking-wider">Datos</h3>

                    <!-- Backup -->
                    <div class="glass-card p-4 theme-transition">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="text-2xl">💾</span>
                            <div>
                                <div class="text-title-3" style="color: var(--text-primary);">Backup y Restore</div>
                                <div class="text-footnote" style="color: var(--text-secondary);">${people.length} contactos guardados</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="exportBackup(); showToast('Backup descargado');" class="py-3 rounded-xl font-semibold text-callout active:scale-95 transition flex items-center justify-center gap-2"
                                    style="background: rgba(10, 132, 255, 0.1); color: var(--ios-blue);">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Exportar
                            </button>
                            <input type="file" id="settingsBackupInput" accept=".json" class="hidden" onchange="handleSettingsBackup(this)">
                            <button onclick="document.getElementById('settingsBackupInput').click()" class="py-3 rounded-xl font-semibold text-callout active:scale-95 transition flex items-center justify-center gap-2"
                                    style="background: rgba(48, 209, 88, 0.1); color: #30D158;">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                                </svg>
                                Importar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Info de versión -->
                <div class="text-center pt-4">
                    <p class="text-footnote" style="color: var(--text-tertiary);">Birthday v2.1</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        const sheet = modal.querySelector('.settings-sheet');
        if (sheet) sheet.classList.add('show');
    }, 10);
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        const sheet = modal.querySelector('.settings-sheet');
        if (sheet) sheet.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== 3. FUNCIONES DE SETTINGS ====================

function toggleDarkModeFromSettings() {
    toggleDarkMode();
    const settings = getSettings();
    settings.theme.darkMode = !settings.theme.darkMode;
    saveSettings(settings);
    closeSettings();
    setTimeout(showSettingsModal, 350);
}

function updateSettingsTheme(themeKey) {
    const settings = getSettings();
    settings.theme.color = themeKey;
    saveSettings(settings);
    closeSettings();
    setTimeout(showSettingsModal, 350);
}

function toggleRemindersEnabled() {
    const settings = getSettings();
    settings.reminders.enabled = !settings.reminders.enabled;
    saveSettings(settings);
    closeSettings();
    setTimeout(showSettingsModal, 350);
    if (settings.reminders.enabled) scheduleAllReminders();
}

function toggleReminderItem(index) {
    const settings = getSettings();
    settings.reminders.items[index].enabled = !settings.reminders.items[index].enabled;
    saveSettings(settings);
    scheduleAllReminders();
    closeSettings();
    setTimeout(showSettingsModal, 350);
}

function updateReminderTime(index, time) {
    const settings = getSettings();
    settings.reminders.items[index].time = time;
    saveSettings(settings);
    scheduleAllReminders();
}

function handleSettingsBackup(input) {
    const file = input.files[0];
    if (file) {
        importBackup(file);
        closeSettings();
    }
}

// ==================== 4. TEMAS DE COLOR ====================

const THEMES = {
    default: {
        name: 'Azul',
        primary: '#0A84FF',
        secondary: '#5E5CE6',
        accent: '#BF5AF2',
        gradient: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)'
    },
    rose: {
        name: 'Rosa',
        primary: '#FF375F',
        secondary: '#FF453A',
        accent: '#FF9F0A',
        gradient: 'linear-gradient(135deg, #FF375F 0%, #FF453A 100%)'
    },
    emerald: {
        name: 'Verde',
        primary: '#30D158',
        secondary: '#30DB5B',
        accent: '#64D2FF',
        gradient: 'linear-gradient(135deg, #30D158 0%, #30DB5B 100%)'
    },
    purple: {
        name: 'Púrpura',
        primary: '#BF5AF2',
        secondary: '#AF52DE',
        accent: '#0A84FF',
        gradient: 'linear-gradient(135deg, #BF5AF2 0%, #AF52DE 100%)'
    },
    orange: {
        name: 'Naranja',
        primary: '#FF9F0A',
        secondary: '#FFD60A',
        accent: '#FF375F',
        gradient: 'linear-gradient(135deg, #FF9F0A 0%, #FFD60A 100%)'
    },
    midnight: {
        name: 'Cian',
        primary: '#64D2FF',
        secondary: '#5E5CE6',
        accent: '#BF5AF2',
        gradient: 'linear-gradient(135deg, #64D2FF 0%, #5E5CE6 100%)'
    }
};

function setTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return;

    const root = document.documentElement;
    root.style.setProperty('--ios-blue', theme.primary);
    root.style.setProperty('--ios-indigo', theme.secondary);
    root.style.setProperty('--ios-purple', theme.accent);

    showToast(`Tema ${theme.name} activado`);
}

function loadThemeSettings() {
    const settings = getSettings();
    setTheme(settings.theme.color);
}

// ==================== 5. RECORDATORIOS MEJORADOS ====================

function scheduleAllReminders() {
    const settings = getSettings();
    if (!settings.reminders.enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    people.forEach(person => {
        schedulePersonReminders(person, settings.reminders.items);
    });
}

function schedulePersonReminders(person, reminders) {
    const birthDate = new Date(person.birthDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reminders.forEach(reminder => {
        if (!reminder.enabled) return;

        const reminderDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        reminderDate.setDate(reminderDate.getDate() - reminder.days);

        if (reminderDate < today) {
            reminderDate.setFullYear(today.getFullYear() + 1);
        }

        const [hours, minutes] = reminder.time.split(':');
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0);

        const timeUntil = reminderDate.getTime() - Date.now();

        if (timeUntil > 0 && timeUntil < 86400000 * 365) {
            setTimeout(() => {
                showBirthdayReminder(person, reminder);
            }, timeUntil);
        }
    });
}

function showBirthdayReminder(person, reminder) {
    const age = calculateAge(new Date(person.birthDate)) + (reminder.days === 0 ? 0 : 1);
    const daysText = reminder.days === 0 ? '¡HOY!' : 
                     reminder.days === 1 ? 'mañana' : 
                     `en ${reminder.days} días`;

    if (Notification.permission === 'granted') {
        new Notification(`🎂 ${person.name}`, {
            body: `Cumple ${age} años ${daysText}${reminder.days > 0 ? '. ¡Prepárate!' : '!'}`,
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            tag: `reminder-${person.id}-${reminder.days}`,
            requireInteraction: reminder.days === 0
        });
    }
}

function testNotification() {
    if (Notification.permission === 'granted') {
        new Notification('🎂 Birthday', {
            body: '¡Las notificaciones funcionan correctamente!',
            icon: '/icon-192x192.png'
        });
    } else {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('🎂 Birthday', {
                    body: '¡Notificaciones activadas!',
                    icon: '/icon-192x192.png'
                });
            }
        });
    }
}

// ==================== 6. EXPORTAR A CALENDARIO ====================

function exportToCalendar(personId = null) {
    const peopleToExport = personId ? [people.find(p => p.id === personId)] : people;

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Birthday App//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Cumpleaños',
        'X-WR-TIMEZONE:UTC'
    ];

    peopleToExport.forEach(person => {
        if (!person) return;
        const birthDate = new Date(person.birthDate);
        const year = birthDate.getFullYear();
        const month = String(birthDate.getMonth() + 1).padStart(2, '0');
        const day = String(birthDate.getDate()).padStart(2, '0');

        const uid = `birthday-${person.id}@birthday-app`;

        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${uid}`);
        icsContent.push(`DTSTART;VALUE=DATE:${year}${month}${day}`);
        icsContent.push(`DTEND;VALUE=DATE:${year}${month}${day}`);
        icsContent.push(`RRULE:FREQ=YEARLY`);
        icsContent.push(`SUMMARY:🎂 Cumpleaños de ${person.name}`);
        icsContent.push(`DESCRIPTION:Cumpleaños de ${person.name}\nEdad: ${calculateAge(birthDate)} años\nNotas: ${person.notes || 'Ninguna'}`);
        icsContent.push('TRANSP:TRANSPARENT');
        icsContent.push('BEGIN:VALARM');
        icsContent.push('ACTION:DISPLAY');
        icsContent.push('DESCRIPTION:Recordatorio de cumpleaños');
        icsContent.push('TRIGGER:-P1D');
        icsContent.push('END:VALARM');
        icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = personId ? `cumpleanos-${peopleToExport[0].name}.ics` : 'todos-los-cumpleanos.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(personId ? 'Añadido a calendario' : 'Calendario exportado');
}

// ==================== 7. COMPARTIR POR WHATSAPP ====================

function shareViaWhatsApp(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    const birthDate = new Date(person.birthDate);
    const age = calculateAge(birthDate);
    const days = getDaysUntil(birthDate);
    const zodiac = getZodiac(birthDate);

    let message = `🎂 *Recordatorio de Cumpleaños*\n\n`;
    message += `*${person.name}*\n`;
    message += `📅 ${birthDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    message += `♈ Signo: ${zodiac.name} ${zodiac.symbol}\n`;
    message += `🎂 Próximo: ${age + 1} años\n`;

    if (days === 0) {
        message += `\n🎉 *¡ES HOY!* 🎉`;
    } else if (days === 1) {
        message += `\n⏰ *Mañana* - ¡No olvides felicitarle!`;
    } else {
        message += `\n⏰ Faltan *${days} días*`;
    }

    if (person.notes) {
        message += `\n\n📝 Notas: ${person.notes}`;
    }

    message += `\n\n_Enviado desde Birthday App_`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

function shareAllBirthdays() {
    const sorted = [...people].sort((a, b) => {
        return getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate));
    });

    let message = `📅 *Mis Próximos Cumpleaños*\n\n`;

    sorted.slice(0, 10).forEach((p, i) => {
        const days = getDaysUntil(new Date(p.birthDate));
        const date = new Date(p.birthDate);
        const daysText = days === 0 ? '¡HOY! 🎉' : days === 1 ? 'mañana' : `${days} días`;
        message += `${i + 1}. *${p.name}* - ${date.getDate()}/${date.getMonth() + 1} (${daysText})\n`;
    });

    message += `\n_Enviado desde Birthday App_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ==================== 8. DETECTAR FIN DE SEMANA ====================

function showWeekendBadge(birthDate) {
    const thisYear = new Date().getFullYear();
    const birthdayThisYear = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());
    const day = birthdayThisYear.getDay();

    if (day === 6) return '<span class="badge-ios badge-weekend">🎉 Sáb</span>';
    if (day === 0) return '<span class="badge-ios badge-weekend">🎉 Dom</span>';
    return '';
}

// ==================== 9. BACKUP & RESTORE ====================

function exportBackup() {
    const settings = getSettings();
    const backup = {
        version: '2.1',
        exportDate: new Date().toISOString(),
        people: people,
        settings: settings
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `birthday-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function importBackup(file) {
    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.people || !Array.isArray(backup.people)) {
            throw new Error('Formato inválido');
        }

        if (people.length > 0) {
            if (!confirm(`¿Reemplazar ${people.length} contactos existentes con ${backup.people.length} del backup?`)) {
                return;
            }
            for (const p of people) {
                await deletePersonDB(p.id);
            }
        }

        for (const person of backup.people) {
            await savePersonDB(person);
        }

        if (backup.settings) {
            saveSettings(backup.settings);
            if (backup.settings.theme) {
                if (backup.settings.theme.color) setTheme(backup.settings.theme.color);
                if (backup.settings.theme.darkMode !== undefined) {
                    if (backup.settings.theme.darkMode !== isDarkMode) toggleDarkMode();
                }
            }
        }

        await loadData();
        showToast(`✅ ${backup.people.length} contactos restaurados`);

    } catch (error) {
        showToast('❌ Error al importar');
        console.error(error);
    }
}

// ==================== 10. INTEGRACIÓN CON FUNCIONES EXISTENTES ====================

const originalRenderBirthdays = renderBirthdays;
renderBirthdays = function(searchTerm = '') {
    originalRenderBirthdays(searchTerm);

    document.querySelectorAll('.list-item-ios').forEach((item, index) => {
        const person = people[index];
        if (person) {
            const weekendBadge = showWeekendBadge(new Date(person.birthDate));
            if (weekendBadge) {
                const badgeContainer = item.querySelector('.flex.items-center.gap-2.mb-1');
                if (badgeContainer && !badgeContainer.querySelector('.badge-weekend')) {
                    badgeContainer.insertAdjacentHTML('beforeend', weekendBadge);
                }
            }
        }
    });
};

function enhanceEditModal() {
    const modal = document.getElementById('personModal');
    if (!modal) return;

    if (!document.getElementById('actionButtons')) {
        const actionDiv = document.createElement('div');
        actionDiv.id = 'actionButtons';
        actionDiv.className = 'px-6 pb-4 grid grid-cols-2 gap-3';
        actionDiv.innerHTML = `
            <button onclick="exportToCalendar(editingId)" class="action-btn py-3 rounded-xl bg-blue-500/10 text-blue-500 font-semibold text-callout flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                Calendario
            </button>
            <button onclick="shareViaWhatsApp(editingId)" class="action-btn py-3 rounded-xl bg-green-500/10 text-green-500 font-semibold text-callout flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
            </button>
        `;

        const sheet = modal.querySelector('.sheet-ios');
        const formContainer = modal.querySelector('.px-6.pb-8');
        if (sheet && formContainer) {
            sheet.insertBefore(actionDiv, formContainer);
        }
    }
}

const originalEditPerson = editPerson;
editPerson = function(id) {
    originalEditPerson(id);
    setTimeout(enhanceEditModal, 100);
};

// ==================== 11. CORRECCIÓN DE NOTCH Y HEADER ====================

function fixNotchAndHeader() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone ||
                        document.referrer.includes('android-app://');

    if (isStandalone) {
        const header = document.querySelector('.glass-header');
        if (header) {
            header.style.paddingTop = 'max(24px, env(safe-area-inset-top))';
            header.style.minHeight = 'calc(80px + env(safe-area-inset-top))';
        }

        const main = document.getElementById('mainContent');
        if (main) {
            main.style.paddingTop = 'calc(160px + env(safe-area-inset-top))';
        }

        updateThemeColorForNotch();
    }
}

function updateThemeColorForNotch() {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

    if (isDarkMode) {
        if (metaThemeColor) metaThemeColor.content = '#000000';
        if (metaAppleStatus) metaAppleStatus.content = 'black-translucent';
    } else {
        if (metaThemeColor) metaThemeColor.content = '#FFFFFF';
        if (metaAppleStatus) metaAppleStatus.content = 'default';
    }
}

const originalToggleDarkMode = toggleDarkMode;
toggleDarkMode = function() {
    originalToggleDarkMode();
    setTimeout(updateThemeColorForNotch, 100);
};

// ==================== 12. INICIALIZACIÓN CON ESTADÍSTICAS EN HEADER ====================

const originalOnload = window.onload;
window.onload = async function() {
    if (originalOnload) await originalOnload();

    loadThemeSettings();
    fixNotchAndHeader();

    // Header con 3 botones: Estadísticas, Actualizar, Settings
    const headerButtons = document.querySelector('.glass-header .flex.items-center.justify-between .flex.items-center.gap-2');
    if (headerButtons) {
        headerButtons.innerHTML = `
            <button onclick="showStats()" class="p-2 rounded-full active:scale-90 transition" title="Estadísticas">
                <svg class="w-6 h-6" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
            </button>
            <button onclick="refreshData()" class="p-2 rounded-full active:scale-90 transition" title="Actualizar">
                <svg class="w-6 h-6" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </button>
            <button onclick="showSettingsModal()" class="p-2 rounded-full active:scale-90 transition" title="Ajustes">
                <svg class="w-6 h-6" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
            </button>
        `;
    }

    scheduleAllReminders();
};

window.addEventListener('orientationchange', () => {
    setTimeout(fixNotchAndHeader, 100);
});

window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
    if (e.matches) fixNotchAndHeader();
});