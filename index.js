require('dotenv').config({ path: __dirname + '/.env' }); // Carrega .env com caminho absoluto

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json()); // Permite receber JSON no body das requisições

// Carrega banco de dados (JSON)
const dataPath = path.join(__dirname, 'data');
const usersPath = path.join(dataPath, 'users.json');
const missoesPath = path.join(dataPath, 'missoes.json');

// Função auxiliar para carregar/salvar JSON
function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Erro ao carregar ${filePath}:`, err);
    return [];
  }
}
function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Erro ao salvar ${filePath}:`, err);
  }
}

// Inicializa dados
let users = loadJSON(usersPath);
let missoes = loadJSON(missoesPath);

// Configuração Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  },
  connectionTimeout: 10000,
  tls: { rejectUnauthorized: false } // Para testes locais
});

function gerarMissoesParaUsuario(user) {
  // Cria 3 missões básicas com base no dia atual
  const diaAtual = user.dia_atual || 1;
  const categorias = ['Nutrição', 'Exercício', 'Mindset'];
  const horarios = ['06:00', '12:00', '18:00'];

  return categorias.map((categoria, idx) => ({
    id: `${user.id}-${diaAtual}-${categoria}`,
    user_id: user.id,
    nome: `Missão ${categoria} Dia ${diaAtual}`,
    categoria,
    horario: horarios[idx],
    descricao: `Complete sua missão de ${categoria} para o dia ${diaAtual}`,
    xp: 10 + idx * 5,
    dia: diaAtual
  }));
}

// 📌 Rota: Cadastrar usuário
app.post('/cadastrar', (req, res) => {
  const { nome, email, peso_atual, peso_meta } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
  }

  const newUser = {
    id: users.length + 1,
    nome,
    email,
    peso_atual,
    peso_meta,
    dia_atual: 1,
    xp_total: 0,
    rank: 'Aprendiz'
  };

  users.push(newUser);
  saveJSON(usersPath, users);

  res.status(201).json({ success: true, user: newUser });
});

// 📌 Rota: Gerar missões para todos os usuários
app.post('/gerar-missoes', (req, res) => {
  console.log('🔄 Gerando missões diárias...');
  const novasMissoes = [];

  users.forEach(user => {
    const userMissoes = gerarMissoesParaUsuario(user);
    novasMissoes.push(...userMissoes);

    // Incrementa dia atual
    user.dia_atual += 1;
  });

  missoes.push(...novasMissoes);
  saveJSON(missoesPath, missoes);
  saveJSON(usersPath, users);

  res.json({
    success: true,
    message: 'Missões geradas com sucesso',
    total: novasMissoes.length
  });
});

// 📌 Rota: Enviar e-mails com as missões do horário atual
app.get('/disparar', async (req, res) => {
  const agora = new Date();
  const horaAtual = agora.toTimeString().slice(0, 5); // "HH:MM"

  const missoesParaEnviar = missoes.filter(m => m.horario === horaAtual);

  if (missoesParaEnviar.length === 0) {
    console.log('Nenhuma missão para enviar neste horário.');
    return res.json({ message: 'Nenhuma missão para enviar neste horário.' });
  }

  try {
    for (const missao of missoesParaEnviar) {
      const user = users.find(u => u.id === missao.user_id);
      if (!user) continue;

      console.log(`📧 Enviando missão "${missao.nome}" para ${user.email}`);

      await transporter.sendMail({
        from: `"Missão Fitness" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: missao.nome,
        text: missao.descricao
      });
    }
    res.json({ success: true, enviados: missoesParaEnviar.length });
  } catch (error) {
    console.error('Erro ao enviar e-mails:', error);
    res.status(500).json({ error: 'Falha ao enviar e-mails' });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  const agora = new Date().toLocaleString('pt-BR', {
    timeZone: process.env.FUSO_HORARIO
  });
  res.send(`Servidor rodando. Hora atual: ${agora}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Variáveis carregadas:', {
    user: process.env.GMAIL_USER,
    timezone: process.env.FUSO_HORARIO
  });
});

module.exports = app;