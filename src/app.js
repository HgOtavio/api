import https from 'https';
import fs from 'fs';
import express from 'express';
import router from './router.js';

const app = express();

app.use(express.json());
app.use('/', router);

const options = {
  key: fs.readFileSync('./src/ssl/server.key'),
  cert: fs.readFileSync('./src/ssl/server.crt')
};

https.createServer(options, app).listen(3000, () => {
  console.log('Servidor HTTPS rodando em https://localhost:3000');
});
