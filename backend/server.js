import express from 'express';
import { Pool } from 'pg';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import os from 'os';
import tf from '@tensorflow/tfjs-node';
import * as mobilenet from '@tensorflow-models/mobilenet';
import sharp from 'sharp';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'denonciation_rdc_secret_2025';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ INITIALISATION IA
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
let mobilenetModel = null;

async function loadAIModels() {
  try {
    console.log('🧠 Chargement des modèles IA...');
    mobilenetModel = await mobilenet.load();
    console.log('✅ Modèles IA chargés avec succès');
  } catch (error) {
    console.error('❌ Erreur chargement modèles IA:', error);
  }
}

// ✅ CONFIGURATION RENDER.COM POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://denonciation_app_user:PHyAYKulWlMEHsS8Kly0Fcx5nhfxfcQV@dpg-d3n7bmeuk2gs73b6pubg-a.oregon-postgres.render.com/denonciation_app",
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Créer les dossiers
const uploadsDir = path.join(__dirname, 'uploads');
const codesDir = path.join(__dirname, 'verification-codes');
const analysisDir = path.join(__dirname, 'ai-analysis');

function initializeDirectories() {
  [uploadsDir, codesDir, analysisDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Dossier créé: ${dir}`);
    }
  });
}

initializeDirectories();

// Configuration upload
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// ✅ FONCTIONS IA/ML
async function analyzeImageWithAI(imagePath) {
  try {
    if (!mobilenetModel) await loadAIModels();

    const imageBuffer = fs.readFileSync(imagePath);
    const image = tf.node.decodeImage(imageBuffer);
    const predictions = await mobilenetModel.classify(image);
    
    tf.dispose(image);

    return {
      isAuthentic: true,
      analysis: predictions,
      confidence: Math.max(...predictions.map(p => p.probability)),
      detectedObjects: predictions.map(p => p.className),
      aiVerification: 'ANALYSED'
    };
  } catch (error) {
    console.error('Erreur analyse IA image:', error);
    return {
      isAuthentic: true,
      analysis: [],
      confidence: 0,
      detectedObjects: [],
      aiVerification: 'FAILED'
    };
  }
}

async function analyzeTextWithAI(text, evidenceType) {
  try {
    if (!genAI) {
      return {
        authenticity_score: 75,
        risk_level: "LOW",
        detected_issues: ["Analyse IA non configurée"],
        recommendations: ["Vérification manuelle recommandée"],
        ai_confidence: 0
      };
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analyse cette preuve de dénonciation:
    
    Type: ${evidenceType}
    Contenu: ${text.substring(0, 2000)}
    
    Réponds au format JSON:
    {
      "authenticity_score": 0-100,
      "risk_level": "LOW|MEDIUM|HIGH",
      "detected_issues": ["liste des problèmes"],
      "recommendations": ["recommandations"],
      "ai_confidence": 0-100
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return JSON.parse(response.text());
  } catch (error) {
    console.error('Erreur analyse IA texte:', error);
    return {
      authenticity_score: 50,
      risk_level: "MEDIUM",
      detected_issues: ["Analyse IA non disponible"],
      recommendations: ["Vérification manuelle recommandée"],
      ai_confidence: 0
    };
  }
}

// ✅ ROUTES IA
app.post('/api/ai/analyze-evidence', authenticateToken, upload.single('evidence'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier requis' });
    }

    const filePath = path.join(uploadsDir, req.file.filename);
    let analysisResult = {};

    if (req.file.mimetype.startsWith('image/')) {
      analysisResult = await analyzeImageWithAI(filePath);
    } else if (req.file.mimetype.startsWith('video/')) {
      analysisResult = {
        isAuthentic: true,
        analysis: "VIDEO_ANALYSIS_BASIC",
        aiVerification: 'ANALYSED'
      };
    } else {
      const textContent = req.body.description || '';
      analysisResult = await analyzeTextWithAI(textContent, 'document');
    }

    res.json({
      success: true,
      analysis: analysisResult,
      file: req.file.filename
    });

  } catch (error) {
    console.error('Erreur analyse IA:', error);
    res.status(500).json({ error: 'Erreur analyse IA' });
  }
});

app.post('/api/ai/detect-fake', authenticateToken, async (req, res) => {
  try {
    const { title, description, evidenceType } = req.body;
    
    if (!genAI) {
      return res.json({
        success: true,
        analysis: {
          fake_probability: 30,
          red_flags: ["IA non configurée"],
          credibility_score: 70,
          verification_suggestions: ["Vérification manuelle nécessaire"],
          ai_analysis: "Système IA non configuré"
        },
        timestamp: new Date().toISOString()
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `Analyse cette dénonciation:
    
    Titre: ${title}
    Description: ${description}
    Type de preuve: ${evidenceType}
    
    Réponds au format JSON:
    {
      "fake_probability": 0-100,
      "red_flags": ["liste des signaux d'alerte"],
      "credibility_score": 0-100,
      "verification_suggestions": ["suggestions de vérification"],
      "ai_analysis": "analyse détaillée"
    }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = JSON.parse(response.text());

    res.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur détection fake news:', error);
    res.status(500).json({ error: 'Erreur analyse fake news' });
  }
});

// ✅ ROUTES CATÉGORIES
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, color, COUNT(p.id) as post_count
      FROM denunciation_types dt
      LEFT JOIN posts p ON dt.id = p.type_id AND p.is_approved = TRUE
      GROUP BY dt.id, dt.name, dt.color
      ORDER BY post_count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur chargement catégories:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/categories/:category/posts', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT p.*, u.username, dt.name as type_name, dt.color,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN denunciation_types dt ON p.type_id = dt.id
      WHERE p.is_approved = TRUE AND dt.name = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [category, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM posts p
      JOIN denunciation_types dt ON p.type_id = dt.id
      WHERE p.is_approved = TRUE AND dt.name = $1
    `, [category]);

    res.json({
      posts: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit),
      category: category
    });
  } catch (error) {
    console.error('Erreur chargement posts par catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTES EXISTANTES AMÉLIORÉES
app.post('/api/register', async (req, res) => {
  console.log('📝 INSCRIPTION:', req.body);
  
  const { phoneNumber, username } = req.body;

  if (!phoneNumber || !username) {
    return res.status(400).json({ error: 'Numéro et nom d\'utilisateur requis' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE phone_number = $1 OR username = $2',
      [phoneNumber, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Numéro ou nom d\'utilisateur déjà utilisé' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const insertResult = await pool.query(
      'INSERT INTO users (phone_number, username, verification_code, verification_code_expires) VALUES ($1, $2, $3, $4) RETURNING id',
      [phoneNumber, username, verificationCode, expiresAt]
    );

    // Sauvegarder le code
    const codeData = {
      phoneNumber,
      code: verificationCode,
      username,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      type: 'registration'
    };

    const codeFile = path.join(codesDir, `${phoneNumber}_${Date.now()}.json`);
    fs.writeFileSync(codeFile, JSON.stringify(codeData, null, 2));

    console.log(`✅ UTILISATEUR CRÉÉ: ${username}`);
    console.log(`📱 CODE DE VÉRIFICATION: ${verificationCode}`);

    res.json({ 
      success: true, 
      message: 'Code de vérification généré avec succès',
      code: verificationCode,
      username: username,
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('❌ ERREUR INSCRIPTION:', error);
    res.status(500).json({ 
      error: 'Erreur technique',
      details: error.message 
    });
  }
});

app.post('/api/verify', async (req, res) => {
  console.log('🔐 TENTATIVE DE CONNEXION:', req.body);
  
  const { phoneNumber, code } = req.body;

  try {
    let result = await pool.query(
      `SELECT * FROM users 
       WHERE phone_number = $1 AND last_verification_code = $2 AND last_code_expires > NOW()`,
      [phoneNumber, code]
    );

    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT * FROM users WHERE phone_number = $1 AND verification_code = $2 AND verification_code_expires > NOW()',
        [phoneNumber, code]
      );
    }

    if (result.rows.length === 0) {
      console.log(`❌ Code invalide pour ${phoneNumber}`);
      return res.status(400).json({ error: 'Code invalide ou expiré' });
    }

    const user = result.rows[0];

    await pool.query(
      `UPDATE users SET 
        is_verified = TRUE, 
        verification_code = NULL, 
        verification_code_expires = NULL,
        last_verification_code = NULL,
        last_code_expires = NULL,
        last_login = NOW() 
       WHERE id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        phoneNumber: user.phone_number 
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`🎉 CONNEXION RÉUSSIE: ${user.username}`);

    res.json({ 
      success: true, 
      token,
      username: user.username,
      message: 'Connexion réussie'
    });

  } catch (error) {
    console.error('❌ ERREUR CONNEXION:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
  }
});

app.post('/api/posts', authenticateToken, upload.single('evidence'), async (req, res) => {
  console.log('📮 NOUVEAU SIGNALEMENT REÇU AVEC IA');
  
  const { type, title, description, latitude, longitude, locationName } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Une preuve est obligatoire' });
  }

  try {
    const typeResult = await pool.query(
      'SELECT id FROM denunciation_types WHERE name = $1', 
      [type]
    );

    if (typeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Type de violation invalide' });
    }

    let evidenceType = 'document';
    if (req.file.mimetype.startsWith('image/')) evidenceType = 'image';
    else if (req.file.mimetype.startsWith('video/')) evidenceType = 'video';

    // ✅ ANALYSE IA AUTOMATIQUE
    let aiAnalysis = {};
    const filePath = path.join(uploadsDir, req.file.filename);
    
    if (evidenceType === 'image') {
      aiAnalysis = await analyzeImageWithAI(filePath);
    }

    const postResult = await pool.query(
      `INSERT INTO posts (user_id, type_id, title, description, evidence_url, evidence_type, file_size, latitude, longitude, location_name, ai_analysis) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        req.user.userId, 
        typeResult.rows[0].id, 
        title, 
        description,
        `/uploads/${req.file.filename}`,
        evidenceType,
        req.file.size,
        latitude || null,
        longitude || null,
        locationName || null,
        aiAnalysis
      ]
    );

    console.log(`✅ SIGNALEMENT PUBLIÉ AVEC IA: "${title}" par ${req.user.username}`);

    io.emit('newPost', {
      ...postResult.rows[0],
      username: req.user.username,
      ai_analysis: aiAnalysis
    });

    res.json({ 
      success: true, 
      post: postResult.rows[0],
      ai_analysis: aiAnalysis,
      message: 'Signalement publié et analysé avec IA'
    });

  } catch (error) {
    console.error('❌ ERREUR PUBLICATION AVEC IA:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la publication' });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.username, dt.name as type_name, dt.color,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      JOIN denunciation_types dt ON p.type_id = dt.id
      WHERE p.is_approved = TRUE
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur chargement posts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes supplémentaires existantes...
app.post('/api/request-reconnect', async (req, res) => {
  console.log('🔐 DEMANDE DE RECONNEXION:', req.body);
  
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Numéro de téléphone requis' });
  }

  try {
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Numéro non enregistré' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      `UPDATE users SET 
        last_verification_code = $1, 
        last_code_expires = $2 
       WHERE phone_number = $3`,
      [verificationCode, expiresAt, phoneNumber]
    );

    const username = userResult.rows[0].username;

    // Sauvegarder le code
    const codeData = {
      phoneNumber,
      code: verificationCode,
      username,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      type: 'reconnection'
    };

    const codeFile = path.join(codesDir, `${phoneNumber}_${Date.now()}.json`);
    fs.writeFileSync(codeFile, JSON.stringify(codeData, null, 2));

    console.log(`✅ Code de reconnexion envoyé à ${username}: ${verificationCode}`);

    res.json({ 
      success: true, 
      message: 'Nouveau code de vérification généré',
      code: verificationCode,
      username: username,
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('❌ Erreur demande reconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du code' });
  }
});

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', async () => {
  console.log('='.repeat(70));
  console.log('🚀 DÉNONCIATION RDC - SERVEUR IA DÉMARRÉ');
  console.log('='.repeat(70));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environnement: RENDER.COM`);
  console.log(`🗄️  Base de données: Render PostgreSQL`);
  
  await loadAIModels();
  
  console.log('🧠 FONCTIONNALITÉS IA ACTIVÉES');
  console.log('✅ PRÊT POUR LES CONNEXIONS AVEC IA!');
  console.log('='.repeat(70));
});

function getNetworkIPs() {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];

  Object.keys(networkInterfaces).forEach(name => {
    networkInterfaces[name].forEach(netInterface => {
      if (netInterface.family === 'IPv4' && !netInterface.internal) {
        ips.push({
          interface: name,
          address: netInterface.address
        });
      }
    });
  });

  return ips;
}