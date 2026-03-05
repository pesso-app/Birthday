# 🎂 Birthday

Una aplicación web progresiva (PWA) elegante para gestionar y recordar cumpleaños. Diseñada con un estilo iOS moderno, funciona offline y se instala como app nativa en cualquier dispositivo.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)
![iOS](https://img.shields.io/badge/iOS-Compatible-lightgrey.svg)
![Android](https://img.shields.io/badge/Android-Compatible-green.svg)

## ✨ Características

- 📱 **Diseño iOS Nativo** - Interfaz fluida con glassmorphism y animaciones suaves
- 🌙 **Modo Oscuro/Claro** - Cambio automático con soporte para notch
- 🔔 **Notificaciones Push** - Recordatorios configurables (1 semana, 3 días, 1 día, mismo día)
- 📊 **Estadísticas** - Visualiza contactos, edad media, cumpleaños este mes
- 📤 **Exportar** - PDF, Calendario (.ics) y Backup JSON
- 💬 **Compartir** - WhatsApp integrado para enviar recordatorios
- ♈ **Signos Zodiacales** - Muestra el signo de cada contacto
- 🎉 **Detección de Hoy** - Celebración especial cuando es el cumpleaños
- 🔒 **100% Offline** - IndexedDB para almacenamiento local
- 📲 **Instalable** - Añade a pantalla de inicio como app nativa

## 🚀 Demo

Abre en tu móvil: `https://tu-dominio.com`

&gt; **Sugerencia:** En iOS, usa "Añadir a pantalla de inicio" desde Safari para la mejor experiencia.

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Estilos:** Tailwind CSS + CSS Variables para theming
- **Almacenamiento:** IndexedDB (wrapper nativo)
- **PWA:** Service Worker, Web App Manifest, Web Push API
- **Exportación:** jsPDF, iCalendar format
- **Fuentes:** Inter + SF Pro (system fonts)


## 🎯 Uso

### Añadir un cumpleaños
1. Toca el botón **+** flotante
2. Completa nombre y fecha
3. Selecciona categoría (Familia, Amigos, Trabajo, Otros)
4. Guarda

### Importar contactos
- Desde el dispositivo (Contact Picker API)
- Manualmente en formato: `Nombre, DD/MM/AAAA`

### Configurar recordatorios
1. Toca el icono ⚙️ en el header
2. Activa "Recordatorios"
3. Personaliza hora y días de anticipación
4. Permite notificaciones del navegador

## 🎨 Temas de Color

6 temas disponibles en ajustes:
- 🔵 Azul (default)
- 🌹 Rosa
- 🟢 Verde
- 🟣 Púrpura
- 🟠 Naranja  
- 🔷 Cian

## 💾 Backup y Restore

Exporta todos tus datos como archivo JSON incluyendo:
- Todos los contactos
- Configuración de recordatorios
- Preferencias de tema

## 🌐 Compatibilidad

| Característica | Chrome | Safari | Firefox |
|---------------|--------|--------|---------|
| App Instalable | ✅ | ✅ | ⚠️ |
| Notificaciones | ✅ | ✅ | ❌ |
| Contact Picker | ✅ | ❌ | ❌ |
| IndexedDB | ✅ | ✅ | ✅ |

## 🤝 Contribuir

1. Fork el repositorio
2. Crea tu branch (`git checkout -b feature/nueva-funcion`)
3. Commit (`git commit -m 'Añade nueva función'`)
4. Push (`git push origin feature/nueva-funcion`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - Libre para uso personal y comercial.

---

<p align="center">
  Hecho con ❤️ by Pesso para no olvidar fechas importantes
</p>

