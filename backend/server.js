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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'denonciation_rdc_secret_2025';

// ✅ CONFIGURATION RENDER.COM POSTGRESQL
const pool = new Pool({
  connectionString: "postgresql://denonciation_app_user:PHyAYKulWlMEHsS8Kly0Fcx5nhfxfcQV@dpg-d3n7bmeuk2gs73b6pubg-a.oregon-postgres.render.com/denonciation_app",
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Créer les dossiers
const uploadsDir = path.join(__dirname, 'uploads');
const codesDir = path.join(__dirname, 'verification-codes');

function initializeDirectories() {
  [uploadsDir, codesDir].forEach(dir => {
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

// Génération de code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ FONCTION POUR GÉNÉRER UN NOUVEAU CODE POUR LA RECONNEXION
async function generateReconnectCode(phoneNumber) {
  try {
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Mettre à jour l'utilisateur avec le nouveau code
    await pool.query(
      `UPDATE users SET 
        last_verification_code = $1, 
        last_code_expires = $2 
       WHERE phone_number = $3`,
      [verificationCode, expiresAt, phoneNumber]
    );

    // Sauvegarder le code
    const userResult = await pool.query(
      'SELECT username FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    if (userResult.rows.length > 0) {
      const username = userResult.rows[0].username;
      saveVerificationCode(phoneNumber, verificationCode, username);
    }

    console.log(`📱 Nouveau code pour ${phoneNumber}: ${verificationCode}`);
    return verificationCode;
  } catch (error) {
    console.error('❌ Erreur génération code reconnexion:', error);
    throw error;
  }
}

// FONCTION POUR SAUVEGARDER LES CODES
function saveVerificationCode(phoneNumber, code, username) {
  try {
    const codeData = {
      phoneNumber,
      code: code,
      username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      type: 'reconnection'
    };

    const codeFile = path.join(codesDir, `${phoneNumber}_${Date.now()}.json`);
    fs.writeFileSync(codeFile, JSON.stringify(codeData, null, 2));
    
    console.log(`💾 Code sauvegardé: ${codeFile}`);
    return codeFile;
  } catch (error) {
    console.error('❌ Erreur sauvegarde code:', error);
    return null;
  }
}

// FONCTION POUR LISTER LES CODES
function listVerificationCodes() {
  try {
    if (!fs.existsSync(codesDir)) {
      return [];
    }

    const files = fs.readdirSync(codesDir)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(codesDir, a));
        const statB = fs.statSync(path.join(codesDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    const codes = files.map(file => {
      const filePath = path.join(codesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const codeData = JSON.parse(content);
      return {
        file,
        ...codeData,
        filePath: filePath
      };
    });

    return codes;
  } catch (error) {
    console.error('❌ Erreur liste codes:', error);
    return [];
  }
}

// FONCTIONS POUR L'ACCÈS DISTANT
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

// ✅ ROUTE POUR TESTER LA CONNEXION RENDER
app.get('/api/test-render-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db, current_user as user');
    res.json({ 
      status: '✅ CONNECTÉ À RENDER POSTGRESQL',
      database: result.rows[0].db,
      user: result.rows[0].user,
      time: result.rows[0].time,
      connection: 'Active et fonctionnelle'
    });
  } catch (error) {
    res.status(500).json({ 
      status: '❌ ERREUR CONNEXION RENDER',
      error: error.message,
      details: 'Vérifiez les paramètres de connexion'
    });
  }
});

// 🚨 ROUTE TEMPORAIRE POUR CRÉER LES TABLES - À SUPPRIMER APRÈS
app.get('/api/create-tables', async (req, res) => {
  try {
    console.log('🚀 Début de la création des tables...');
    
    // Table users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        verification_code VARCHAR(10),
        verification_code_expires TIMESTAMP,
        last_verification_code VARCHAR(10),
        last_code_expires TIMESTAMP,
        is_verified BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table users créée');

    // Table denunciation_types
    await pool.query(`
      CREATE TABLE IF NOT EXISTS denunciation_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        color VARCHAR(7) DEFAULT '#3498db',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table denunciation_types créée');

    // Insert types
    await pool.query(`
      INSERT INTO denunciation_types (name, color) VALUES 
      ('corruption', '#e74c3c'),
      ('viol', '#9b59b6'),
      ('vole', '#f39c12'),
      ('arrestation_arbitraire', '#34495e'),
      ('agressions', '#e67e22'),
      ('enlevement', '#c0392b'),
      ('autres', '#95a5a6')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Types de violations insérés');

    // Table posts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type_id INTEGER REFERENCES denunciation_types(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        evidence_url VARCHAR(500),
        evidence_type VARCHAR(20),
        file_size INTEGER,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_name VARCHAR(255),
        is_approved BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table posts créée');

    // Table comments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id),
        user_id INTEGER REFERENCES users(id),
        parent_comment_id INTEGER REFERENCES comments(id),
        content TEXT NOT NULL,
        evidence_url VARCHAR(500),
        evidence_type VARCHAR(20),
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table comments créée');

    // Table contacts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table contacts créée');

    console.log('🎉 TOUTES LES TABLES CRÉÉES AVEC SUCCÈS !');
    
    res.json({ 
      success: true, 
      message: '🎉 Tables créées avec succès ! L\'application va fonctionner maintenant.' 
    });
    
  } catch (error) {
    console.error('❌ Erreur création tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ✅ ROUTE POUR LA PAGE DE PARTAGE
app.get('/api/share-info', (req, res) => {
  const networkIPs = getNetworkIPs();
  
  const urls = networkIPs.map(ip => `http://${ip.address}:${PORT}`);
  urls.unshift(`http://localhost:${PORT}`);

  const primaryIP = networkIPs[0]?.address || 'localhost';

  res.json({
    localIPs: networkIPs,
    urls: urls,
    port: PORT,
    status: 'online',
    primaryUrl: `http://${primaryIP}:${PORT}`,
    qrCodeUrl: `http://${primaryIP}:${PORT}/share`,
    mobileInstallUrl: `http://${primaryIP}:${PORT}/install`,
    shareMessage: `Rejoignez Dénonciation RDC: http://${primaryIP}:${PORT}`,
    timestamp: new Date().toISOString()
  });
});

// ROUTES DE L'API

// ✅ NOUVELLE ROUTE POUR LA DEMANDE DE RECONNEXION
app.post('/api/request-reconnect', async (req, res) => {
  console.log('🔐 DEMANDE DE RECONNEXION:', req.body);
  
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Numéro de téléphone requis' });
  }

  try {
    // Vérifier si l'utilisateur existe
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE phone_number = $1',
      [phoneNumber]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Numéro non enregistré' });
    }

    // Générer un nouveau code de reconnexion
    const verificationCode = await generateReconnectCode(phoneNumber);
    const username = userResult.rows[0].username;

    console.log(`✅ Code de reconnexion envoyé à ${username}: ${verificationCode}`);

    res.json({ 
      success: true, 
      message: 'Nouveau code de vérification envoyé',
      code: verificationCode,
      username: username
    });

  } catch (error) {
    console.error('❌ Erreur demande reconnexion:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du code' });
  }
});

// ✅ ROUTE AMÉLIORÉE POUR LA CONNEXION (support anciens utilisateurs)
app.post('/api/verify', async (req, res) => {
  console.log('🔐 TENTATIVE DE CONNEXION:', req.body);
  
  const { phoneNumber, code } = req.body;

  try {
    // Essayer d'abord avec le code de reconnexion
    let result = await pool.query(
      `SELECT * FROM users 
       WHERE phone_number = $1 AND last_verification_code = $2 AND last_code_expires > NOW()`,
      [phoneNumber, code]
    );

    // Si échec, essayer avec l'ancien système
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

    // Marquer comme vérifié et nettoyer les codes
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

// ✅ ROUTES POUR LES COMMENTAIRES

// Récupérer les commentaires d'une publication
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username,
        (SELECT COUNT(*) FROM comments rc WHERE rc.parent_comment_id = c.id) as reply_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1 AND c.parent_comment_id IS NULL
      ORDER BY c.created_at DESC
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur chargement commentaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les réponses à un commentaire
app.get('/api/comments/:id/replies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.parent_comment_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur chargement réponses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ajouter un commentaire
app.post('/api/comments', authenticateToken, upload.single('evidence'), async (req, res) => {
  console.log('💬 NOUVEAU COMMENTAIRE');
  
  const { postId, content, parentCommentId } = req.body;

  if (!postId || !content) {
    return res.status(400).json({ error: 'Publication et contenu requis' });
  }

  try {
    let evidenceUrl = null;
    let evidenceType = null;
    let fileSize = null;

    if (req.file) {
      evidenceUrl = `/uploads/${req.file.filename}`;
      fileSize = req.file.size;
      
      if (req.file.mimetype.startsWith('image/')) evidenceType = 'image';
      else if (req.file.mimetype.startsWith('video/')) evidenceType = 'video';
      else evidenceType = 'document';
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, parent_comment_id, content, evidence_url, evidence_type, file_size) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        postId, 
        req.user.userId, 
        parentCommentId || null, 
        content,
        evidenceUrl,
        evidenceType,
        fileSize
      ]
    );

    // Récupérer les infos complètes du commentaire
    const commentWithUser = await pool.query(`
      SELECT c.*, u.username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    // Notifier via Socket.io
    io.emit('newComment', {
      ...commentWithUser.rows[0],
      reply_count: 0
    });

    console.log(`✅ Commentaire ajouté par ${req.user.username}`);

    res.json({ 
      success: true, 
      comment: commentWithUser.rows[0]
    });

  } catch (error) {
    console.error('❌ Erreur ajout commentaire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire' });
  }
});

// ROUTES EXISTANTES
app.get('/api/network-info', (req, res) => {
  const networkIPs = getNetworkIPs();
  
  const urls = networkIPs.map(ip => `http://${ip.address}:${PORT}`);
  urls.unshift(`http://localhost:${PORT}`);

  const primaryIP = networkIPs[0]?.address || 'localhost';

  res.json({
    localIPs: networkIPs,
    urls: urls,
    port: PORT,
    status: 'online',
    primaryUrl: `http://${primaryIP}:${PORT}`,
    qrCodeUrl: `http://${primaryIP}:${PORT}/share`,
    mobileInstallUrl: `http://${primaryIP}:${PORT}/install`,
    shareMessage: `Rejoignez Dénonciation RDC: http://${primaryIP}:${PORT}`,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug/codes', (req, res) => {
  const codes = listVerificationCodes();
  
  res.json({
    total: codes.length,
    codesDir: codesDir,
    codes: codes.map(code => ({
      phoneNumber: code.phoneNumber,
      username: code.username,
      code: code.code,
      createdAt: code.createdAt,
      file: code.file
    }))
  });
});

app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      username: req.user.username,
      userId: req.user.userId
    }
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      status: '✅ BASE DE DONNÉES CONNECTÉE',
      time: result.rows[0].time
    });
  } catch (error) {
    res.status(500).json({ 
      status: '❌ ERREUR BASE DE DONNÉES',
      error: error.message 
    });
  }
});

// INSCRIPTION
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

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const insertResult = await pool.query(
      'INSERT INTO users (phone_number, username, verification_code, verification_code_expires) VALUES ($1, $2, $3, $4) RETURNING id',
      [phoneNumber, username, verificationCode, expiresAt]
    );

    const savedFile = saveVerificationCode(phoneNumber, verificationCode, username);

    console.log(`✅ UTILISATEUR CRÉÉ: ${username}`);
    console.log(`📱 CODE DE VÉRIFICATION: ${verificationCode}`);

    res.json({ 
      success: true, 
      message: 'Code de vérification généré avec succès',
      code: verificationCode
    });

  } catch (error) {
    console.error('❌ ERREUR INSCRIPTION:', error);
    res.status(500).json({ 
      error: 'Erreur technique',
      details: error.message 
    });
  }
});

// Récupérer les publications (améliorée avec compteur de commentaires)
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

// Créer une publication
app.post('/api/posts', authenticateToken, upload.single('evidence'), async (req, res) => {
  console.log('📮 NOUVEAU SIGNALEMENT REÇU');
  
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

    const postResult = await pool.query(
      `INSERT INTO posts (user_id, type_id, title, description, evidence_url, evidence_type, file_size, latitude, longitude, location_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
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
        locationName || null
      ]
    );

    console.log(`✅ SIGNALEMENT PUBLIÉ: "${title}" par ${req.user.username}`);

    res.json({ 
      success: true, 
      post: postResult.rows[0],
      message: 'Signalement publié avec succès'
    });

  } catch (error) {
    console.error('❌ ERREUR PUBLICATION:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la publication' });
  }
});

// ✅ ROUTE POUR LES STATISTIQUES
app.get('/api/statistics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT dt.name, dt.color, COUNT(p.id) as count
      FROM denunciation_types dt
      LEFT JOIN posts p ON dt.id = p.type_id AND p.is_approved = TRUE
      GROUP BY dt.id, dt.name, dt.color
      ORDER BY count DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur chargement statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ ROUTE POUR LES CONTACTS
app.post('/api/contact', async (req, res) => {
  console.log('📧 NOUVEAU MESSAGE DE CONTACT:', req.body);
  
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO contacts (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, subject, message]
    );

    console.log(`✅ MESSAGE DE CONTACT ENREGISTRÉ: ${subject}`);

    res.json({ 
      success: true, 
      message: 'Message envoyé avec succès'
    });

  } catch (error) {
    console.error('❌ ERREUR ENVOI MESSAGE:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

// Routes principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/share', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/share.html'));
});

app.get('/install', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/mobile-install.html'));
});

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('🔌 UTILISATEUR CONNECTÉ:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 UTILISATEUR DÉCONNECTÉ:', socket.id);
  });
});

// Démarrer le serveur
server.listen(PORT, '0.0.0.0', () => {
  const networkIPs = getNetworkIPs();
  
  console.log('='.repeat(70));
  console.log('🚀 DÉNONCIATION RDC - SERVEUR RENDER.COM DÉMARRÉ');
  console.log('='.repeat(70));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🏠 Local: http://localhost:${PORT}`);
  console.log(`🗄️  Base de données: Render PostgreSQL`);
  console.log(`🔗 URL DB: denonciation_app sur Render`);
  
  if (networkIPs.length > 0) {
    networkIPs.forEach(ip => {
      console.log(`📡 Réseau: http://${ip.address}:${PORT} (${ip.interface})`);
    });
  }
  
  console.log('='.repeat(70));
  console.log('🆕 FONCTIONNALITÉS DISPONIBLES:');
  console.log('   🔐 Reconnexion pour anciens utilisateurs');
  console.log('   💬 Système de commentaires complet');
  console.log('   📎 Médias dans les commentaires');
  console.log('   🔄 Réponses aux commentaires');
  console.log('   🌐 Base de données Render PostgreSQL');
  console.log('='.repeat(70));
  console.log('✅ PRÊT POUR LES CONNEXIONS!');
  console.log('='.repeat(70));
});