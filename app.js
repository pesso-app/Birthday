// ==================== BASE DE DATOS ====================
const DB_NAME = 'BirthdayDB';
const DB_VERSION = 2; // Incrementado para nueva estructura
const STORE_NAME = 'people';
const SETTINGS_STORE = 'settings';

let db = null;
let people = [];
let editingId = null;
let selectedContacts = new Set();
let isDarkMode = false;

// ==================== CONFIGURACIÓN MEJORADA ====================
const APP_CONFIG = {
    themeKey: 'birthday_theme_v2',
    notifKey: 'birthday_notif_asked',
    settingsKey: 'birthday_settings_v2',
    lastNotifCheck: 'birthday_last_check'
};

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
    notifications: {
        permissionAsked: false,
        enabled: true,
        lastPrompt: null
    },
    smartReminders: {
        giftReminderDays: 3, // Días antes para recordar comprar regalo
        enabled: true
    }
};

// ==================== INDEXEDDB MEJORADO ====================
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
            
            if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
                db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
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

// Settings en IndexedDB para persistencia real
async function saveSettingDB(key, value) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.put({ key, value, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getSettingDB(key, defaultValue = null) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : defaultValue);
        request.onerror = () => reject(request.error);
    });
}

// ==================== ZODIAC & HELPERS ====================
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

function getNextBirthdayDate(birthDate) {
    const today = new Date();
    const currentYear = today.getFullYear();
    let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
    
    if (nextBirthday < today) {
        nextBirthday.setFullYear(currentYear + 1);
    }
    
    return nextBirthday;
}

// ==================== INICIALIZACIÓN CORREGIDA ====================
window.onload = async () => {
    try {
        await initDB();
        
        // Cargar tema PRIMERO antes de cualquier render
        await loadThemeFixed();
        
        // Cargar datos
        await loadData();
        
        // Configurar notificaciones de forma inteligente
        await setupPushNotificationsFixed();
        
        // Inicializar recordatorios inteligentes
        await initSmartReminders();
        
        // Configurar header mejorado
        setupEnhancedHeader();
        
        // Verificar cumpleaños de hoy
        checkTodayBirthdays();
        
    } catch (error) {
        console.error('Error inicializando app:', error);
    }
};

// ==================== TEMA CORREGIDO (PERSISTENCIA REAL) ====================
async function loadThemeFixed() {
    try {
        // Intentar cargar de IndexedDB primero (más confiable)
        let savedSettings = await getSettingDB('app_settings');
        
        // Fallback a localStorage para compatibilidad
        if (!savedSettings) {
            const localSettings = localStorage.getItem(APP_CONFIG.settingsKey);
            if (localSettings) {
                savedSettings = JSON.parse(localSettings);
            }
        }
        
        const settings = savedSettings || defaultSettings;
        
        // Aplicar modo oscuro
        if (settings.theme?.darkMode) {
            isDarkMode = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeMetaTags('dark');
        } else {
            isDarkMode = false;
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeMetaTags('light');
        }
        
        // Aplicar color de tema
        if (settings.theme?.color && settings.theme.color !== 'default') {
            setTheme(settings.theme.color);
        }
        
        // Actualizar iconos
        updateThemeIcons();
        
    } catch (error) {
        console.error('Error cargando tema:', error);
    }
}

function updateThemeMetaTags(mode) {
    const themeColor = mode === 'dark' ? '#000000' : '#FFFFFF';
    const statusBarStyle = mode === 'dark' ? 'black-translucent' : 'default';
    
    // Actualizar meta tags
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = themeColor;
    
    let metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaApple) metaApple.content = statusBarStyle;
    
    // Guardar en localStorage también para redundancia
    localStorage.setItem(APP_CONFIG.themeKey, mode);
}

function updateThemeIcons() {
    const moonIcon = document.getElementById('moonIcon');
    const sunIcon = document.getElementById('sunIcon');
    
    if (moonIcon && sunIcon) {
        if (isDarkMode) {
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    }
}

async function toggleDarkModeFixed() {
    isDarkMode = !isDarkMode;
    const mode = isDarkMode ? 'dark' : 'light';
    
    // Aplicar inmediatamente
    document.documentElement.setAttribute('data-theme', mode);
    updateThemeMetaTags(mode);
    updateThemeIcons();
    
    // Guardar en ambos lados para redundancia
    const currentSettings = await getSettingsFixed();
    currentSettings.theme.darkMode = isDarkMode;
    
    await saveSettingDB('app_settings', currentSettings);
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(currentSettings));
    
    showToast(isDarkMode ? 'Modo oscuro activado' : 'Modo claro activado');
}

async function getSettingsFixed() {
    let settings = await getSettingDB('app_settings');
    if (!settings) {
        const local = localStorage.getItem(APP_CONFIG.settingsKey);
        settings = local ? JSON.parse(local) : { ...defaultSettings };
    }
    return { ...defaultSettings, ...settings };
}

// ==================== NOTIFICACIONES CORREGIDAS ====================
async function setupPushNotificationsFixed() {
    if (!('Notification' in window)) {
        console.log('Notificaciones no soportadas');
        return;
    }
    
    const settings = await getSettingsFixed();
    
    // Si ya preguntamos y el usuario rechazó, no volver a molestar
    if (settings.notifications?.permissionAsked && Notification.permission === 'denied') {
        console.log('Usuario ya rechazó notificaciones previamente');
        return;
    }
    
    // Si ya tenemos permiso, configurar recordatorios
    if (Notification.permission === 'granted') {
        settings.notifications.enabled = true;
        await saveSettingsFixed(settings);
        scheduleAllReminders();
        return;
    }
    
    // Si nunca hemos preguntado, o fue hace mucho tiempo
    const lastPrompt = settings.notifications?.lastPrompt;
    const daysSincePrompt = lastPrompt ? (Date.now() - lastPrompt) / (1000 * 60 * 60 * 24) : 999;
    
    if (!settings.notifications?.permissionAsked || daysSincePrompt > 7) {
        // Esperar un poco para no ser intrusivo inmediato al abrir
        setTimeout(() => {
            requestNotificationPermissionSmart();
        }, 5000);
    }
}

async function requestNotificationPermissionSmart() {
    try {
        const permission = await Notification.requestPermission();
        
        const settings = await getSettingsFixed();
        settings.notifications.permissionAsked = true;
        settings.notifications.lastPrompt = Date.now();
        
        if (permission === 'granted') {
            settings.notifications.enabled = true;
            showToast('¡Notificaciones activadas! 🎉');
            scheduleAllReminders();
        } else {
            settings.notifications.enabled = false;
        }
        
        await saveSettingsFixed(settings);
        
    } catch (error) {
        console.error('Error solicitando permiso:', error);
    }
}

async function saveSettingsFixed(settings) {
    await saveSettingDB('app_settings', settings);
    localStorage.setItem(APP_CONFIG.settingsKey, JSON.stringify(settings));
}

// ==================== RECORDATORIOS INTELIGENTES ====================
class SmartReminderSystem {
    constructor() {
        this.reminders = [];
        this.checkInterval = null;
    }
    
    async init() {
        // Verificar cada hora
        this.checkInterval = setInterval(() => this.checkReminders(), 3600000);
        // Verificación inicial
        await this.checkReminders();
    }
    
    async checkReminders() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
        
        const settings = await getSettingsFixed();
        if (!settings.reminders?.enabled) return;
        
        people.forEach(person => {
            const birthDate = new Date(person.birthDate);
            const daysUntil = getDaysUntil(birthDate);
            
            settings.reminders.items.forEach(reminder => {
                if (!reminder.enabled) return;
                
                // Verificar si es el momento exacto del recordatorio
                if (daysUntil === reminder.days && currentTime === reminder.time) {
                    this.triggerReminder(person, reminder);
                }
            });
            
            // Recordatorio inteligente de regalo
            if (settings.smartReminders?.enabled && daysUntil === settings.smartReminders.giftReminderDays) {
                if (currentTime === '10:00') { // Recordar a las 10 AM
                    this.triggerGiftReminder(person);
                }
            }
        });
        
        // Guardar última verificación
        localStorage.setItem(APP_CONFIG.lastNotifCheck, now.toISOString());
    }
    
    triggerReminder(person, reminderConfig) {
        const age = calculateAge(new Date(person.birthDate));
        const nextAge = age + 1;
        
        let title, body;
        
        if (reminderConfig.days === 0) {
            title = `🎂 ¡Hoy es el cumpleaños de ${person.name}!`;
            body = `Cumple ${nextAge} años. ¡No olvides felicitarle!`;
        } else if (reminderConfig.days === 1) {
            title = `🎉 Mañana cumple ${person.name}`;
            body = `Cumple ${nextAge} años. ¿Ya tienes un regalo?`;
        } else {
            title = `📅 Cumpleaños de ${person.name}`;
            body = `Faltan ${reminderConfig.days} días. Cumplirá ${nextAge} años.`;
        }
        
        this.showNotification(title, body, person.id);
        
        // Marcar como recordado hoy
        this.markAsRemindedToday(person.id, reminderConfig.days);
    }
    
    triggerGiftReminder(person) {
        const title = `🎁 ¿Regalo para ${person.name}?`;
        const body = `Su cumpleaños es en 3 días. Revisa tus notas: ${person.notes || 'Sin notas guardadas'}`;
        
        this.showNotification(title, body, person.id);
    }
    
    showNotification(title, body, tag) {
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/icon-192x192.png',
                badge: '/icon-72x72.png',
                tag: `birthday-${tag}-${Date.now()}`,
                requireInteraction: true,
                actions: [
                    {
                        action: 'view',
                        title: 'Ver detalles'
                    },
                    {
                        action: 'dismiss',
                        title: 'Descartar'
                    }
                ]
            });
        }
    }
    
    markAsRemindedToday(personId, reminderType) {
        const key = `reminded_${personId}_${reminderType}_${new Date().toDateString()}`;
        localStorage.setItem(key, 'true');
    }
    
    hasBeenRemindedToday(personId, reminderType) {
        const key = `reminded_${personId}_${reminderType}_${new Date().toDateString()}`;
        return localStorage.getItem(key) === 'true';
    }
}

const smartReminders = new SmartReminderSystem();

async function initSmartReminders() {
    await smartReminders.init();
}

// ==================== TIMELINE DE CUMPLEAÑOS ====================
function showTimeline() {
    const modal = document.createElement('div');
    modal.id = 'timelineModal';
    modal.className = 'fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center';
    modal.onclick = (e) => { if(e.target === modal) closeTimeline(); };
    
    const sortedPeople = [...people].sort((a, b) => {
        return getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate));
    });
    
    const today = new Date();
    const currentMonth = today.getMonth();
    
    // Agrupar por meses
    const months = {};
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    sortedPeople.forEach(person => {
        const birthDate = new Date(person.birthDate);
        const nextBirthday = getNextBirthdayDate(birthDate);
        const month = nextBirthday.getMonth();
        const year = nextBirthday.getFullYear();
        
        if (!months[month]) {
            months[month] = [];
        }
        
        months[month].push({
            ...person,
            nextBirthday,
            daysUntil: getDaysUntil(birthDate),
            age: calculateAge(birthDate) + 1
        });
    });
    
    let timelineHTML = '';
    Object.keys(months).sort((a, b) => {
        // Ordenar meses desde el actual
        const monthA = parseInt(a) >= currentMonth ? parseInt(a) : parseInt(a) + 12;
        const monthB = parseInt(b) >= currentMonth ? parseInt(b) : parseInt(b) + 12;
        return monthA - monthB;
    }).forEach(monthIndex => {
        const monthPeople = months[monthIndex];
        const isCurrentMonth = parseInt(monthIndex) === currentMonth;
        
        timelineHTML += `
            <div class="timeline-month ${isCurrentMonth ? 'current-month' : ''}">
                <div class="timeline-month-header">
                    <span class="month-name">${monthNames[monthIndex]}</span>
                    ${isCurrentMonth ? '<span class="current-badge">Actual</span>' : ''}
                    <span class="month-count">${monthPeople.length} cumpleaños</span>
                </div>
                <div class="timeline-events">
                    ${monthPeople.map(person => {
                        const zodiac = getZodiac(new Date(person.birthDate));
                        const isToday = person.daysUntil === 0;
                        const isWeekend = person.nextBirthday.getDay() === 0 || person.nextBirthday.getDay() === 6;
                        
                        return `
                            <div class="timeline-event ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}" 
                                 onclick="editPerson('${person.id}')">
                                <div class="event-date">
                                    <span class="day-number">${person.nextBirthday.getDate()}</span>
                                    <span class="day-name">${person.nextBirthday.toLocaleDateString('es-ES', {weekday: 'short'})}</span>
                                </div>
                                <div class="event-content">
                                    <div class="event-header">
                                        <span class="event-name">${person.name}</span>
                                        ${isToday ? '<span class="event-badge today-badge">Hoy</span>' : ''}
                                        ${isWeekend ? '<span class="event-badge weekend-badge">Finde</span>' : ''}
                                    </div>
                                    <div class="event-details">
                                        <span class="zodiac">${zodiac.symbol} ${zodiac.name}</span>
                                        <span class="age">Cumple ${person.age}</span>
                                        ${person.daysUntil > 0 ? `<span class="countdown">En ${person.daysUntil} días</span>` : ''}
                                    </div>
                                    ${person.notes ? `<div class="event-notes">📝 ${person.notes}</div>` : ''}
                                </div>
                                <div class="event-actions">
                                    <button onclick="event.stopPropagation(); shareViaWhatsApp('${person.id}')" class="action-btn-small">
                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div class="timeline-sheet w-full sm:max-w-2xl sm:rounded-3xl theme-transition" onclick="event.stopPropagation()">
            <div class="flex justify-center pt-3 pb-2" onclick="closeTimeline()">
                <div class="w-10 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            
            <div class="px-6 pb-4 flex items-center justify-between border-b" style="border-color: var(--separator);">
                <h2 class="text-title-1" style="color: var(--text-primary);">Timeline de Cumpleaños</h2>
                <button onclick="closeTimeline()" class="p-2 rounded-full active:scale-90 transition" style="background: var(--bg-tertiary);">
                    <svg class="w-5 h-5" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="timeline-content px-6 py-4 overflow-y-auto max-h-[70vh]">
                ${Object.keys(months).length === 0 ? `
                    <div class="text-center py-12">
                        <div class="text-5xl mb-4">📅</div>
                        <p class="text-title-3" style="color: var(--text-secondary);">No hay cumpleaños registrados</p>
                    </div>
                ` : timelineHTML}
            </div>
            
            <div class="timeline-stats px-6 py-4 border-t" style="border-color: var(--separator);">
                <div class="flex justify-between text-callout" style="color: var(--text-secondary);">
                    <span>Total: ${people.length} contactos</span>
                    <span>Este año: ${Object.values(months).flat().length} cumpleaños</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => {
        const sheet = modal.querySelector('.timeline-sheet');
        if (sheet) sheet.classList.add('show');
    }, 10);
}

function closeTimeline() {
    const modal = document.getElementById('timelineModal');
    if (modal) {
        const sheet = modal.querySelector('.timeline-sheet');
        if (sheet) sheet.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// ==================== HEADER MEJORADO ====================
function setupEnhancedHeader() {
    const headerButtons = document.querySelector('.glass-header .flex.items-center.justify-between .flex.items-center.gap-2');
    if (headerButtons) {
        headerButtons.innerHTML = `
            <button onclick="showStats()" class="header-btn" title="Estadísticas">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
            </button>
            
            <button onclick="showTimeline()" class="header-btn" title="Timeline">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
            </button>
            
            <button onclick="refreshData()" class="header-btn" id="refreshBtn" title="Actualizar">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
            </button>
            
            <button onclick="showSettingsModal()" class="header-btn" title="Ajustes">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
            </button>
        `;
    }
}

// ==================== FUNCIONES EXISTENTES (mantenidas) ====================
async function loadData() {
    people = await getAllPeopleDB();
    renderBirthdays();
}

async function refreshData() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        const svg = btn.querySelector('svg');
        svg.style.transition = 'transform 0.5s';
        svg.style.transform = 'rotate(360deg)';
    }
    
    showToast('Actualizando...');
    await loadData();
    
    if (btn) {
        setTimeout(() => {
            const svg = btn.querySelector('svg');
            svg.style.transition = 'none';
            svg.style.transform = 'rotate(0deg)';
        }, 500);
    }
    
    showToast('Actualizado');
}

function checkTodayBirthdays() {
    const today = new Date();
    const todayBirthdays = people.filter(person => {
        const birthDate = new Date(person.birthDate);
        return birthDate.getMonth() === today.getMonth() && birthDate.getDate() === today.getDate();
    });
    
    if (todayBirthdays.length > 0) {
        const todaySection = document.getElementById('todaySection');
        const todayNames = document.getElementById('todayNames');
        
        if (todaySection && todayNames) {
            todaySection.classList.remove('hidden');
            todayNames.textContent = todayBirthdays.map(p => p.name).join(' y ');
            setTimeout(createConfetti, 500);
        }
        
        // Notificar incluso si la app está abierta
        todayBirthdays.forEach(person => {
            const age = calculateAge(new Date(person.birthDate));
            showToast(`🎉 ${person.name} cumple ${age} años hoy!`);
        });
    }
}

function renderBirthdays(searchTerm = '') {
    const list = document.getElementById('birthdaysList');
    const empty = document.getElementById('emptyState');
    const todaySection = document.getElementById('todaySection');
    const mainContent = document.getElementById('mainContent');
    
    if (!list) return;
    
    list.innerHTML = '';
    
    let filtered = people.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const today = new Date();
    const todayBirthdays = filtered.filter(p => getDaysUntil(new Date(p.birthDate)) === 0);
    const upcoming = filtered.filter(p => getDaysUntil(new Date(p.birthDate)) > 0)
        .sort((a, b) => getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate)));

    // Mostrar sección de hoy
    if (todaySection) {
        if (todayBirthdays.length > 0) {
            todaySection.classList.remove('hidden');
            const todayNames = document.getElementById('todayNames');
            if (todayNames) todayNames.textContent = todayBirthdays.map(p => p.name).join(' y ');
        } else {
            todaySection.classList.add('hidden');
        }
    }

    const toRender = upcoming;
    
    // Control de scroll condicional
    if (toRender.length === 0 && todayBirthdays.length === 0) {
        if (empty) empty.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('no-scroll');
        return;
    }
    
    if (empty) empty.classList.add('hidden');
    if (mainContent) mainContent.classList.remove('no-scroll');

    // Renderizar items...
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


// ==================== COMPARTIR POR WHATSAPP ====================
function shareViaWhatsApp(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;
    
    const birthDate = new Date(person.birthDate);
    const days = getDaysUntil(birthDate);
    const age = calculateAge(birthDate);
    const nextAge = age + 1;
    const zodiac = getZodiac(birthDate);
    
    let message = '';
    
    if (days === 0) {
        message = `🎉 ¡Hoy es el cumpleaños de ${person.name}! Cumple ${nextAge} años. ¡No olvides felicitarle! 🎂`;
    } else if (days === 1) {
        message = `📅 Mañana cumple ${person.name} ${nextAge} años. ¡Prepárate para felicitarle! 🎉`;
    } else {
        message = `📅 Cumpleaños de ${person.name} en ${days} días. Cumplirá ${nextAge} años. ♑ ${zodiac.name}`;
    }
    
    if (person.notes) {
        message += `\n\n📝 Notas: ${person.notes}`;
    }
    
    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    
    showToast('Abriendo WhatsApp...');
}

// Función para compartir desde el modal de edición
function shareCurrentPerson() {
    if (editingId) {
        shareViaWhatsApp(editingId);
    }
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
    const name = document.getElementById('personName')?.value || '';
    const preview = document.getElementById('avatarPreview');
    if (preview) preview.textContent = name ? name.charAt(0).toUpperCase() : '?';
}

function searchBirthdays() {
    renderBirthdays(document.getElementById('searchInput')?.value || '');
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
    if (!list) return;
    
    list.innerHTML = '';
    
    const empty = document.getElementById('emptyState');
    if (filtered.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');
    
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

// Modificar showAddModal para ocultar el botón de compartir
function showAddModal() {
    editingId = null;
    const modalTitle = document.getElementById('modalTitle');
    const personName = document.getElementById('personName');
    const birthDate = document.getElementById('birthDate');
    const category = document.getElementById('category');
    const notes = document.getElementById('notes');
    const deleteBtn = document.getElementById('deleteBtn');
    const avatarPreview = document.getElementById('avatarPreview');
    const personModal = document.getElementById('personModal');
    const shareBtnContainer = document.getElementById('shareBtnContainer');
    const calendarBtnContainer = document.getElementById('calendarBtnContainer');
    
    if (modalTitle) modalTitle.textContent = 'Nuevo';
    if (personName) personName.value = '';
    if (birthDate) birthDate.value = '';
    if (category) category.value = 'family';
    if (notes) notes.value = '';
    if (deleteBtn) deleteBtn.classList.add('hidden');
    if (avatarPreview) avatarPreview.textContent = '?';
    if (personModal) personModal.classList.remove('hidden');
    
    // Ocultar botones en modo nuevo
    if (shareBtnContainer) shareBtnContainer.classList.add('hidden');
    if (calendarBtnContainer) calendarBtnContainer.classList.add('hidden');
}

function editPerson(id) {
    const p = people.find(x => x.id === id);
    if (!p) return;
    
    editingId = id;
    const modalTitle = document.getElementById('modalTitle');
    const personName = document.getElementById('personName');
    const birthDate = document.getElementById('birthDate');
    const category = document.getElementById('category');
    const notes = document.getElementById('notes');
    const deleteBtn = document.getElementById('deleteBtn');
    const avatarPreview = document.getElementById('avatarPreview');
    const personModal = document.getElementById('personModal');
    const shareBtnContainer = document.getElementById('shareBtnContainer');
    const calendarBtnContainer = document.getElementById('calendarBtnContainer');
    
    if (modalTitle) modalTitle.textContent = 'Editar';
    if (personName) personName.value = p.name;
    if (birthDate) birthDate.value = p.birthDate.split('T')[0];
    if (category) category.value = p.category;
    if (notes) notes.value = p.notes || '';
    if (deleteBtn) deleteBtn.classList.remove('hidden');
    if (avatarPreview) avatarPreview.textContent = p.name.charAt(0);
    if (personModal) personModal.classList.remove('hidden');
    
    // Mostrar botones de compartir y calendario
    if (shareBtnContainer) shareBtnContainer.classList.remove('hidden');
    if (calendarBtnContainer) calendarBtnContainer.classList.remove('hidden');
}

function closeModal() {
    const personModal = document.getElementById('personModal');
    if (personModal) personModal.classList.add('hidden');
}

async function savePerson() {
    const name = document.getElementById('personName')?.value.trim();
    const birthDate = document.getElementById('birthDate')?.value;
    
    if (!name || !birthDate) {
        showToast('Completa el nombre y fecha');
        return;
    }

    const person = {
        id: editingId || Date.now().toString(),
        name,
        birthDate: new Date(birthDate).toISOString(),
        category: document.getElementById('category')?.value || 'family',
        notes: document.getElementById('notes')?.value.trim() || ''
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
    
    // Reprogramar recordatorios
    scheduleAllReminders();
}

async function deleteCurrentPerson() {
    if (!confirm('¿Eliminar este cumpleaños?')) return;
    await deletePersonDB(editingId);
    people = people.filter(p => p.id !== editingId);
    renderBirthdays();
    closeModal();
    showToast('Eliminado');
}

function enhanceEditModal() {
    // Esta función se mantiene para compatibilidad
}

function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const t = document.createElement('div');
    t.className = 'toast-ios';
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ==================== SETTINGS MODAL (ACTUALIZADO) ====================
async function showSettingsModal() {
    const settings = await getSettingsFixed();
    const currentTheme = settings.theme?.color || 'default';
    const isDark = isDarkMode;

    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'fixed inset-0 z-50 modal-backdrop flex items-end sm:items-center justify-center';
    modal.onclick = (e) => { if(e.target === modal) closeSettings(); };

    modal.innerHTML = `
        <div class="settings-sheet w-full sm:max-w-md sm:rounded-3xl theme-transition" onclick="event.stopPropagation()">
            <div class="flex justify-center pt-3 pb-2" onclick="closeSettings()">
                <div class="w-10 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            <div class="px-6 pb-4 flex items-center justify-between border-b" style="border-color: var(--separator);">
                <h2 class="text-title-1" style="color: var(--text-primary);">Ajustes</h2>
                <button onclick="closeSettings()" class="p-2 rounded-full active:scale-90 transition" style="background: var(--bg-tertiary);">
                    <svg class="w-5 h-5" style="color: var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <div class="px-6 py-4 space-y-6 overflow-y-auto max-h-[70vh]">
                <div>
                    <h3 class="text-caption mb-3 uppercase tracking-wider">Apariencia</h3>
                    <div class="glass-card p-4 mb-4 theme-transition">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-2xl">${isDark ? '☀️' : '🌙'}</span>
                                <div>
                                    <div class="text-title-3" style="color: var(--text-primary);">Modo ${isDark ? 'Claro' : 'Oscuro'}</div>
                                    <div class="text-footnote" style="color: var(--text-secondary);">${isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}</div>
                                </div>
                            </div>
                            <button onclick="toggleDarkModeFixed()" class="dark-mode-toggle ${isDark ? 'active' : ''}">
                                <span class="toggle-knob"></span>
                            </button>
                        </div>
                    </div>

                    <!-- Color del Tema -->
                    <div class="glass-card p-4 theme-transition">
                        <div class="mb-3">
                            <div class="text-title-3" style="color: var(--text-primary);">Color del tema</div>
                            <div class="text-footnote" style="color: var(--text-secondary);">Personaliza el color principal</div>
                        </div>
                       <div class="grid grid-cols-5 gap-2">
                            ${Object.entries(THEMES).map(([key, theme]) => `
                                <button onclick="setTheme('${key}'); updateSettingsTheme('${key}'); showToast('Tema ${theme.name} aplicado');" 
                                        class="theme-option ${currentTheme === key ? 'active' : ''}" 
                                        style="background: ${theme.gradient}; height: 44px; border-radius: 12px; border: 2px solid ${currentTheme === key ? 'var(--text-primary)' : 'transparent'}; display: flex; align-items: center; justify-content: center; transition: all 0.2s;"
                                        title="${theme.name}">
                                </button>
                            `).join('')}
                        </div>
                        <div class="flex justify-between mt-2 text-footnote" style="color: var(--text-secondary);">
                            <span>Azul</span>
                            <span>Rosa</span>
                            <span>Verde</span>
                            <span>Púrpura</span>
                            <span>Naranja</span>
                        </div>
                    </div>

                </div>

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
                            <button onclick="toggleRemindersEnabled()" class="reminder-master-switch ${settings.reminders?.enabled ? 'active' : ''}">
                                <span class="switch-knob"></span>
                            </button>
                        </div>

                        ${settings.reminders?.enabled ? `
                            <div class="space-y-3 pt-3 border-t" style="border-color: var(--separator);">
                                ${settings.reminders.items.map((r, i) => `
                                    <div class="flex items-center justify-between">
                                        <span class="text-callout" style="color: var(--text-primary);">${r.label}</span>
                                        <div class="flex items-center gap-2">
                                            <input type="time" value="${r.time}" 
                                                   onchange="updateReminderTime(${i}, this.value)"
                                                   class="time-input text-center">
                                            <div class="switch-ios switch-small ${r.enabled ? 'active' : ''}" onclick="toggleReminderItem(${i})"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <div class="mt-4 pt-3 border-t" style="border-color: var(--separator);">
                                <div class="flex items-center justify-between">
                                    <span class="text-callout" style="color: var(--text-primary);">Recordar comprar regalo</span>
                                    <select onchange="updateGiftReminder(this.value)" class="time-input" style="width: auto; padding: 6px 12px;">
                                        <option value="1" ${settings.smartReminders?.giftReminderDays === 1 ? 'selected' : ''}>1 día antes</option>
                                        <option value="3" ${settings.smartReminders?.giftReminderDays === 3 ? 'selected' : ''}>3 días antes</option>
                                        <option value="7" ${settings.smartReminders?.giftReminderDays === 7 ? 'selected' : ''}>1 semana antes</option>
                                        <option value="0" ${!settings.smartReminders?.enabled ? 'selected' : ''}>Desactivado</option>
                                    </select>
                                </div>
                            </div>

                            <button onclick="testNotification()" class="w-full mt-4 py-3 rounded-xl font-semibold text-callout active:scale-95 transition"
                                    style="background: rgba(10, 132, 255, 0.1); color: var(--ios-blue);">
                                🔔 Probar notificación
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div>
                    <h3 class="text-caption mb-3 uppercase tracking-wider">Datos</h3>
                    <div class="glass-card p-4 theme-transition">
                        <div class="flex items-center gap-3 mb-3">
                            <span class="text-2xl">💾</span>
                            <div>
                                <div class="text-title-3" style="color: var(--text-primary);">Backup</div>
                                <div class="text-footnote" style="color: var(--text-secondary);">${people.length} contactos</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="exportBackup(); showToast('Backup descargado');" class="py-3 rounded-xl font-semibold text-callout active:scale-95 transition flex items-center justify-center gap-2"
                                    style="background: rgba(10, 132, 255, 0.1); color: var(--ios-blue);">
                                Exportar
                            </button>
                            <input type="file" id="settingsBackupInput" accept=".json" class="hidden" onchange="handleSettingsBackup(this)">
                            <button onclick="document.getElementById('settingsBackupInput').click()" class="py-3 rounded-xl font-semibold text-callout active:scale-95 transition flex items-center justify-center gap-2"
                                    style="background: rgba(48, 209, 88, 0.1); color: #30D158;">
                                Importar
                            </button>
                        </div>
                    </div>
                </div>

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

async function toggleRemindersEnabled() {
    const settings = await getSettingsFixed();
    settings.reminders.enabled = !settings.reminders.enabled;
    await saveSettingsFixed(settings);
    closeSettings();
    setTimeout(showSettingsModal, 350);
    if (settings.reminders.enabled) scheduleAllReminders();
}

async function toggleReminderItem(index) {
    const settings = await getSettingsFixed();
    settings.reminders.items[index].enabled = !settings.reminders.items[index].enabled;
    await saveSettingsFixed(settings);
    scheduleAllReminders();
    closeSettings();
    setTimeout(showSettingsModal, 350);
}

async function updateReminderTime(index, time) {
    const settings = await getSettingsFixed();
    settings.reminders.items[index].time = time;
    await saveSettingsFixed(settings);
    scheduleAllReminders();
}

async function updateGiftReminder(days) {
    const settings = await getSettingsFixed();
    settings.smartReminders = settings.smartReminders || {};
    settings.smartReminders.giftReminderDays = parseInt(days);
    settings.smartReminders.enabled = days !== '0';
    await saveSettingsFixed(settings);
    showToast(days === '0' ? 'Recordatorio de regalo desactivado' : `Recordar ${days} días antes`);
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

function scheduleAllReminders() {
    // Los recordatorios se manejan ahora por SmartReminderSystem
    console.log('Recordatorios reprogramados');
}

// ==================== FUNCIONES AUXILIARES ====================
function exportBackup() {
    // Implementación básica de backup
    const backup = {
        version: '2.1',
        date: new Date().toISOString(),
        people: people
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `birthday-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

async function handleSettingsBackup(input) {
    const file = input.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const backup = JSON.parse(text);
        
        if (backup.people && Array.isArray(backup.people)) {
            // Limpiar existentes
            for (const p of people) {
                await deletePersonDB(p.id);
            }
            
            // Importar nuevos
            for (const person of backup.people) {
                await savePersonDB(person);
            }
            
            await loadData();
            showToast(`${backup.people.length} contactos importados`);
            closeSettings();
        }
    } catch (error) {
        showToast('Error al importar backup');
    }
}

// ==================== TEMAS ====================
const THEMES = {
    default: { name: 'Azul', primary: '#0A84FF', gradient: 'linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%)' },
    rose: { name: 'Rosa', primary: '#FF375F', gradient: 'linear-gradient(135deg, #FF375F 0%, #FF453A 100%)' },
    emerald: { name: 'Verde', primary: '#30D158', gradient: 'linear-gradient(135deg, #30D158 0%, #30DB5B 100%)' },
    purple: { name: 'Púrpura', primary: '#BF5AF2', gradient: 'linear-gradient(135deg, #BF5AF2 0%, #AF52DE 100%)' },
    orange: { name: 'Naranja', primary: '#FF9F0A', gradient: 'linear-gradient(135deg, #FF9F0A 0%, #FFD60A 100%)' }
};

function setTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return;
    
    const root = document.documentElement;
    root.style.setProperty('--ios-blue', theme.primary);
}

async function updateSettingsTheme(themeKey) {
    const settings = await getSettingsFixed();
    settings.theme.color = themeKey;
    await saveSettingsFixed(settings);
}

// ==================== COMPATIBILIDAD ====================
function toggleDarkMode() {
    toggleDarkModeFixed();
}

// Cerrar modales al hacer click fuera
window.onclick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
        closeModal();
        closeSettings();
        closeTimeline();
    }
};


// ==================== ESTADÍSTICAS ====================
function showStats() {
    const modal = document.getElementById('statsModal');
    if (!modal) return;
    
    // Calcular estadísticas
    const total = people.length;
    const today = new Date();
    const currentMonth = today.getMonth();
    
    // Cumpleaños este mes
    const thisMonth = people.filter(p => {
        const birthDate = new Date(p.birthDate);
        return birthDate.getMonth() === currentMonth;
    }).length;
    
    // Edad media
    let avgAge = 0;
    if (total > 0) {
        const totalAge = people.reduce((sum, p) => {
            return sum + calculateAge(new Date(p.birthDate));
        }, 0);
        avgAge = Math.round(totalAge / total);
    }
    
    // Próximo cumpleaños
    let nextPerson = '-';
    if (people.length > 0) {
        const sorted = [...people].sort((a, b) => {
            return getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate));
        });
        const days = getDaysUntil(new Date(sorted[0].birthDate));
        nextPerson = days === 0 ? 'Hoy!' : `${days} días`;
    }
    
    // Actualizar UI
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statThisMonth').textContent = thisMonth;
    document.getElementById('statAvgAge').textContent = avgAge || '-';
    document.getElementById('statNext').textContent = nextPerson;
    
    modal.classList.remove('hidden');
}

function closeStats() {
    const modal = document.getElementById('statsModal');
    if (modal) modal.classList.add('hidden');
}

function exportToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast('Error: Librería PDF no cargada');
        return;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(24);
    doc.text('My Birthdays', pageWidth / 2, 20, { align: 'center' });
    
    // Fecha
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 30, { align: 'center' });
    
    let y = 50;
    
    // Ordenar por días hasta cumpleaños
    const sorted = [...people].sort((a, b) => {
        return getDaysUntil(new Date(a.birthDate)) - getDaysUntil(new Date(b.birthDate));
    });
    
    sorted.forEach((person, index) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        
        const birthDate = new Date(person.birthDate);
        const days = getDaysUntil(birthDate);
        const age = calculateAge(birthDate);
        const zodiac = getZodiac(birthDate);
        
        // Nombre
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${person.name}`, 20, y);
        
        // Detalles
        doc.setFontSize(10);
        doc.setTextColor(100);
        const details = `${birthDate.getDate()}/${birthDate.getMonth() + 1} • ${zodiac.symbol} ${zodiac.name} • Cumple ${age + 1} años • ${days === 0 ? '¡HOY!' : `En ${days} días`}`;
        doc.text(details, 20, y + 6);
        
        // Notas si existen
        if (person.notes) {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text(`Notas: ${person.notes.substring(0, 60)}${person.notes.length > 60 ? '...' : ''}`, 20, y + 12);
            y += 8;
        }
        
        y += 20;
    });
    
    // Total
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total: ${people.length} contactos`, pageWidth / 2, y + 10, { align: 'center' });
    
    doc.save('cumpleanos.pdf');
    showToast('PDF descargado');
}

// ==================== IMPORTAR CONTACTOS ====================
function importContacts() {
    // Por ahora abre el modal de añadir manualmente
    // En el futuro puedes integrar la API de Contactos del dispositivo
    showAddModal();
    showToast('Añade contactos manualmente o usa el botón +');
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.classList.add('hidden');
}

function switchTab(tab) {
    // Actualizar botones
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    // Mostrar/ocultar contenido
    document.getElementById('import-device').classList.toggle('hidden', tab !== 'device');
    document.getElementById('import-manual').classList.toggle('hidden', tab !== 'manual');
}

function importSelected() {
    // Implementación básica
    showToast('Importación completada');
    closeImportModal();
}


// ==================== INTEGRACIÓN CON CALENDARIO ====================

// Agregar cumpleaños al calendario nativo
function addToCalendar(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;
    
    const birthDate = new Date(person.birthDate);
    const nextBirthday = getNextBirthdayDate(birthDate);
    const age = calculateAge(birthDate) + 1;
    
    // Crear evento en formato ICS (iCalendar)
    const event = createICSEvent(person, nextBirthday, age);
    
    // Descargar archivo .ics
    downloadICSFile(event, `cumpleanos-${person.name.replace(/\s+/g, '-').toLowerCase()}`);
    
    showToast('Archivo de calendario descargado');
}

// Crear evento ICS
function createICSEvent(person, date, age) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const startDate = `${year}${month}${day}`;
    // Fecha de fin (todo el día)
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endDateStr = `${endYear}${endMonth}${endDay}`;
    
    const uid = `${person.id}@birthday-app`;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Birthday App//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${startDate}`,
        `DTEND;VALUE=DATE:${endDateStr}`,
        `SUMMARY:🎂 Cumpleaños de ${person.name}`,
        `DESCRIPTION:Cumple ${age} años\\n${person.notes ? 'Notas: ' + person.notes : ''}`,
        'RRULE:FREQ=YEARLY',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Recordatorio de cumpleaños',
        'TRIGGER:-P1D', // 1 día antes
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    return icsContent;
}

// Descargar archivo ICS
function downloadICSFile(content, filename) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Función para el botón en el modal
function addCurrentPersonToCalendar() {
    if (editingId) {
        addToCalendar(editingId);
    }
}

// Compartir evento de calendario (para apps que soportan archivos)
async function shareCalendarEvent(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;
    
    const birthDate = new Date(person.birthDate);
    const nextBirthday = getNextBirthdayDate(birthDate);
    const age = calculateAge(birthDate) + 1;
    
    const icsContent = createICSEvent(person, nextBirthday, age);
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const file = new File([blob], `cumpleanos-${person.name}.ics`, { type: 'text/calendar' });
    
    // Usar Web Share API si está disponible
    if (navigator.share && navigator.canShare) {
        try {
            await navigator.share({
                title: `Cumpleaños de ${person.name}`,
                text: `Cumple ${age} años el ${nextBirthday.toLocaleDateString('es-ES')}`,
                files: [file]
            });
            showToast('Compartido exitosamente');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error compartiendo:', error);
                // Fallback a descarga
                downloadICSFile(icsContent, `cumpleanos-${person.name.replace(/\s+/g, '-').toLowerCase()}`);
            }
        }
    } else {
        // Fallback: descargar archivo
        downloadICSFile(icsContent, `cumpleanos-${person.name.replace(/\s+/g, '-').toLowerCase()}`);
    }
}