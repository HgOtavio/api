import { Router } from 'express';
import { insertPerson, selectPerson, updatePerson, deletePerson, createTable } from './controller/person.js';

const router = Router();

router.get('/', (req, res) => res.send('API funcionando!'));
router.get('/create-table', createTable);
router.post('/person', insertPerson);
router.get('/person', selectPerson);
router.put('/person', updatePerson);
router.delete('/person', deletePerson);

export default router;
