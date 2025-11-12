import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {insertPerson,selectPerson,updatePerson,deletePerson,createTable} from './controller/person.js';
import { createUserTable,registerUser,loginUser,updateUser,deleteUser,verifyToken} from './controller/userController.js';

const router = Router();
const SECRET_KEY = 'minha-chave-secreta';

router.post('/secure', (req, res) => {
  const username = req.headers['username'];
  const password = req.headers['password'];

  if (username === 'admin' && password === '1234') {
    const token = jwt.sign({ user: username }, SECRET_KEY, { expiresIn: '1h' });
    return res.json({ message: 'Login bem-sucedido!', token });
  }

  res.status(401).json({ error: 'Credenciais inválidas nos headers.' });
});

function verifyAdminToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token)
    return res.status(401).json({ error: 'Token ausente. Faça login em /secure.' });

  const jwtToken = token.split(' ')[1];
  jwt.verify(jwtToken, SECRET_KEY, (err, decoded) => {
    if (err)
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = decoded;
    next();
  });
}

router.get('/', verifyAdminToken, (req, res) => res.send('API funcionando!'));
router.get('/create-table', verifyAdminToken, createTable);
router.post('/person', verifyAdminToken, insertPerson);
router.get('/person', verifyAdminToken, selectPerson);
router.put('/person', verifyAdminToken, updatePerson);
router.delete('/person', verifyAdminToken, deletePerson);

router.get('/user/create-table', createUserTable);
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);
router.put('/user/update', verifyToken, updateUser);
router.delete('/user/delete', verifyToken, deleteUser);

export default router;
