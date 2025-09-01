const API_URL = "http://localhost:3001";

const songListElem = document.getElementById("song-list");
const loader = document.getElementById("loader");
const errorElem = document.getElementById("error");
const openUploadModalBtn = document.getElementById("open-upload-modal");
const uploadModal = document.getElementById("upload-modal");
const closeUploadModalBtn = document.getElementById("close-upload-modal");
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

function setLoader(visible) {
  loader.classList.toggle("hidden", !visible);
}

function setError(msg) {
  if (msg) {
    errorElem.textContent = msg;
    errorElem.classList.remove("hidden");
  } else {
    errorElem.classList.add("hidden");
  }
}

// Funktion til at tjekke server status
function checkHealth() {
  setLoader(true);
  setError(null);
  
  fetch(`${API_URL}/api/health`)
    .then((res) => {
      if (!res.ok) throw new Error("Server er ikke tilgængelig");
      return res.json();
    })
    .then((data) => {
      if (data.status === "OK") {
        songListElem.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #1db954;">
            <h2>✅ Server Status: ${data.status}</h2>
            <p>${data.message}</p>
            <p><strong>Database:</strong> ${data.database}</p>
            <p><small>Sidste tjek: ${new Date(data.timestamp).toLocaleString('da-DK')}</small></p>
            <p style="margin-top: 2rem; color: #b3b3b3;">
              Din Spotify-klon starter template er klar til udvikling!
            </p>
          </div>
        `;
        // Efter OK health → hent sange
        loadSongs();
      } else {
        setError(`Server fejl: ${data.message}`);
      }
    })
    .catch((err) => {
      setError("Kunne ikke forbinde til serveren: " + err.message);
      songListElem.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ff4c4c;">
          <h2>❌ Server ikke tilgængelig</h2>
          <p>Sørg for at backend serveren kører på http://localhost:3001</p>
        </div>
      `;
    })
    .finally(() => setLoader(false));
}

// Kør health check når siden loader
checkHealth();

// Modal funktionalitet (behold designet)
if (openUploadModalBtn && uploadModal && closeUploadModalBtn) {
  openUploadModalBtn.onclick = () => {
    uploadModal.classList.remove("hidden");
  };
  closeUploadModalBtn.onclick = () => {
    uploadModal.classList.add("hidden");
  };
  // Luk modal hvis man klikker udenfor modal-content
  uploadModal.onclick = (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.add("hidden");
    }
  };
}

// Hent og render sange
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

// Afspiller-kontrol
function playSong(index) {
  currentIndex = index;
  const s = songs[index];
  if (!s) return;

  // Fjern aktiv klasse fra alle kort
  document.querySelectorAll('.song-card').forEach(card => {
    card.classList.remove('active');
  });

  // Tilføj aktiv klasse til det aktuelle kort
  const currentCard = document.querySelector(`[data-index="${index}"]`)?.closest('.song-card');
  if (currentCard) {
    currentCard.classList.add('active');
  }

  audio.src = `${API_URL}${s.songPath}`;
  playerCover.src = `${API_URL}${s.coverPath}`;
  playerCover.style.display = "block";
  playerInfo.textContent = `${s.title} — ${s.artist}`;

  audio.play();
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

if (playPauseBtn) {
  playPauseBtn.addEventListener("click", togglePlay);
}

if (audio) {
  audio.addEventListener("play", () => {
    if (playIcon) playIcon.style.display = "none";
    if (pauseIcon) pauseIcon.style.display = "block";
  });
  audio.addEventListener("pause", () => {
    if (playIcon) playIcon.style.display = "block";
    if (pauseIcon) pauseIcon.style.display = "none";
  });
  audio.addEventListener("loadedmetadata", () => {
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
    if (seekBar) seekBar.max = Math.floor(audio.duration || 0);
  });
  audio.addEventListener("timeupdate", () => {
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (seekBar && !seekBar.matches(":active")) {
      seekBar.value = Math.floor(audio.currentTime || 0);
    }
  });
  audio.addEventListener("ended", () => {
    if (currentIndex < songs.length - 1) {
      playSong(currentIndex + 1);
    }
  });
}

if (seekBar) {
  seekBar.addEventListener("input", () => {
    if (!audio) return;
    audio.currentTime = Number(seekBar.value || 0);
  });
}

function formatTime(sec) {
  const s = Math.floor(sec || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// Upload ny sang
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(uploadForm);
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
      if (uploadModal) uploadModal.classList.add("hidden");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoader(false);
    }
  });
}

// Søgning
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = songs.filter(s =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
    renderSongs(filtered);
  });
}
