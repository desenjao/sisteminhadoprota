// Versão corrigida e testável
require('dotenv').config({ path: __dirname + '/.env' }); // Carrega .env com caminho absoluto

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs'); // Adicionado para leitura segura do JSON

const app = express();

// Carrega missoes.json com caminho absoluto e tratamento de erro
let missoes = [];
try {
  const missoesPath = path.join(__dirname, 'data', 'missoes.json');
  missoes = JSON.parse(fs.readFileSync(missoesPath, 'utf8'));
  console.log('Missões carregadas:', missoes.length);
} catch (error) {
  console.error('Erro ao carregar missoes.json:', error);
  process.exit(1);
}

// Configuração robusta do Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  },
  connectionTimeout: 10000,
  tls: { rejectUnauthorized: false } // Apenas para desenvolvimento
});

// Função de verificação melhorada
function verificarMissoes() {
  const agora = new Date();
  const options = { 
    timeZone: process.env.FUSO_HORARIO, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  };
  
  const horaAtual = agora.toLocaleTimeString('pt-BR', options)
    .replace(':', '')
    .padStart(4, '0'); // Garante formato HHMM (0800)

  const diaSemana = agora.getDay(); // 0-6 (Domingo=0)

  return missoes.filter(missao => {
    const horaMissao = missao.horario.replace(':', '').padStart(4, '0');
    return missao.dias.includes(diaSemana) && horaMissao === horaAtual;
  });
}

// Endpoints (mantidos iguais, mas com mais logs)
// Rota de teste rápido (ignora horários e dias)
app.get('/teste-email', async (req, res) => {
  try {
    // Escolha uma missão qualquer do JSON (ex: primeira missão)
    const missaoTeste = missoes[0] || {
      assunto: "TESTE - Assunto do E-mail",
      mensagem: "Esta é uma mensagem de teste enviada sem verificar horários!"
    };

    await transporter.sendMail({
      from: `"Teste Automático" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: missaoTeste.assunto,
      text: missaoTeste.mensagem
    });

    res.json({ 
      success: true,
      message: "E-mail de teste enviado! Verifique sua caixa de entrada."
    });
  } catch (error) {
    console.error("Erro no teste:", error);
    res.status(500).json({
      error: "Falha no envio",
      details: error.message
    });
  }
});
app.get('/disparar', async (req, res) => {
  console.log('Verificando missões...');
  const missoesParaEnviar = verificarMissoes();
  
  if (missoesParaEnviar.length === 0) {
    console.log('Nenhuma missão no momento');
    return res.json({ message: "Nenhuma missão no momento" });
  }

  try {
    for (const missao of missoesParaEnviar) {
      console.log('Enviando:', missao.nome);
      await transporter.sendMail({
        from: `"Seu Nome" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: missao.assunto,
        text: missao.mensagem
      });
    }
    res.json({ success: true, enviados: missoesParaEnviar.length });
  } catch (error) {
    console.error('Erro no envio:', error);
    res.status(500).json({ 
      error: 'Falha ao enviar e-mails',
      details: error.message 
    });
  }
});

app.get('/cron', (req, res) => {
  console.log('Cron job executado');
  res.status(200).end();
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