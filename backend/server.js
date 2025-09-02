const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

const multer = require("multer");

// Multer konfiguration for fil uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath;
    if (file.fieldname === 'cover') {
      uploadPath = path.join(__dirname, 'covers');
    } else if (file.fieldname === 'song') {
      uploadPath = path.join(__dirname, 'songs');
    }

    // Opret mappe hvis den ikke findes
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generer unikt filnavn
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'cover') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Kun billedfiler er tilladt for covers'), false);
      }
    } else if (file.fieldname === 'song') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Kun lydfiler er tilladt for sange'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Swagger konfiguration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Musik M-O API",
      version: "1.0.0",
      description: "API til musik-applikation med sange, covers og metadata",
      contact: {
        name: "API Support",
        email: "support@musik-mo.dk"
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server"
      }
    ],
    components: {
      schemas: {
        Song: {
          type: "object",
          properties: {
            id: { type: "integer", description: "Unikt ID for sangen" },
            title: { type: "string", description: "Sangens titel" },
            artist: { type: "string", description: "Kunstneren der har lavet sangen" },
            coverPath: { type: "string", description: "Sti til cover billedet" },
            songPath: { type: "string", description: "Sti til sangfilen" },
            createdAt: { type: "string", format: "date-time", description: "Tidspunkt for oprettelse" },
            updatedAt: { type: "string", format: "date-time", description: "Tidspunkt for sidste opdatering" }
          },
          required: ["id", "title", "artist", "coverPath", "songPath"]
        }
      }
    }
  },
  apis: ["./server.js"]
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// Hjælpefunktioner
function loadSongsFromFile() {
  const songsPath = path.join(__dirname, "data", "songs.json");
  try {
    const data = fs.readFileSync(songsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

app.use(cors());
app.use(express.json());

// Servér statiske filer (covers og sange)
app.use('/covers', express.static(path.join(__dirname, 'covers')));
app.use('/songs', express.static(path.join(__dirname, 'songs')));

// Healthcheck endpoint - tjekker om serveren kører og om songs.json findes
app.get("/api/health", (req, res) => {
  const songsPath = path.join(__dirname, "data", "songs.json");
  
  try {
    // Tjek om songs.json findes
    const fileExists = fs.existsSync(songsPath);
    
    if (fileExists) {
      // Prøv at læse filen for at sikre den er valid JSON
      const data = fs.readFileSync(songsPath, "utf8");
      JSON.parse(data); // Dette vil kaste en fejl hvis JSON ikke er valid
      
      res.json({
        status: "OK",
        message: "Server kører og songs.json er tilgængelig",
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } else {
      res.status(503).json({
        status: "ERROR",
        message: "songs.json filen findes ikke",
        timestamp: new Date().toISOString(),
        database: "disconnected"
      });
    }
  } catch (error) {
    res.status(503).json({
      status: "ERROR",
      message: "Fejl ved læsning af songs.json: " + error.message,
      timestamp: new Date().toISOString(),
      database: "error"
    });
  }
});

/**
 * @swagger
 * /api/songs:
 *   get:
 *     summary: Hent alle sange
 *     description: Returnerer alle sange fra databasen med metadata
 *     tags: [Songs]
 *     responses:
 *       200:
 *         description: Liste over alle sange
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 songs:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Song' }
 */
app.get("/api/songs", (req, res) => {
  try {
    const songs = loadSongsFromFile();

    res.json({
      success: true,
      count: songs.length,
      songs: songs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fejl ved læsning af sange: " + error.message
    });
  }
});

/**
 * @swagger
 * /api/songs:
 *   post:
 *     summary: Opret en ny sang
 *     description: Opretter en ny sang med cover og lydfil
 *     tags: [Songs]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, description: "Sangens titel" }
 *               artist: { type: string, description: "Kunstneren der har lavet sangen" }
 *               cover: { type: string, format: binary, description: "Cover billede" }
 *               song: { type: string, format: binary, description: "Lydfil" }
 *     responses:
 *       201:
 *         description: Sang oprettet succesfuldt
 */
app.post("/api/songs", upload.fields([
  { name: 'cover', maxCount: 1 },
  { name: 'song', maxCount: 1 }
]), (req, res) => {
  try {
    const { title, artist } = req.body;

    if (!title || !artist) {
      return res.status(400).json({
        success: false,
        message: "Titel og kunstner er påkrævet"
      });
    }

    if (!req.files || !req.files.cover || !req.files.song) {
      return res.status(400).json({
        success: false,
        message: "Både cover og lydfil er påkrævet"
      });
    }

    const songs = loadSongsFromFile();
    const newId = songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 1;
    const now = new Date().toISOString();

    const newSong = {
      id: newId,
      title: title,
      artist: artist,
      coverPath: `/covers/${req.files.cover[0].filename}`,
      songPath: `/songs/${req.files.song[0].filename}`,
      createdAt: now,
      updatedAt: now
    };

    songs.push(newSong);

    // Gem til fil
    const songsPath = path.join(__dirname, "data", "songs.json");
    fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2));

    res.status(201).json({
      success: true,
      song: newSong
    });
  } 
  catch (error) {
    res.status(500).json({
      success: false,
      message: "Fejl ved oprettelse af sang: " + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveren kører på http://localhost:${PORT}`);
  console.log(`Health check tilgængelig på: http://localhost:${PORT}/api/health`);
  // CONSOLE TO ACCESS Swagger UI
  console.log(`Swagger UI tilgængelig på: http://localhost:${PORT}/api-docs`);
});

