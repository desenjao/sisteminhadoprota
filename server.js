const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar dados se o arquivo não existir
async function initializeData() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    const initialData = {
      objectives: [],
      tasks: [],
      points: 0
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Ler dados do arquivo
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    return { objectives: [], tasks: [], points: 0 };
  }
}

// Salvar dados no arquivo
async function saveData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Simulação de IA (para MVP)
async function generateTasksWithAI(objective) {
  // Esta é uma simulação da IA
  // Em produção, você substituiria por uma chamada real a uma API de IA
  
  const tasks = [];
  const context = `Objetivo: ${objective.title}\nDescrição: ${objective.description}`;
  
  // Exemplos de tarefas geradas baseadas no objetivo
  const exampleTasks = [
    {
      id: Date.now() + 1,
      title: "Analisar o contexto do objetivo",
      description: "Entender completamente o que precisa ser feito",
      estimatedTime: 15,
      status: "pending",
      objectiveId: objective.id,
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 2,
      title: "Definir o primeiro passo mínimo",
      description: "Identificar a menor ação possível para começar",
      estimatedTime: 10,
      status: "pending",
      objectiveId: objective.id,
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 3,
      title: "Preparar ambiente de trabalho",
      description: "Organizar o espaço e ferramentas necessárias",
      estimatedTime: 20,
      status: "pending",
      objectiveId: objective.id,
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 4,
      title: "Executar o primeiro passo",
      description: "Fazer a primeira ação identificada",
      estimatedTime: 25,
      status: "pending",
      objectiveId: objective.id,
      createdAt: new Date().toISOString()
    },
    {
      id: Date.now() + 5,
      title: "Revisar e ajustar",
      description: "Verificar o progresso e planejar próximo passo",
      estimatedTime: 15,
      status: "pending",
      objectiveId: objective.id,
      createdAt: new Date().toISOString()
    }
  ];

  // Personalizar baseado no título do objetivo
  if (objective.title.toLowerCase().includes('sisteminha')) {
    exampleTasks[0].title = "Definir estrutura básica da API";
    exampleTasks[0].description = "Criar esqueleto do servidor com rotas principais";
    exampleTasks[1].title = "Configurar banco de dados JSON";
    exampleTasks[1].description = "Implementar funções de leitura/gravação no arquivo data.json";
    exampleTasks[2].title = "Implementar rota de criação de objetivos";
    exampleTasks[2].description = "Criar endpoint POST /objectives";
  }

  return exampleTasks;
}

// Página inicial
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sisteminha do Prota</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        min-height: 100vh;
        padding: 20px;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 40px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      header {
        text-align: center;
        margin-bottom: 40px;
      }
      
      h1 {
        font-size: 3rem;
        margin-bottom: 10px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .tagline {
        font-size: 1.2rem;
        opacity: 0.9;
        margin-bottom: 30px;
      }
      
      .sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
      }
      
      .section {
        background: rgba(255, 255, 255, 0.15);
        padding: 25px;
        border-radius: 15px;
        backdrop-filter: blur(5px);
      }
      
      h2 {
        margin-bottom: 15px;
        color: #ffd700;
        font-size: 1.5rem;
      }
      
      ul {
        list-style-position: inside;
        margin-left: 10px;
      }
      
      li {
        margin-bottom: 8px;
        opacity: 0.9;
      }
      
      .api-info {
        background: rgba(0, 0, 0, 0.2);
        padding: 25px;
        border-radius: 15px;
        margin-top: 30px;
      }
      
      code {
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
      }
      
      .endpoint {
        margin: 10px 0;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        font-family: 'Courier New', monospace;
      }
      
      .philosophy {
        text-align: center;
        font-style: italic;
        margin-top: 40px;
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 1.1rem;
        opacity: 0.9;
      }
      
      @media (max-width: 600px) {
        .container {
          padding: 20px;
        }
        
        h1 {
          font-size: 2rem;
        }
        
        .sections {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>🧠 Sisteminha do Prota</h1>
        <p class="tagline">Transformando objetivos grandes em pequenas tarefas possíveis</p>
      </header>
      
      <div class="sections">
        <div class="section">
          <h2>🎯 Propósito</h2>
          <p>Para pessoas que trabalham, chegam cansadas e precisam continuar projetos pessoais sem pressão.</p>
          <ul>
            <li>Tarefas de até 30 minutos</li>
            <li>Progresso sem culpa</li>
            <li>Recompensas por completar</li>
            <li>Sem penalidades</li>
          </ul>
        </div>
        
        <div class="section">
          <h2>✨ Princípios</h2>
          <ul>
            <li>Fazer pouco ainda é progresso</li>
            <li>Sistema para dias cansados</li>
            <li>Foco na continuidade</li>
            <li>Sem perfeccionismo</li>
            <li>Apenas reforço positivo</li>
          </ul>
        </div>
      </div>
      
      <div class="api-info">
        <h2>🚀 API Disponível</h2>
        <p>O servidor está rodando na porta ${PORT}. Use as seguintes rotas:</p>
        
        <div class="endpoint">
          <code>GET /health</code> - Status do servidor
        </div>
        
        <div class="endpoint">
          <code>POST /objectives</code> - Criar novo objetivo
        </div>
        
        <div class="endpoint">
          <code>GET /objectives</code> - Listar objetivos
        </div>
        
        <div class="endpoint">
          <code>POST /objectives/:id/generate-tasks</code> - Gerar tarefas com IA
        </div>
        
        <div class="endpoint">
          <code>GET /tasks</code> - Listar tarefas
        </div>
        
        <div class="endpoint">
          <code>PATCH /tasks/:id/done</code> - Marcar tarefa como concluída
        </div>
        
        <div class="endpoint">
          <code>GET /points</code> - Ver pontuação
        </div>
      </div>
      
      <div class="philosophy">
        "O sistema existe para funcionar em dias cansados.<br>
        Fazer pouco ainda é progresso."
      </div>
    </div>
    
    <script>
      // Exemplo simples de uso da API
      async function checkHealth() {
        try {
          const response = await fetch('/health');
          if (response.ok) {
            console.log('✅ Servidor está ativo e funcionando!');
          }
        } catch (error) {
          console.log('⚠️ Servidor em inicialização...');
        }
      }
      
      // Verificar saúde do servidor após carregar a página
      window.addEventListener('load', () => {
        setTimeout(checkHealth, 1000);
      });
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Sisteminha do Prota está funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Criar um novo objetivo
app.post('/objectives', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ 
        error: 'Título e descrição são obrigatórios' 
      });
    }
    
    const data = await readData();
    const objective = {
      id: Date.now(),
      title,
      description,
      createdAt: new Date().toISOString(),
      tasks: []
    };
    
    data.objectives.push(objective);
    await saveData(data);
    
    res.status(201).json(objective);
  } catch (error) {
    console.error('Erro ao criar objetivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar todos os objetivos
app.get('/objectives', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.objectives);
  } catch (error) {
    console.error('Erro ao listar objetivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter um objetivo específico com suas tarefas
app.get('/objectives/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const objective = data.objectives.find(obj => obj.id === parseInt(id));
    
    if (!objective) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }
    
    const tasks = data.tasks.filter(task => task.objectiveId === parseInt(id));
    
    res.json({
      ...objective,
      tasks
    });
  } catch (error) {
    console.error('Erro ao buscar objetivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar tarefas para um objetivo usando IA
app.post('/objectives/:id/generate-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const objective = data.objectives.find(obj => obj.id === parseInt(id));
    
    if (!objective) {
      return res.status(404).json({ error: 'Objetivo não encontrado' });
    }
    
    // Verificar se já existem tarefas para este objetivo
    const existingTasks = data.tasks.filter(task => task.objectiveId === parseInt(id));
    if (existingTasks.length > 0) {
      return res.status(400).json({ 
        error: 'Este objetivo já possui tarefas geradas',
        tasks: existingTasks
      });
    }
    
    // Gerar tarefas usando a "IA" simulada
    const generatedTasks = await generateTasksWithAI(objective);
    
    // Atribuir o ID do objetivo a cada tarefa
    generatedTasks.forEach(task => {
      task.objectiveId = parseInt(id);
      data.tasks.push(task);
    });
    
    await saveData(data);
    
    res.status(201).json({
      message: `Foram geradas ${generatedTasks.length} tarefas para o objetivo`,
      tasks: generatedTasks
    });
  } catch (error) {
    console.error('Erro ao gerar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar tarefas com filtros
app.get('/tasks', async (req, res) => {
  try {
    const { status, objectiveId } = req.query;
    const data = await readData();
    
    let tasks = [...data.tasks];
    
    // Aplicar filtros
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    
    if (objectiveId) {
      tasks = tasks.filter(task => task.objectiveId === parseInt(objectiveId));
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(tasks);
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar tarefa como concluída
app.patch('/tasks/:id/done', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const taskIndex = data.tasks.findIndex(task => task.id === parseInt(id));
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    const task = data.tasks[taskIndex];
    
    if (task.status === 'done') {
      return res.status(400).json({ error: 'Tarefa já está concluída' });
    }
    
    // Marcar como concluída
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    
    // Adicionar pontos (simples: 10 pontos por tarefa)
    const pointsToAdd = 10;
    data.points += pointsToAdd;
    
    await saveData(data);
    
    res.json({
      message: 'Tarefa marcada como concluída!',
      pointsAdded: pointsToAdd,
      totalPoints: data.points,
      task
    });
  } catch (error) {
    console.error('Erro ao marcar tarefa como concluída:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Reverter tarefa concluída (opcional)
app.patch('/tasks/:id/undo', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const taskIndex = data.tasks.findIndex(task => task.id === parseInt(id));
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    const task = data.tasks[taskIndex];
    
    if (task.status === 'pending') {
      return res.status(400).json({ error: 'Tarefa já está pendente' });
    }
    
    // Reverter para pendente
    task.status = 'pending';
    delete task.completedAt;
    
    // Remover pontos
    const pointsToRemove = 10;
    data.points = Math.max(0, data.points - pointsToRemove);
    
    await saveData(data);
    
    res.json({
      message: 'Tarefa revertida para pendente',
      pointsRemoved: pointsToRemove,
      totalPoints: data.points,
      task
    });
  } catch (error) {
    console.error('Erro ao reverter tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter pontuação total
app.get('/points', async (req, res) => {
  try {
    const data = await readData();
    res.json({ 
      points: data.points,
      message: `Você tem ${data.points} pontos! Continue assim!`
    });
  } catch (error) {
    console.error('Erro ao obter pontuação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: 'Consulte a documentação em / para ver as rotas disponíveis'
  });
});

// Inicializar e iniciar servidor
async function startServer() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`
    🚀 Sisteminha do Prota iniciado!
    
    🌐 Acesse: http://localhost:${PORT}
    
    📊 Rotas disponíveis:
    GET  /                    - Página inicial
    GET  /health             - Status do servidor
    POST /objectives         - Criar objetivo
    GET  /objectives         - Listar objetivos
    GET  /objectives/:id     - Obter objetivo específico
    POST /objectives/:id/generate-tasks - Gerar tarefas com IA
    GET  /tasks              - Listar tarefas
    PATCH /tasks/:id/done    - Marcar tarefa como concluída
    PATCH /tasks/:id/undo    - Reverter tarefa
    GET  /points             - Ver pontuação
    
    💡 Lembrete: O sistema existe para funcionar em dias cansados.
                 Fazer pouco ainda é progresso.
    `);
  });
}

startServer();