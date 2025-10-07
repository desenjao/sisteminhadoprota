// index.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Carregar variáveis do .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const DATA_DIR = path.join(__dirname, 'data');

// Garantir que o diretório data existe
await fs.mkdir(DATA_DIR, { recursive: true });

console.log("🔧 Configuração carregada:", {
  PORT: PORT,
  HF_TOKEN: HF_TOKEN ? "✅ Configurado" : "❌ Não configurado"
});

// --- 🗄️ FUNÇÕES DE ARMAZENAMENTO ---
async function carregarDados(arquivo) {
  try {
    const data = await fs.readFile(path.join(DATA_DIR, `${arquivo}.json`), 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function salvarDados(arquivo, dados) {
  await fs.writeFile(
    path.join(DATA_DIR, `${arquivo}.json`), 
    JSON.stringify(dados, null, 2)
  );
}

// --- 🧠 FUNÇÕES DE IA ---
async function gerarMissoesComIA(objetivo) {
  try {
    console.log(`🧠 Gerando missões com IA para: ${objetivo.nome}`);
    
    const response = await axios.post(
      "https://router.huggingface.co/v1/chat/completions",
      {
        "model": "deepseek-ai/DeepSeek-V3.2-Exp:novita",
        "messages": [
          {
            "role": "system",
            content: `Você é o Prota, um assistente de produtividade. 
            Crie APENAS 3 tarefas práticas em português.
            Formato de resposta EXATO:
            {
              "missoes": [
                {
                  "titulo": "Título bem curto",
                  "descricao": "Descrição simples",
                  "prioridade": "alta",
                  "dica": "Dica rápida", 
                  "pontos": 10
                }
              ]
            }`
          },
          {
            "role": "user", 
            content: `Objetivo: ${objetivo.nome}. Crie 3 tarefas curtas.`
          }
        ],
        "max_tokens": 500
      },
      {
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 25000
      }
    );

    const resposta = response.data.choices[0].message.content;
    console.log("📨 Resposta da IA recebida");

    const jsonMatch = resposta.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const dados = JSON.parse(jsonMatch[0]);
      return dados.missoes || gerarMissoesFallback(objetivo);
    }
    
    return gerarMissoesFallback(objetivo);

  } catch (error) {
    console.error("❌ Erro na IA, usando fallback:", error.message);
    return gerarMissoesFallback(objetivo);
  }
}

function gerarMissoesFallback(objetivo) {
  const frameworks = {
    corpo: [
      {
        titulo: "Avaliação inicial",
        descricao: `Medir situação atual para "${objetivo.nome}"`,
        prioridade: "alta",
        dica: "Anote métricas iniciais para acompanhar progresso",
        pontos: 20
      },
      {
        titulo: "Plano de ação",
        descricao: "Criar estratégia específica para o objetivo",
        prioridade: "alta",
        dica: "Defina etapas claras e realistas",
        pontos: 15
      },
      {
        titulo: "Primeiro passo prático",
        descricao: "Executar ação concreta relacionada ao objetivo",
        prioridade: "media",
        dica: "Comece com algo simples para criar momentum",
        pontos: 10
      }
    ],
    mente: [
      {
        titulo: "Definir métricas",
        descricao: "Estabelecer como medir progresso mental",
        prioridade: "alta",
        dica: "Use um diário para registrar evolução",
        pontos: 15
      },
      {
        titulo: "Prática inicial", 
        descricao: "Implementar primeiras técnicas",
        prioridade: "media",
        dica: "Comece com sessões curtas e consistentes",
        pontos: 10
      },
      {
        titulo: "Reflexão e ajuste",
        descricao: "Avaliar progresso e ajustar abordagem",
        prioridade: "baixa",
        dica: "Aprenda com os resultados e adapte",
        pontos: 5
      }
    ],
    trabalho: [
      {
        titulo: "Análise de recursos",
        descricao: "Identificar o que é necessário",
        prioridade: "alta", 
        dica: "Liste ferramentas, tempo e conhecimentos",
        pontos: 15
      },
      {
        titulo: "Primeiro marco",
        descricao: "Estabelecer entrega inicial",
        prioridade: "media",
        dica: "Celebre pequenas conquistas",
        pontos: 20
      },
      {
        titulo: "Aprendizado contínuo",
        descricao: "Buscar conhecimento específico",
        prioridade: "media",
        dica: "Foque em aprender algo novo relacionado",
        pontos: 10
      }
    ]
  };

  return frameworks[objetivo.categoria] || frameworks.trabalho;
}

// --- 🧱 INICIALIZAÇÃO DOS DADOS ---
let objetivos = await carregarDados('objetivos');
let missoes = await carregarDados('missoes');
let progresso = await carregarDados('progresso');

if (progresso.length === 0) {
  progresso = [{
    semanaAtual: 1,
    missoesConcluidas: 0,
    missoesTotais: 0,
    progressoGeral: 0,
    streak: 0,
    ultimaAtualizacao: new Date().toISOString()
  }];
  await salvarDados('progresso', progresso);
}

// --- 🔄 FUNÇÃO DE PROGRESSO ---
async function atualizarProgressoGeral() {
  const totalMissoes = missoes.length;
  const missoesConcluidas = missoes.filter(m => m.status === "concluida").length;
  
  const progressoGeral = totalMissoes > 0 
    ? Math.round((missoesConcluidas / totalMissoes) * 100) 
    : 0;

  for (const objetivo of objetivos) {
    const missoesObjetivo = missoes.filter(m => m.objetivoId === objetivo.id);
    const concluidasObjetivo = missoesObjetivo.filter(m => m.status === "concluida").length;
    
    objetivo.progresso = missoesObjetivo.length > 0 
      ? Math.round((concluidasObjetivo / missoesObjetivo.length) * 100)
      : 0;
  }

  progresso[0] = {
    ...progresso[0],
    missoesConcluidas,
    missoesTotais: totalMissoes,
    progressoGeral,
    ultimaAtualizacao: new Date().toISOString()
  };

  await salvarDados('objetivos', objetivos);
  await salvarDados('progresso', progresso);
}

// --- 🎯 ROTAS DE OBJETIVOS ---

// CORREÇÃO: Bug na variável 'objetivo' -> 'novoObjetivo'
app.post("/objetivos", async (req, res) => {
  try {
    const { nome, categoria, prioridade, meta_final, motivacao } = req.body;
    
    if (!nome || !categoria || !prioridade) {
      return res.status(400).json({ 
        erro: "Nome, categoria e prioridade são obrigatórios" 
      });
    }

    const novoObjetivo = {
      id: objetivos.length + 1,
      nome,
      categoria,
      prioridade,
      meta_final: meta_final || "",
      motivacao: motivacao || "",
      progresso: 0,
      data_criacao: new Date().toISOString(),
      ativo: true
    };

    objetivos.push(novoObjetivo);
    await salvarDados('objetivos', objetivos);

    // 🚀 RESPONDER RÁPIDO
    res.status(201).json({
      mensagem: "🎯 Objetivo criado com sucesso!",
      objetivo: novoObjetivo,
      observacao: "Missões estão sendo geradas em background..."
    });

    // 🔄 GERAR MISSÕES EM BACKGROUND - CORRIGIDO
    setTimeout(async () => {
      try {
        console.log(`🧠 Iniciando geração de missões para: ${novoObjetivo.nome}`);
        
        // CORREÇÃO: usar novoObjetivo em vez de objetivo
        let missoesGeradas = gerarMissoesFallback(novoObjetivo);
        
        if (HF_TOKEN) {
          try {
            console.log('   Tentando gerar com IA...');
            missoesGeradas = await gerarMissoesComIA(novoObjetivo);
            console.log(`   ✅ ${missoesGeradas.length} missões geradas com IA`);
          } catch (iaError) {
            console.log(`   ⚠️  IA falhou: ${iaError.message}`);
            console.log('   Usando fallback...');
          }
        } else {
          console.log('   IA não configurada, usando fallback...');
        }
        
        // Salvar missões
        console.log(`   Salvando ${missoesGeradas.length} missões...`);
        for (const missao of missoesGeradas) {
          const novaMissao = {
            id: missoes.length + 1,
            objetivoId: novoObjetivo.id,
            ...missao,
            tipo: "diaria",
            status: "pendente",
            data_criacao: new Date().toISOString(),
            data_conclusao: null,
            gerado_por_ia: !!HF_TOKEN
          };
          missoes.push(novaMissao);
        }
        
        await salvarDados('missoes', missoes);
        await atualizarProgressoGeral();
        
        console.log(`✅ ${missoesGeradas.length} missões salvas para: ${novoObjetivo.nome}`);
        
      } catch (error) {
        console.error(`❌ Erro ao gerar missões: ${error.message}`);
      }
    }, 100);

  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Listar objetivos
app.get("/objetivos", (req, res) => {
  const objetivosAtivos = objetivos.filter(obj => obj.ativo);
  res.json({
    total: objetivosAtivos.length,
    objetivos: objetivosAtivos
  });
});

// Obter objetivo específico
app.get("/objetivos/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const objetivo = objetivos.find(obj => obj.id === id && obj.ativo);
  
  if (!objetivo) {
    return res.status(404).json({ erro: "Objetivo não encontrado" });
  }
  
  const missoesObjetivo = missoes.filter(m => m.objetivoId === id);
  res.json({
    objetivo,
    missoes: missoesObjetivo,
    total_missoes: missoesObjetivo.length
  });
});

// Atualizar objetivo
app.put("/objetivos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = objetivos.findIndex(obj => obj.id === id);
    
    if (index === -1) {
      return res.status(404).json({ erro: "Objetivo não encontrado" });
    }

    const { nome, categoria, prioridade, meta_final, motivacao } = req.body;
    
    objetivos[index] = {
      ...objetivos[index],
      ...(nome && { nome }),
      ...(categoria && { categoria }),
      ...(prioridade && { prioridade }),
      ...(meta_final !== undefined && { meta_final }),
      ...(motivacao !== undefined && { motivacao }),
      data_atualizacao: new Date().toISOString()
    };

    await salvarDados('objetivos', objetivos);
    res.json({ mensagem: "Objetivo atualizado", objetivo: objetivos[index] });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Excluir objetivo
app.delete("/objetivos/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = objetivos.findIndex(obj => obj.id === id);
    
    if (index === -1) {
      return res.status(404).json({ erro: "Objetivo não encontrado" });
    }

    objetivos[index].ativo = false;
    objetivos[index].data_exclusao = new Date().toISOString();
    
    await salvarDados('objetivos', objetivos);
    res.json({ mensagem: "Objetivo excluído com sucesso" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// --- 📋 ROTAS DE MISSÕES ---

// Listar missões
app.get("/missoes", (req, res) => {
  const { objetivoId, status, prioridade } = req.query;
  
  let missoesFiltradas = missoes;
  
  if (objetivoId) {
    missoesFiltradas = missoesFiltradas.filter(m => m.objetivoId === parseInt(objetivoId));
  }
  
  if (status) {
    missoesFiltradas = missoesFiltradas.filter(m => m.status === status);
  }
  
  if (prioridade) {
    missoesFiltradas = missoesFiltradas.filter(m => m.prioridade === prioridade);
  }

  res.json({
    total: missoesFiltradas.length,
    missoes: missoesFiltradas
  });
});

// Criar missão manual
app.post("/missoes", async (req, res) => {
  try {
    const { objetivoId, titulo, descricao, prioridade, tipo, pontos } = req.body;
    
    if (!objetivoId || !titulo || !prioridade) {
      return res.status(400).json({ 
        erro: "objetivoId, titulo e prioridade são obrigatórios" 
      });
    }

    const novaMissao = {
      id: missoes.length + 1,
      objetivoId: parseInt(objetivoId),
      titulo,
      descricao: descricao || "",
      prioridade,
      tipo: tipo || "diaria",
      status: "pendente",
      pontos: pontos || 10,
      data_criacao: new Date().toISOString(),
      data_conclusao: null,
      gerado_por_ia: false
    };

    missoes.push(novaMissao);
    await salvarDados('missoes', missoes);
    
    await atualizarProgressoGeral();

    res.status(201).json({
      mensagem: "Missão criada com sucesso!",
      missao: novaMissao
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Concluir missão
app.post("/missoes/:id/concluir", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const missao = missoes.find(m => m.id === id);
    
    if (!missao) {
      return res.status(404).json({ erro: "Missão não encontrada" });
    }

    if (missao.status === "concluida") {
      return res.status(400).json({ erro: "Missão já está concluída" });
    }

    missao.status = "concluida";
    missao.data_conclusao = new Date().toISOString();
    
    await salvarDados('missoes', missoes);
    await atualizarProgressoGeral();

    const objetivo = objetivos.find(obj => obj.id === missao.objetivoId);
    
    res.json({
      mensagem: `🎉 Missão "${missao.titulo}" concluída! +${missao.pontos} pontos`,
      objetivo: objetivo?.nome,
      progresso: progresso[0]
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// --- 📊 ROTAS DE DASHBOARD ---

// Dashboard principal
app.get("/dashboard", (req, res) => {
  const objetivosAtivos = objetivos.filter(obj => obj.ativo);
  const missoesPendentes = missoes.filter(m => m.status === "pendente");
  const missoesConcluidas = missoes.filter(m => m.status === "concluida");
  const missoesIA = missoes.filter(m => m.gerado_por_ia);
  
  res.json({
    resumo: {
      total_objetivos: objetivosAtivos.length,
      missoes_pendentes: missoesPendentes.length,
      missoes_concluidas: missoesConcluidas.length,
      missoes_inteligentes: missoesIA.length,
      progresso_geral: progresso[0].progressoGeral,
      streak: progresso[0].streak
    },
    ia: {
      disponivel: !!HF_TOKEN,
      status: HF_TOKEN ? "Configurada 🧠" : "Não configurada"
    },
    objetivos_ativos: objetivosAtivos.map(obj => ({
      id: obj.id,
      nome: obj.nome,
      progresso: obj.progresso,
      categoria: obj.categoria
    })),
    missoes_do_dia: missoesPendentes.slice(0, 5)
  });
});

// Progresso geral
app.get("/progresso", (req, res) => {
  res.json(progresso[0]);
});

// --- 🧪 ROTAS DE TESTE ---
app.get("/teste-ia", async (req, res) => {
  try {
    if (!HF_TOKEN) {
      return res.status(400).json({
        sucesso: false,
        erro: "HF_TOKEN não configurado"
      });
    }

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
        timeout: 30000
      }
    );

    const resposta = response.data.choices[0].message.content;
    
    res.json({
      sucesso: true,
      modelo: "DeepSeek-V3.2-Exp",
      resposta: resposta,
      mensagem: "Conexão com DeepSeek estabelecida! 🧠"
    });
  } catch (error) {
    res.status(500).json({
      sucesso: false,
      erro: error.response?.data || error.message
    });
  }
});

app.get("/config", (req, res) => {
  res.json({
    sistema: "Sisteminha do Prota - API Completa",
    configuracao: {
      porta: PORT,
      hf_token: HF_TOKEN ? "✅ Configurado" : "❌ Não configurado",
      node_env: process.env.NODE_ENV || "development"
    }
  });
});

// Rota inicial
app.get("/", (req, res) => {
  res.json({
    sistema: "Sisteminha do Prota - API Completa",
    versao: "2.0",
    status: "✅ Online",
    ia: HF_TOKEN ? "🧠 Configurada" : "⚠️ Não configurada",
    rotas: {
      "GET /": "Status do sistema",
      "GET /config": "Configuração",
      "GET /teste-ia": "Testar IA",
      "GET /dashboard": "Dashboard completo",
      "GET /progresso": "Progresso geral",
      "GET /objetivos": "Listar objetivos", 
      "POST /objetivos": "Criar objetivo",
      "GET /objetivos/:id": "Obter objetivo",
      "PUT /objetivos/:id": "Atualizar objetivo",
      "DELETE /objetivos/:id": "Excluir objetivo",
      "GET /missoes": "Listar missões",
      "POST /missoes": "Criar missão",
      "POST /missoes/:id/concluir": "Concluir missão"
    }
  });
});

// --- 🚀 INICIALIZAÇÃO ---
app.listen(PORT, () => {
  console.log(`
🎯 SISTEMINHA DO PROTA - API COMPLETA
📍 URL: http://localhost:${PORT}
🧠 IA: ${HF_TOKEN ? '✅ CONFIGURADA' : '❌ NÃO CONFIGURADA'}

📊 ENDPOINTS PRINCIPAIS:
GET  /dashboard           - Dashboard com métricas
POST /objetivos           - Criar objetivo com IA
GET  /objetivos           - Listar objetivos  
POST /missoes/:id/concluir - Concluir missão
GET  /teste-ia            - Testar conexão IA

💾 ARMAZENAMENTO: Arquivos JSON em /data/
🎨 IA INTEGRADA: Geração automática de missões

${!HF_TOKEN ? '⚠️  Configure HF_TOKEN no .env para usar IA' : '✅ Tudo pronto! IA ativada!'}
  `);
});