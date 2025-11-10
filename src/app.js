import express from 'express';
import fs from 'fs';
import https from 'https';
import router from './routes.js';

const app = express();
app.use(express.json());
app.use(router);



