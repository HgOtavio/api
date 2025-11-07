import { openDB } from './settingDB.js';

import express from  'express';
const app = express();

openDB ();

app.use(express.json());

app.get('/', function (req, res) {
  res.send('Porta usada com sucesso!');
});

app.post('/person', function (req, res) {
  
  const { name } = req.body;

  res.json({
    name: name, 
    age: 18
  });
});

app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
