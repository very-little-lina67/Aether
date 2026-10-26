# Aether – Unzensierte KI

Eine eigene, möglichst unzensierte KI-Webseite mit Chat und Bildgenerierung.

- **Bilder**: Über Pollinations.ai (ohne API-Key, relativ unzensiert)
- **Chat**: Über Pollinations Text-API (legacy)
- **Deployment**: GitHub → Vercel (kostenlos)

## Features

- Dark Mode UI
- Chat-Modus und reiner Bild-Modus
- Automatische Erkennung von Bild-Prompts
- Responsive Design
- Keine Backend-Server nötig (alles Client-seitig)

## Wichtiger Hinweis

Die externen APIs (Pollinations) haben eigene Limits und können zeitweise ausfallen oder Wasserzeichen setzen. Es gibt keine 100% Garantie für absolute Unzensiertheit – das hängt vom Modell ab. Für echte Unzensiertheit brauchst du eigene Modelle (lokal oder über bezahlte uncensored APIs).

## Dateien-Struktur

```
my-uncensored-ai/
├── public/                 # Statische Dateien (favicon etc.)
├── src/
│   └── app/
│       ├── globals.css     # Styles
│       ├── layout.tsx      # Root Layout
│       └── page.tsx        # Hauptseite mit Chat
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── README.md
```

## Lokal testen

```bash
cd my-uncensored-ai
npm install
npm run dev
```

Öffne http://localhost:3000

## Auf GitHub hochladen & Vercel deployen

### 1. Neues GitHub Repository erstellen

1. Gehe zu [github.com](https://github.com) und logge dich ein
2. Klicke auf **"+"** → **New repository**
3. Name z.B. `uncensored-ai`
4. Public wählen
5. **Nicht** "Add a README" ankreuzen
6. Create repository

### 2. Dateien hochladen (einfachste Methode – über Browser)

1. Öffne dein neues leeres Repository
2. Klicke auf **uploading an existing file**
3. Ziehe den **gesamten Inhalt** des Ordners `my-uncensored-ai` hinein  
   (also package.json, src/, public/, etc. – **nicht** den Ordner selbst als Root)
4. Commit message: `Initial commit`
5. Commit changes

**Oder mit Git (empfohlen):**

```bash
cd my-uncensored-ai
git init
git add .
git commit -m "Initial commit - Uncensored AI"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/uncensored-ai.git
git push -u origin main
```

### 3. Auf Vercel deployen

1. Gehe zu [vercel.com](https://vercel.com) und logge dich mit GitHub ein
2. Klicke **Add New…** → **Project**
3. Importiere dein Repository `uncensored-ai`
4. Framework Preset: **Next.js** (wird automatisch erkannt)
5. Root Directory: leer lassen
6. **Deploy** klicken

Fertig! Deine Seite ist live unter `https://uncensored-ai-xxxxx.vercel.app`

## Anpassungen

- System-Prompt in `src/app/page.tsx` ändern
- Bild-Parameter (Größe, Modell) in der `generateImageUrl` Funktion
- Für bessere/stabilere Text-Antworten kannst du später OpenRouter, Groq oder Unlid etc. mit eigenem API-Key einbauen (dann Server-Route nötig)

Viel Spaß!
