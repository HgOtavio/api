import jwt from 'jsonwebtoken';
import { openDB } from '../settingDB.js';

const SECRET_KEY = 'minha-chave-secreta';

export function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Token ausente. Faça login.' });

  try {
    const jwtToken = token.split(' ')[1];
    const decoded = jwt.verify(jwtToken, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}

export async function createUserTable(req, res) {
  try {
    const db = await openDB();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);
    res.json({ message: "Tabela 'users' criada (ou já existe)." });
  } catch {
    res.status(500).json({ error: 'Erro ao criar tabela de usuários.' });
  }
}

export async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Preencha nome, email e senha.' });

    const db = await openDB();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ error: 'Email já cadastrado.' });

    const result = await db.run(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    );

    const userId = result.lastID;
    const token = jwt.sign({ id: userId, email }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ message: 'Usuário cadastrado com sucesso!', token });
  } catch {
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
}

export async function updateUser(req, res) {
  try {
    const { name, password } = req.body;
    if (!name && !password)
      return res.status(400).json({ error: 'Informe nome ou senha para atualizar.' });

    const db = await openDB();
    await db.run('UPDATE users SET name=?, password=? WHERE id=?', [name, password, req.user.id]);
    res.json({ message: 'Dados atualizados com sucesso!' });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
}

export async function deleteUser(req, res) {
  try {
    const db = await openDB();
    await db.run('DELETE FROM users WHERE id=?', [req.user.id]);
    res.json({ message: 'Usuário deletado com sucesso!' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar usuário.' });
  }
}
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Informe email e senha.' });

    const db = await openDB();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas.' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: 'Login bem-sucedido!', token });
  } catch {
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
}
