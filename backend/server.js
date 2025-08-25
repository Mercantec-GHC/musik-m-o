const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const PORT = 3001;

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
            id: {
              type: "integer",
              description: "Unikt ID for sangen"
            },
            title: {
              type: "string",
              description: "Sangens titel"
            },
            artist: {
              type: "string",
              description: "Kunstneren der har lavet sangen"
            },
            coverPath: {
              type: "string",
              description: "Sti til cover billedet"
            },
            songPath: {
              type: "string",
              description: "Sti til sangfilen"
            }
          },
          required: ["id", "title", "artist", "coverPath", "songPath"]
        },
        SongsResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean"
            },
            count: {
              type: "integer"
            },
            songs: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Song"
              }
            }
          }
        },
        SongResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean"
            },
            song: {
              $ref: "#/components/schemas/Song"
            }
          }
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean"
            },
            message: {
              type: "string"
            }
          }
        }
      }
    }
  },
  apis: ["./server.js"]
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Tjekker om serveren kører og om songs.json er tilgængelig
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server kører og database er tilgængelig
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Server kører og songs.json er tilgængelig"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   example: "connected"
 *       503:
 *         description: Server eller database fejl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
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
 *               $ref: '#/components/schemas/SongsResponse'
 *       500:
 *         description: Server fejl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/songs", (req, res) => {
  const songsPath = path.join(__dirname, "data", "songs.json");
  
  try {
    const data = fs.readFileSync(songsPath, "utf8");
    const songs = JSON.parse(data);
    
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
 * /api/songs/{id}:
 *   get:
 *     summary: Hent en specifik sang
 *     description: Returnerer en sang baseret på det angivne ID
 *     tags: [Songs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID på sangen der skal hentes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 1
 *     responses:
 *       200:
 *         description: Sang fundet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SongResponse'
 *       404:
 *         description: Sang ikke fundet
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server fejl
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get("/api/songs/:id", (req, res) => {
  const songsPath = path.join(__dirname, "data", "songs.json");
  const songId = parseInt(req.params.id);
  
  try {
    const data = fs.readFileSync(songsPath, "utf8");
    const songs = JSON.parse(data);
    
    const song = songs.find(s => s.id === songId);
    
    if (song) {
      res.json({
        success: true,
        song: song
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Sang med ID ${songId} blev ikke fundet`
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Fejl ved læsning af sange: " + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveren kører på http://localhost:${PORT}`);
  console.log(`Health check tilgængelig på: http://localhost:${PORT}/api/health`);
  console.log(`Alle sange tilgængelige på: http://localhost:${PORT}/api/songs`);
  console.log(`Specifik sang tilgængelig på: http://localhost:${PORT}/api/songs/:id`);
  console.log(`Swagger dokumentation tilgængelig på: http://localhost:${PORT}/api-docs`);
});
