const express = require('express');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const cron = require('node-cron');
const axios = require('axios');
require('dotenv').config({ path: __dirname + '/.env' });

const app = express();
const prisma = new PrismaClient();
app.use(express.json());

// Configuração do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
  connectionTimeout: 10000,
  tls: { rejectUnauthorized: false }, // Apenas para desenvolvimento
});

// Função para construir o prompt da IA
function buildPrompt(user, missoesAnteriores, diaAtual) {
  const fase = diaAtual <= 14 ? 'Iniciante' : diaAtual <= 28 ? 'Intermediário' : diaAtual <= 42 ? 'Avançado' : 'Final Boss';
  const missoesStr = JSON.stringify(missoesAnteriores.map(m => ({
    dia: m.dia,
    horario: m.horario,
    nome: m.nome,
    categoria: m.categoria,
    dificuldade: m.dificuldade,
    descricao: m.descricao,
    xp: m.xp,
  })));
  return `
Você é um coach de emagrecimento gamificado. Gere 3 missões diárias para o usuário ${user.nome}, no dia ${diaAtual}, com base nas missões anteriores: ${missoesStr}. As missões devem:
- Pertencer a uma categoria: Nutrição (06:00), Exercício (12:00), Mindset (18:00).
- Ter dificuldade apropriada para a fase ${fase} (Iniciante: 80% Fácil/20% Médio, Intermediário: 60% Médio/30% Hard, Avançado: 60% Hard/30% Médio, Final Boss: 50% Mestre/40% Hard).
- Ser uma continuação lógica (ex.: aumentar volume de água em 0.5L, caminhada em 5 min).
- Incluir narrativa motivacional e XP (Fácil: 10-15, Médio: 20-30, Difícil: 35-50, Mestre: 60-120).
- Evitar repetições e manter coerência com peso atual (${user.peso_atual || 'desconhecido'}) e meta (${user.peso_meta || 'desconhecida'}).
Retorne um JSON com: [{id: string, nome: string, categoria: string, dificuldade: string, descricao: string, xp: number, horario: string}].
  `;
}

// Função para chamar a API do Google Gemini
async function gerarMissoes(user, diaAtual) {
  try {
    // Buscar missões anteriores (últimas 14)
    const missoesAnteriores = await prisma.missao.findMany({
      where: { user_id: user.id, dia: { lte: diaAtual } },
      orderBy: { dia: 'desc' },
      take: 14,
    });

    // Construir o prompt (supondo que buildPrompt retorna uma string)
    const prompt = buildPrompt(user, missoesAnteriores, diaAtual);

    // Chamar a API do Google Gemini
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Extrair as missões da resposta do Gemini
    const missoesText = response.data.candidates[0].content.parts[0].text;
    const missoes = JSON.parse(missoesText); // Supondo que a resposta seja um JSON válido
    return missoes || [];
  } catch (error) {
    console.error('Erro ao gerar missões:', error.message);
    return [];
  }
}

// Rota de teste para verificar a integração com a API do Gemini
app.post('/testar-gemini', async (req, res) => {
  try {
    // Usuário mockado para teste
    const mockUser = { id: 1, name: 'Test User' };
    const diaAtual = new Date().toISOString().split('T')[0]; // Data atual no formato YYYY-MM-DD

    // Chamar a função gerarMissoes
    const missoes = await gerarMissoes(mockUser, diaAtual);

    // Retornar a resposta
    res.status(200).json({
      success: true,
      missoes,
      message: 'Integração com Gemini bem-sucedida',
    });
  } catch (error) {
    console.error('Erro na rota de teste:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao testar a integração com a API do Gemini',
      error: error.message,
    });
  }
});

// Cron job para gerar missões diárias às 00:00
cron.schedule('0 0 * * *', async () => {
  console.log('Gerando missões diárias...');
  const users = await prisma.user.findMany();
  for (const user of users) {
    const novasMissoes = await gerarMissoes(user, user.dia_atual);
    for (const missao of novasMissoes) {
      await prisma.missao.create({
        data: {
          user_id: user.id,
          dia: user.dia_atual,
          horario: missao.horario,
          nome: missao.nome,
          categoria: missao.categoria,
          dificuldade: missao.dificuldade,
          descricao: missao.descricao,
          xp: missao.xp,
        },
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { dia_atual: user.dia_atual + 1 },
    });
    console.log(`Missões geradas para ${user.nome}, dia ${user.dia_atual}`);
  }
});

// Função para verificar missões a enviar
async function verificarMissoes() {
  const agora = new Date();
  const options = {
    timeZone: process.env.FUSO_HORARIO || 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };
  const horaAtual = agora.toLocaleTimeString('pt-BR', options).replace(':', '');
  const users = await prisma.user.findMany();
  const missoesParaEnviar = [];

  for (const user of users) {
    const missoes = await prisma.missao.findMany({
      where: {
        user_id: user.id,
        dia: user.dia_atual - 1, // Dia atual já foi incrementado
        horario: `${horaAtual.slice(0, 2)}:${horaAtual.slice(2)}`,
      },
    });
    missoes.forEach(m => missoesParaEnviar.push({ ...m, email: user.email }));
  }
  return missoesParaEnviar;
}

// Endpoint para disparar e-mails
app.get('/disparar', async (req, res) => {
  console.log('Verificando missões para envio...');
  const missoesParaEnviar = await verificarMissoes();

  if (missoesParaEnviar.length === 0) {
    console.log('Nenhuma missão no momento');
    return res.json({ message: 'Nenhuma missão no momento' });
  }

  try {
    for (const missao of missoesParaEnviar) {
      console.log(`Enviando missão: ${missao.nome} para ${missao.email}`);
      await transporter.sendMail({
        from: `"Sisteminha do Prota" <${process.env.GMAIL_USER}>`,
        to: missao.email,
        subject: missao.nome,
        text: missao.descricao,
      });
    }
    res.json({ success: true, enviados: missoesParaEnviar.length });
  } catch (error) {
    console.error('Erro no envio:', error);
    res.status(500).json({ error: 'Falha ao enviar e-mails', details: error.message });
  }
});

// Endpoint para feedback semanal
app.post('/feedback', async (req, res) => {
  const { user_id, peso_atual, feedback } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Calcular progresso e ajustar rank
    const progresso = user.peso_meta ? ((user.peso_atual - peso_atual) / (user.peso_atual - user.peso_meta)) * 100 : 0;
    let rank = user.rank;
    if (user.xp_total >= 2500) rank = 'Mestre Supremo';
    else if (user.xp_total >= 1500) rank = 'Lenda';
    else if (user.xp_total >= 1000) rank = 'Campeão';
    else if (user.xp_total >= 600) rank = 'Gladiador';
    else if (user.xp_total >= 300) rank = 'Guerreiro';
    else if (user.xp_total >= 100) rank = 'Aprendiz';

    await prisma.user.update({
      where: { id: user_id },
      data: { peso_atual, rank },
    });

    // Aqui você pode adicionar lógica para ajustar dificuldade com base em progresso/feedback
    console.log(`Feedback recebido: User ${user_id}, Peso ${peso_atual}, Progresso ${progresso.toFixed(2)}%`);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no feedback:', error);
    res.status(500).json({ error: 'Falha ao processar feedback', details: error.message });
  }
});

// Endpoint de teste
app.get('/', (req, res) => {
  const agora = new Date().toLocaleString('pt-BR', {
    timeZone: process.env.FUSO_HORARIO || 'America/Sao_Paulo',
  });
  res.send(`Servidor rodando. Hora atual: ${agora}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Variáveis carregadas:', {
    user: process.env.GMAIL_USER,
    timezone: process.env.FUSO_HORARIO,
  });
});

// Limpeza do Prisma ao encerrar
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});