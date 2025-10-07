// index.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";

// Carregar variáveis do .env
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;

console.log("🔧 Configuração carregada:", {
  PORT: PORT,
  HF_TOKEN: HF_TOKEN ? "✅ Configurado" : "❌ Não configurado"
});

// --- 🧠 ROTA DE TESTE DE IA COM AXIOS ---
app.get("/teste-ia", async (req, res) => {
  try {
    // Verificar se o token está configurado
    if (!HF_TOKEN) {
      return res.status(400).json({
        sucesso: false,
        erro: "HF_TOKEN não configurado",
        instrucoes: [
          "1. Crie um arquivo .env na raiz do projeto",
          "2. Adicione: HF_TOKEN=seu_token_da_hugging_face",
          "3. Reinicie o servidor"
        ]
      });
    }

    console.log("🔄 Fazendo requisição para Hugging Face...");
    
    const response = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        "model": "deepseek-ai/DeepSeek-V3.2-Exp:novita",
        "messages": [
          {
            "role": "system",
            "content": "Você é o Prota, um coach divertido. O usuario quer emagrecer 5 quilos em 1 mes crie tasks pra ele atingir o seu objetivo"
          },
          {
            "role": "user", 
            "content": "me retorne em 3 sentenças em portugues"
          }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 segundos de timeout
      }
    );

    const resposta = response.data.choices[0].message.content;
    
    console.log("✅ Resposta recebida da IA");
    
    res.json({
      sucesso: true,
      modelo: "DeepSeek-V3.2-Exp",
      resposta: resposta,
      mensagem: "Conexão com DeepSeek estabelecida! 🧠"
    });
  } catch (error) {
    console.error("❌ Erro na requisição:", error.response?.data || error.message);
    
    let mensagemErro = "Erro desconhecido";
    let statusCode = 500;
    
    if (error.response) {
      // Erro da API
      statusCode = error.response.status;
      mensagemErro = error.response.data?.error || error.response.statusText;
    } else if (error.request) {
      // Erro de rede
      mensagemErro = "Sem resposta do servidor - verifique sua conexão";
    } else {
      // Outro erro
      mensagemErro = error.message;
    }
    
    res.status(statusCode).json({
      sucesso: false,
      erro: mensagemErro,
      detalhes: error.response?.data
    });
  }
});

// Rota para verificar configuração
app.get("/config", (req, res) => {
  res.json({
    sistema: "Sisteminha do Prota - Teste IA",
    configuracao: {
      porta: PORT,
      hf_token: HF_TOKEN ? "✅ Configurado" : "❌ Não configurado",
      node_env: process.env.NODE_ENV || "development"
    },
    instrucoes: !HF_TOKEN ? [
      "1. Crie arquivo .env na raiz do projeto",
      "2. Adicione: HF_TOKEN=seu_token_da_hugging_face",
      "3. Reinicie o servidor: node index.js"
    ] : "Tudo configurado! 🎉"
  });
});

// Rota simples de status
app.get("/", (req, res) => {
  res.json({
    sistema: "Sisteminha do Prota - Teste IA com Axios",
    versao: "1.0",
    status: HF_TOKEN ? "✅ IA Configurada" : "⚠️ Configure o HF_TOKEN",
    rotas: {
      "GET /": "Status do sistema",
      "GET /config": "Ver configuração",
      "GET /teste-ia": "Testar conexão com IA"
    }
  });
});

// --- 🚀 INICIALIZAÇÃO ---
app.listen(PORT, () => {
  console.log(`
🧠 Sisteminha do Prota - Teste IA com AXIOS
📍 URL: http://localhost:${PORT}
🔧 Configuração: ${HF_TOKEN ? '✅ HF_TOKEN CONFIGURADO' : '❌ HF_TOKEN NÃO CONFIGURADO'}

📡 Rotas disponíveis:
GET  /config    - Verificar configuração
GET  /teste-ia  - Testar IA
GET  /          - Status

${!HF_TOKEN ? `
⚠️  CONFIGURAÇÃO NECESSÁRIA:

1. Crie o arquivo .env na mesma pasta do index.js:
   └── 📄 .env

2. Adicione no arquivo .env:
   HF_TOKEN=seu_token_da_hugging_face

3. Obtenha o token em:
   https://huggingface.co/settings/tokens

4. Reinicie o servidor:
   node index.js
` : '🎯 Tudo pronto! Teste a IA em: GET /teste-ia'}
  `);
});