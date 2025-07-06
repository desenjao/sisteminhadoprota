// index.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Servidor rodando na Vercel! 🚀');
});

// Endpoint para suas missões
app.get('/api/lembrete', (req, res) => {
  res.json({ 
    mensagem: "Hora de beber água! 💧",
    horario: new Date().toLocaleTimeString('pt-BR')
  });
});

module.exports = app;