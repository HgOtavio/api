import jwt from 'jsonwebtoken';
import { openDB } from '../settingDB.js';

const SECRET_KEY = 'minha-chave-secreta';

function checkToken(req, res) {
  const headerAuth = req.headers['authorization'];
  if (!headerAuth) {
    res.status(401).json({ error: 'Token ausente. Envie Authorization: Bearer <token>.' });
    return false;
  }
  if (!headerAuth.startsWith('Bearer ')) {
    res.status(400).json({ error: "Formato inválido. Use 'Authorization: Bearer <token>'." });
    return false;
  }
  const jwtToken = headerAuth.split(' ')[1];
  if (!jwtToken || jwtToken.trim() === '') {
    res.status(400).json({ error: 'Token vazio. Envie após Bearer.' });
    return false;
  }
  try {
    const decoded = jwt.verify(jwtToken, SECRET_KEY);
    req.user = decoded;
    return true;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      res.status(403).json({ error: 'Token expirado. Faça login novamente.' });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(403).json({ error: 'Token inválido. Faça login novamente.' });
    } else {
      res.status(500).json({ error: 'Erro ao validar token.' });
    }
    return false;
  }
}

function checkMethod(req, res, expected) {
  if (req.method !== expected) {
    res.status(405).json({ error: `Método inválido. Use ${expected} nesta rota.` });
    return false;
  }
  return true;
}

export async function createTable(req, res) {
  if (!checkMethod(req, res, 'POST')) return;
  if (!checkToken(req, res)) return;
  try {
    const db = await openDB();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS person (
        id INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        email TEXT,
        address TEXT,
        phone VARCHAR(15)
      )
    `);
    res.json({ message: "Tabela 'person' criada (ou já existe)." });
  } catch {
    res.status(500).json({ error: 'Erro ao criar tabela.' });
  }
}

export async function insertPerson(req, res) {
  if (!checkMethod(req, res, 'POST')) return;
  if (!checkToken(req, res)) return;
  try {
    let persons = req.body;
    if (!Array.isArray(persons)) persons = [persons];

    const db = await openDB();
    const inserted = [];
    const duplicates = [];

    for (const person of persons) {
      if (!person.name || !person.age) continue;

      if (person.email) {
        const existing = await db.all('SELECT * FROM person WHERE email = ?', [person.email]);
        if (existing.length > 0) {
          duplicates.push({
            email: person.email,
            message: `Já existe um usuário com o e-mail ${person.email}.`,
            existingCount: existing.length
          });
          continue;
        }
      }

      await db.run(
        'INSERT INTO person (name, age, email, address, phone) VALUES (?,?,?,?,?)',
        [person.name, person.age, person.email, person.address, person.phone]
      );
      inserted.push(person);
    }

    if (duplicates.length > 0 && inserted.length === 0) {
      res.status(400).json({
        error: 'Alguns e-mails já existem no sistema.',
        duplicates,
        message: 'Deseja visualizar os usuários existentes? Envie com "viewExisting": true.'
      });
      return;
    }

    if (duplicates.length > 0 && inserted.length > 0) {
      res.json({
        message: 'Alguns registros foram inseridos, mas outros já existiam.',
        insertedCount: inserted.length,
        duplicates,
        inserted
      });
      return;
    }

    res.json({ message: `${inserted.length} pessoa(s) inserida(s) com sucesso!`, inserted });
  } catch {
    res.status(500).json({ error: 'Erro ao inserir pessoa(s).' });
  }
}

export async function updatePerson(req, res) {
  if (!checkMethod(req, res, 'PUT')) return;
  if (!checkToken(req, res)) return;
  try {
    let persons = req.body;
    if (!Array.isArray(persons)) persons = [persons];

    const db = await openDB();
    const updated = [];
    const notFound = [];
    const emailConflict = [];
    const errors = [];

    for (const person of persons) {
      try {
        if (person.id === undefined || person.id === null || person.id === '' || isNaN(person.id)) {
          errors.push({ person, error: "O campo 'id' é obrigatório e deve ser numérico." });
          continue;
        }

        if (person.email) {
          const existing = await db.all('SELECT * FROM person WHERE email = ? AND id != ?', [person.email, person.id]);
          if (existing.length > 0) {
            emailConflict.push({
              id: person.id,
              email: person.email,
              message: `O e-mail ${person.email} já pertence a outro usuário.`,
            });
            continue;
          }
        }

        const result = await db.run(
          'UPDATE person SET name=?, age=?, email=?, address=?, phone=? WHERE id=?',
          [person.name, person.age, person.email, person.address, person.phone, person.id]
        );

        if (result.changes === 0) {
          notFound.push(person.id);
          continue;
        }

        updated.push(person);
      } catch (err) {
        errors.push({ person, error: err.message });
      }
    }

    if (updated.length === 0 && (emailConflict.length > 0 || notFound.length > 0 || errors.length > 0)) {
      res.status(400).json({ message: 'Nenhuma atualização concluída.', emailConflict, notFound, errors });
      return;
    }

    res.json({
      message: 'Atualização concluída.',
      updatedCount: updated.length,
      updated,
      emailConflict,
      notFound,
      errors
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pessoa(s).', details: err.message });
  }
}


export async function selectPerson(req, res) {
  if (!checkMethod(req, res, 'GET')) return;
  if (!checkToken(req, res)) return;
  try {
    const { id, ids } = req.body;
    const db = await openDB();
    let data;

    if (id) {
      data = await db.all('SELECT * FROM person WHERE id = ?', [id]);
      if (data.length === 0) {
        res.status(404).json({ error: `Nenhuma pessoa encontrada com ID ${id}.` });
        return;
      }
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      data = await db.all(`SELECT * FROM person WHERE id IN (${placeholders})`, ids);

      const encontrados = data.map(p => p.id);
      const naoEncontrados = ids.filter(x => !encontrados.includes(x));

      if (data.length === 0) {
        res.status(404).json({ error: `Nenhuma pessoa encontrada com IDs: ${ids.join(', ')}.` });
        return;
      }

      res.json({
        message: 'Busca concluída.',
        encontrados: data.length,
        naoEncontrados: naoEncontrados.length > 0 ? naoEncontrados : null,
        data
      });
      return;
    } else {
      data = await db.all('SELECT * FROM person');
    }

    res.json({ message: 'Lista de pessoas carregada com sucesso!', data });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar pessoa(s).' });
  }
}



export async function deletePerson(req, res) {
  if (!checkMethod(req, res, 'DELETE')) return;
  if (!checkToken(req, res)) return;
  try {
    const { ids, confirm } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "Envie um array com pelo menos um ID para deletar." });
      return;
    }
    if (confirm !== true) {
      res.status(400).json({ message: `Confirme a exclusão enviando "confirm": true. IDs: ${ids.join(', ')}` });
      return;
    }
    const db = await openDB();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(`DELETE FROM person WHERE id IN (${placeholders})`, ids);
    if (result.changes === 0) {
      res.status(404).json({ error: `Nenhuma pessoa encontrada com IDs ${ids.join(', ')}.` });
      return;
    }
    res.json({ message: `${ids.length} pessoa(s) deletada(s) com sucesso!`, deletedIds: ids });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir pessoa(s).' });
  }
}

