# GF1-Spotify
Spotify-klon til GF1 - Starter Template

Dette projekt er en clean starter template til at bygge jeres Spotify-klon. Templaten indeholder grundlæggende struktur og design, men ingen funktionalitet - det er op til jer at implementere!

## 🏗️ Projekt Struktur

```
GF1-Spotify/
├── backend/           # Node.js Express server
│   ├── data/         # JSON database filer
│   ├── covers/       # Cover billeder (tom)
│   ├── music/        # Musik filer (tom)
│   └── server.js     # Hovedserver fil
├── frontend/         # HTML/CSS/JavaScript frontend
│   ├── index.html    # Hoved HTML fil
│   ├── style.css     # Styling
│   └── script.js     # JavaScript logik
└── MusicPlayer/      # Arduino kode (valgfrit)
```

## 🎯 Backend

### Ansvar:
- Servere API endpoints til frontend
- Håndtere data storage (songs.json)
- Servere statiske filer (musik og covers)
- Provide healthcheck endpoint

### Nuværende funktionalitet:
- ✅ Healthcheck endpoint (`/api/health`)
- ✅ CORS konfiguration
- ✅ Express server setup

### Hvordan man starter:
```bash
cd backend
npm install
npm start
```

Serveren kører på: `http://localhost:3001`
Healthcheck: `http://localhost:3001/api/health`

### Dependencies:
```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5"
}
```

## 🎨 Frontend 

### Ansvar:
- Brugerinterface og design
- Kalde backend API endpoints
- Håndtere brugerinteraktioner
- Afspille musik (skal implementeres)
- Upload funktionalitet (skal implementeres)

### Nuværende funktionalitet:
- ✅ Komplet responsive design
- ✅ Modal til upload (kun UI)
- ✅ Musik player interface (kun UI)
- ✅ Søgefunktion interface (kun UI)
- ✅ Healthcheck visning

### Hvordan man starter:
**Anbefalet: Live Server Extension**

1. Installer Live Server extension i VS Code
2. Højreklik på `frontend/index.html`
3. Vælg "Open with Live Server"
4. Siden åbnes automatisk i browser med auto-reload

**Alternativt:**
- Åbn `frontend/index.html` direkte i browser
- Eller brug en anden local server løsning

## 🚀 Kom i gang

1. **Start backend serveren:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start frontend:**
   - Brug Live Server extension i VS Code
   - Åbn `frontend/index.html`

3. **Tjek at alt virker:**
   - Frontend skal vise "✅ Server Status: OK"
   - Hvis ikke, tjek at backend kører på port 3001

## 📋 Hvad skal I implementere?

### Backend endpoints (forslag):
- `GET /api/songs` - Hent alle sange
- `GET /api/songs/:id` - Hent specifik sang
- `POST /api/songs/upload` - Upload ny sang
- `DELETE /api/songs/:id` - Slet sang

### Frontend funktionalitet:
- Afspil/pause musik
- Upload sange med covers
- Søg i sange
- Playlist funktionalitet
- Volume kontrol

### Bonus features:
- YouTube integration
- Arduino musik player
- Bruger system
- Favoritter

## 🛠️ Teknologier

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Database:** JSON filer (kan opgraderes til rigtig database)
- **Styling:** Custom CSS med Spotify-inspireret design

## 📝 Noter

- Designet er allerede implementeret og responsive
- Server og frontend kommunikerer via REST API
- CORS er konfigureret til udvikling
- Alle mapper til musik og covers er oprettet men tomme

God fornøjelse med jeres projekt! 🎵 