require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_changez_moi';
const BASE_URL = process.env.BASE_URL || ('http://localhost:' + PORT);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// Servir les fichiers statiques (HTML, CSS, JS) depuis le dossier parent
app.use(express.static(path.join(__dirname, '..')));

// Fichier base de données utilisateurs (JSON)
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DATA02_FILE = path.join(DATA_DIR, 'data02.json');
const DATA02_LOCALITE_FILE = path.join(DATA_DIR, 'data02_localite.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  if (!fs.existsSync(DATA02_FILE)) fs.writeFileSync(DATA02_FILE, JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2));
  if (!fs.existsSync(DATA02_LOCALITE_FILE)) fs.writeFileSync(DATA02_LOCALITE_FILE, JSON.stringify({ type: 'FeatureCollection', features: [] }, null, 2));
}

function readUsers() {
  ensureDataDir();
  const raw = fs.readFileSync(USERS_FILE, 'utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeUsers(users) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

// Token de session simple (signé HMAC)
const crypto = require('crypto');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function createToken(payload) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const data = JSON.stringify({ ...payload, exp });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64url');
}

function verifyToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
    const check = crypto.createHmac('sha256', JWT_SECRET).update(decoded.data).digest('hex');
    if (check !== decoded.sig) return null;
    const payload = JSON.parse(decoded.data);
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Envoi email de confirmation (ou log si SMTP non configuré)
let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

function sendConfirmationEmail(mail, nomUtilisateur, token) {
  const confirmUrl = BASE_URL + '/api/confirm?token=' + encodeURIComponent(token);
  const html = `
    <p>Bonjour ${nomUtilisateur},</p>
    <p>Merci de vous être inscrit sur CartoPlateforme.</p>
    <p>Pour activer votre compte et pouvoir contribuer, cliquez sur le lien ci-dessous :</p>
    <p><a href="${confirmUrl}">${confirmUrl}</a></p>
    <p>Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.</p>
    <p>— L'équipe CartoPlateforme</p>
  `;
  if (transporter) {
    return transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: mail,
      subject: 'Confirmez votre inscription — CartoPlateforme',
      html
    });
  }
  console.log('--- Email de confirmation (SMTP non configuré) ---');
  console.log('À:', mail);
  console.log('Lien de confirmation:', confirmUrl);
  console.log('----------------------------------------');
  return Promise.resolve();
}

// ——— Routes API ———

// POST /api/register — Inscription
app.post('/api/register', async (req, res) => {
  const { nom_utilisateur, mail, mot_de_passe } = req.body || {};
  if (!nom_utilisateur || !mail || !mot_de_passe) {
    return res.status(400).json({ ok: false, message: 'Nom d\'utilisateur, mail et mot de passe requis.' });
  }
  const mailNorm = String(mail).trim().toLowerCase();
  const nomNorm = String(nom_utilisateur).trim();
  if (nomNorm.length < 2) {
    return res.status(400).json({ ok: false, message: 'Le nom d\'utilisateur doit faire au moins 2 caractères.' });
  }
  if (mot_de_passe.length < 6) {
    return res.status(400).json({ ok: false, message: 'Le mot de passe doit faire au moins 6 caractères.' });
  }

  const users = readUsers();
  if (users.some(u => u.mail.toLowerCase() === mailNorm)) {
    return res.status(400).json({ ok: false, message: 'Un compte existe déjà avec cette adresse email.' });
  }
  if (users.some(u => (u.nom_utilisateur || '').toLowerCase() === nomNorm.toLowerCase())) {
    return res.status(400).json({ ok: false, message: 'Ce nom d\'utilisateur est déjà pris.' });
  }

  const hash = await bcrypt.hash(String(mot_de_passe), 10);
  const confirmationToken = uuidv4();
  const user = {
    id: uuidv4(),
    nom_utilisateur: nomNorm,
    mail: mailNorm,
    passwordHash: hash,
    confirmed: false,
    confirmationToken,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);

  try {
    await sendConfirmationEmail(mailNorm, nomNorm, confirmationToken);
  } catch (err) {
    console.error('Erreur envoi email:', err);
    return res.status(500).json({ ok: false, message: 'Erreur lors de l\'envoi de l\'email de confirmation.' });
  }

  res.status(201).json({
    ok: true,
    message: 'Inscription réussie. Consultez votre boîte mail pour confirmer votre compte.'
  });
});

// GET /api/confirm — Confirmation par lien email
app.get('/api/confirm', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.redirect('/confirm.html?error=missing');
  }
  const users = readUsers();
  const index = users.findIndex(u => u.confirmationToken === token);
  if (index === -1) {
    return res.redirect('/confirm.html?error=invalid');
  }
  users[index].confirmed = true;
  users[index].confirmationToken = null;
  writeUsers(users);
  res.redirect('/confirm.html?success=1');
});

// POST /api/login — Connexion
app.post('/api/login', async (req, res) => {
  const { mail, mot_de_passe } = req.body || {};
  if (!mail || !mot_de_passe) {
    return res.status(400).json({ ok: false, message: 'Email et mot de passe requis.' });
  }
  const mailNorm = String(mail).trim().toLowerCase();
  const users = readUsers();
  const user = users.find(u => u.mail === mailNorm);
  if (!user) {
    return res.status(401).json({ ok: false, message: 'Email ou mot de passe incorrect.' });
  }
  const match = await bcrypt.compare(String(mot_de_passe), user.passwordHash);
  if (!match) {
    return res.status(401).json({ ok: false, message: 'Email ou mot de passe incorrect.' });
  }
  if (!user.confirmed) {
    return res.status(403).json({ ok: false, message: 'Veuillez confirmer votre adresse email (consultez votre boîte mail).' });
  }

  const token = createToken({ userId: user.id, email: user.mail });
  res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      nom_utilisateur: user.nom_utilisateur,
      mail: user.mail
    }
  });
});

// GET /api/me — Utilisateur courant (Authorization: Bearer <token>)
app.get('/api/me', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Non authentifié.' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ ok: false, message: 'Session expirée ou invalide.' });
  }
  const users = readUsers();
  const user = users.find(u => u.id === payload.userId);
  if (!user || !user.confirmed) {
    return res.status(401).json({ ok: false, message: 'Utilisateur introuvable ou non confirmé.' });
  }
  res.json({
    ok: true,
    user: {
      id: user.id,
      nom_utilisateur: user.nom_utilisateur,
      mail: user.mail
    }
  });
});

// ——— data02 (mairies contributions) et data02_localite (localités) — persistance serveur
function readJsonFile(filePath, defaultVal) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : defaultVal;
    }
  } catch (e) { console.warn('readJsonFile', filePath, e.message); }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/data02', (req, res) => {
  const defaultVal = { type: 'FeatureCollection', name: 'mairies-contributions', features: [] };
  const data = readJsonFile(DATA02_FILE, defaultVal);
  if (!data.features) data.features = [];
  res.json(data);
});

app.post('/api/data02', (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.features)) {
    return res.status(400).json({ ok: false, message: 'Format invalide' });
  }
  writeJsonFile(DATA02_FILE, data);
  res.json({ ok: true });
});

app.get('/api/data02-localite', (req, res) => {
  const defaultVal = { type: 'FeatureCollection', name: 'localites-contributions', features: [] };
  const data = readJsonFile(DATA02_LOCALITE_FILE, defaultVal);
  if (!data.features) data.features = [];
  res.json(data);
});

app.post('/api/data02-localite', (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.features)) {
    return res.status(400).json({ ok: false, message: 'Format invalide' });
  }
  writeJsonFile(DATA02_LOCALITE_FILE, data);
  res.json({ ok: true });
});

// Démarrage
ensureDataDir();
app.listen(PORT, () => {
  console.log('CartoPlateforme API + site sur http://localhost:' + PORT);
  if (!transporter) console.log('SMTP non configuré : les liens de confirmation seront affichés dans la console.');
});
