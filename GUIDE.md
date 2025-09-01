### Trin-for-trin guide: Hent, afspil og upload sange via jeres API

Nedenfor bygger vi ovenpå den eksisterende backend og frontend. Vi:
- henter og viser sange fra API’et
- afspiller valgte sange (play/pause, tid, scrub/seek)
- uploader nye sange med cover (multipart/form-data)
- filtrerer via søgning

Bemærk: Backend returnerer relative stier (`/covers/...`, `/songs/...`). Frontend præfixer med `API_URL`.

---

## Forberedelse

- Start backend:
```powershell
# fra projektrod
node backend/server.js
# Swagger: http://localhost:3001/api-docs
# Health:  http://localhost:3001/api/health
```
- Åbn `frontend/index.html` i din browser (eller servér den via en simpel static server).

---

### Trin 1 · **OBLIGATORISK**: Gør backend klar til at serve filer (covers og sange)

**Dette trin er allerede implementeret i koden**, men hvis du starter fra en ren backend, skal du tilføje statiske ruter i `backend/server.js` (lige efter `app.use(express.json());`):

```js
// Servér statiske filer (covers og sange)
app.use('/covers', express.static(path.join(__dirname, 'covers')));
app.use('/songs', express.static(path.join(__dirname, 'songs')));
```

**Test**: Åbn `http://localhost:3001/covers/howitsdone.png` i browseren - den skal vise billedet (ikke 404).

---

### Trin 2 · Ret upload-feltets navn i HTML

Backend forventer feltet `song` (ikke `file`). Opdater i `frontend/index.html`:

```html
<form id="upload-form" enctype="multipart/form-data">
  <h2>Tilføj ny sang</h2>
  <input type="text" name="youtube" id="youtube-link" placeholder="YouTube-link (valgfrit)" />
  <input type="hidden" name="thumbnail_url" id="youtube-thumbnail-url" />
  <div id="youtube-preview" class="hidden" style="margin-bottom: 1em;"></div>

  <input type="text" name="title" placeholder="Titel" required />
  <input type="text" name="artist" placeholder="Kunstner" required />

  <!-- VIGTIGT: name="song" -->
  <input type="file" name="song" accept="audio/*" required />
  <input type="file" name="cover" accept="image/*" required />

  <button type="submit">Upload sang</button>
  </form>
```

---

### Trin 3 · Hent sange fra API og vis dem i UI

I `frontend/script.js` har I allerede `API_URL` og loader/error-håndtering.

1) Tilføj referencer og state øverst i filen (under de eksisterende `const`):

```js
const audio = document.getElementById("audio");
const playPauseBtn = document.getElementById("play-pause");
const playIcon = document.getElementById("play-icon");
const pauseIcon = document.getElementById("pause-icon");
const seekBar = document.getElementById("seek-bar");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const playerCover = document.getElementById("player-cover");
const playerInfo = document.getElementById("player-info");
const searchInput = document.getElementById("search");
const uploadForm = document.getElementById("upload-form");

let songs = [];
let currentIndex = -1;
```

2) Tilføj funktioner til at hente/rendere:

```js
async function loadSongs() {
  setLoader(true);
  setError(null);
  try {
    const res = await fetch(`${API_URL}/api/songs`);
    if (!res.ok) throw new Error("Kunne ikke hente sange");
    const data = await res.json();
    songs = data.songs || [];
    renderSongs(songs);
  } catch (e) {
    setError(e.message);
  } finally {
    setLoader(false);
  }
}

function renderSongs(list) {
  if (!Array.isArray(list) || list.length === 0) {
    songListElem.innerHTML = `<p style="padding:1rem;color:#b3b3b3;">Ingen sange endnu. Prøv at uploade en.</p>`;
    return;
  }

  songListElem.innerHTML = list
    .map((s, i) => `
      <article class="song-card">
        <button class="play" data-index="${i}" title="Afspil">
          <img src="${API_URL}${s.coverPath}" alt="Cover: ${s.title}" />
        </button>
        <h3>${s.title}</h3>
        <p>${s.artist}</p>
      </article>
    `)
    .join("");

  songListElem.querySelectorAll(".play").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.index);
      playSong(idx);
    });
  });
}
```

3) Kobl `loadSongs()` ind efter vellykket health-check.

---

### Trin 4 · Afspiller: play/pause, tid, seekbar

```js
function playSong(index) {
  currentIndex = index;
  const s = songs[index];
  if (!s) return;

  audio.src = `${API_URL}${s.songPath}`;
  playerCover.src = `${API_URL}${s.coverPath}`;
  playerCover.style.display = "block";
  playerInfo.textContent = `${s.title} — ${s.artist}`;

  audio.play();
}

function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

playPauseBtn.addEventListener("click", togglePlay);

audio.addEventListener("play", () => {
  playIcon.style.display = "none";
  pauseIcon.style.display = "block";
});
audio.addEventListener("pause", () => {
  playIcon.style.display = "block";
  pauseIcon.style.display = "none";
});

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
  seekBar.max = Math.floor(audio.duration || 0);
});

audio.addEventListener("timeupdate", () => {
  currentTimeEl.textContent = formatTime(audio.currentTime);
  if (!seekBar.matches(":active")) {
    seekBar.value = Math.floor(audio.currentTime || 0);
  }
});

audio.addEventListener("ended", () => {
  if (currentIndex < songs.length - 1) {
    playSong(currentIndex + 1);
  }
});

seekBar.addEventListener("input", () => {
  audio.currentTime = Number(seekBar.value || 0);
});

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
```

---

### Trin 5 · Upload ny sang (multipart/form-data)

```js
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(uploadForm);
    // Robust mod ældre HTML: konverter "file" → "song"
    if (fd.has("file")) {
      const file = fd.get("file");
      fd.delete("file");
      fd.append("song", file);
    }

    try {
      setLoader(true);
      setError(null);

      const res = await fetch(`${API_URL}/api/songs`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Upload fejlede: ${errText || res.status}`);
      }

      const data = await res.json();
      if (!data?.success || !data?.song) throw new Error("Uventet svar fra server");

      songs = [data.song, ...songs];
      renderSongs(songs);

      uploadForm.reset();
      uploadModal.classList.add("hidden");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoader(false);
    }
  });
}
```

---

### Trin 6 · Søgning

```js
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = songs.filter(s =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
    renderSongs(filtered);
  });
}
```

---

### Trin 7 · Hook op efter health-check

Når `checkHealth()` melder OK, kaldes `loadSongs()` for at hente listen.

---

### Testcheckliste

#### **Backend Test:**
- ✅ Åbn `http://localhost:3001/api/health` → status OK
- ✅ Åbn `http://localhost:3001/api-docs` → Swagger UI vises
- ✅ Test `http://localhost:3001/covers/howitsdone.png` → billede vises (ikke 404)

#### **Frontend Design Test:**
- ✅ Frontend loader sange → **Spotify-lignende kort** vises i responsive grid
- ✅ Hover over kort → **løfter sig, får glow, play-knap vises**
- ✅ Covers viser korrekt med **gradient baggrund** og **afrundede hjørner**

#### **Funktionalitet Test:**
- ✅ Klik på kort → afspilning starter, **kort får grøn aktiv-kant**
- ✅ Play/pause virker, tider opdateres, slider kan søge
- ✅ Upload ny sang + cover → vises som **nyt kort i grid**, kan afspilles
- ✅ Søg efter titel/kunstner → listen filtreres med **smooth animationer**

#### **Responsive Test:**
- ✅ Desktop: Store kort i grid (200px+)
- ✅ Tablet: Mellemstore kort (160px+) 
- ✅ Mobil: Kompakte kort (140px+)

---

### Trin 8 · **IMPLEMENTERET**: Spotify-lignende Card Design

**Dette er allerede implementeret i CSS'en**, men her er hvad der er tilføjet:

#### **Visuelle Features:**
- **Grid Layout**: Responsive grid der tilpasser sig skærmstørrelse
- **Gradient Baggrund**: Flotte gradienter på `.song-card` elementer
- **Hover Effekter**: Kort løfter sig (`translateY(-8px)`) og får grøn glow
- **Play Button Overlay**: Grøn play-knap (▶) vises på hover over covers
- **Aktiv Status**: Det kort der spiller fremhæves med `.active` klasse

#### **CSS Klasser:**
```css
.song-card              /* Hovedkort med gradient baggrund */
.song-card:hover        /* Hover effekter med løft og glow */
.song-card.active       /* Aktiv sang med grøn kant */
.song-card .play        /* Cover billede som knap */
.song-card .play::after /* Play-knap overlay */
```

#### **JavaScript Integration:**
- `playSong()` funktionen tilføjer automatisk `.active` klasse
- Fjerner `.active` fra andre kort når ny sang starter
- Responsive grid: 200px → 160px → 140px på mindre skærme

---

### Bonus (valgfrit)
- Næste/Forrige-knapper i afspilleren
- ✅ **Implementeret**: Highlight aktiv sang i listen (`.active` klasse)
- Gem sidste afspillede sang i `localStorage`
- Upload-progress (XHR onprogress eller Fetch stream)
- Volume kontrol slider
- Shuffle og repeat funktioner


