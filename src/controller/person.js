import { openDB } from '../settingDB.js';

export async function createTable(req, res) {
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
    console.log("Tabela 'person' criada (ou já existe).");
    return res?.json({ message: "Tabela 'person' criada (ou já existe)." });
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
    if (res) res.status(500).json({ error: 'Erro ao criar tabela.' });
    throw error;
  }
}

export async function insertPerson(req, res) {
  try {
    const person = req.body;
    if (!person.name || !person.age) {
      return res.status(400).json({
        error: "Os campos 'name' e 'age' são obrigatórios."
      });
    }

    const db = await openDB();
    await db.run(
      'INSERT INTO person (name, age, email, address, phone) VALUES (?,?,?,?,?)',
      [person.name, person.age, person.email, person.address, person.phone]
    );

    console.log('Pessoa inserida com sucesso!');
    return res.json({
      message: 'Pessoa inserida com sucesso!',
      data: person
    });
  } catch (error) {
    console.error('Erro ao inserir pessoa:', error);
    res.status(500).json({ error: 'Erro ao inserir pessoa.' });
    throw error;
  }
}

export async function updatePerson(req, res) {
  try {
    const person = req.body;
    if (!person.id) {
      return res.status(400).json({
        error: "O campo 'id' é obrigatório para atualizar uma pessoa."
      });
    }

    const db = await openDB();
    const result = await db.run(
      'UPDATE person SET name = ?, age = ?, email = ?, address = ?, phone = ? WHERE id = ?',
      [person.name, person.age, person.email, person.address, person.phone, person.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: `Nenhuma pessoa encontrada com ID ${person.id}.`
      });
    }

    console.log(`Pessoa ID ${person.id} atualizada com sucesso!`);
    return res.json({
      message: `Pessoa ID ${person.id} atualizada com sucesso!`,
      data: person
    });
  } catch (error) {
    console.error('Erro ao atualizar pessoa:', error);
    res.status(500).json({ error: 'Erro ao atualizar pessoa.' });
    throw error;
  }
}

export async function selectPerson(req, res) {
  try {
    const { ids } = req.body;
    const db = await openDB();
    let data;

  
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      data = await db.all('SELECT * FROM person');
      return res.json({
        message: 'Lista de pessoas carregada com sucesso!',
        data
      });
    }

   
    const placeholders = ids.map(() => '?').join(',');
    data = await db.all(`SELECT * FROM person WHERE id IN (${placeholders})`, ids);

    if (data.length === 0) {
      return res.status(404).json({
        error: `Nenhuma pessoa encontrada com os IDs: ${ids.join(', ')}.`
      });
    }

    return res.json({
      message: 'Pessoas filtradas com sucesso!',
      data
    });

  } catch (error) {
    console.error('Erro ao buscar pessoa(s):', error);
    res.status(500).json({ error: 'Erro ao buscar pessoa(s).' });
  }
}


export async function deletePerson(req, res) {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: "Envie um array com pelo menos um ID para deletar."
      });
    }

    const db = await openDB();
    const placeholders = ids.map(() => '?').join(',');
    const result = await db.run(
      `DELETE FROM person WHERE id IN (${placeholders})`,
      ids
    );

    if (result.changes === 0) {
      return res.status(404).json({
        error: `Nenhuma pessoa encontrada com os IDs ${ids.join(', ')}.`
      });
    }

    console.log(`Pessoas com IDs [${ids.join(', ')}] excluídas com sucesso!`);
    return res.json({
      message: `${ids.length} pessoa(s) deletada(s) com sucesso!`,
      deletedIds: ids
    });
  } catch (error) {
    console.error('Erro ao excluir pessoa(s):', error);
    res.status(500).json({ error: 'Erro ao excluir pessoa(s).' });
    throw error;
  }
}
