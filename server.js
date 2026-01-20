// server.js - Sisteminha do Prota com DeepSeek/HuggingFace
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Importar o gerador de IA
const IAGenerator = require('./ia.js');
const iaGenerator = new IAGenerator();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar dados
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

// Ler dados
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao ler dados:', error);
    return { objectives: [], tasks: [], points: 0 };
  }
}

// Salvar dados
async function saveData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

// Página inicial - servir index.html da pasta front/index
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'front',  'index.html');
  
  // Enviar o arquivo index.html
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Erro ao carregar index.html:', err.message);
      
      // Se não encontrar, criar uma mensagem de erro amigável
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Sisteminha do Prota - Arquivo não encontrado</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
            }
            .error-container {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              max-width: 600px;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            h1 {
              color: #ffd700;
              margin-bottom: 20px;
            }
            code {
              background: rgba(0, 0, 0, 0.3);
              padding: 10px;
              border-radius: 5px;
              display: block;
              margin: 20px 0;
              font-family: 'Courier New', monospace;
            }
            a {
              color: #ffd700;
              text-decoration: none;
              font-weight: bold;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>📁 Arquivo não encontrado</h1>
            <p>O arquivo index.html não foi encontrado em:</p>
            <code>${indexPath}</code>
            <p>Por favor, crie a seguinte estrutura de pastas:</p>
            <code>
              seu-projeto/<br>
              ├── front/<br>
              │   └── index/<br>
              │       └── index.html<br>
              └── server.js
            </code>
            <p>Ou altere a rota no server.js para apontar para o local correto.</p>
            <p><a href="/health">🔍 Verificar status do servidor</a></p>
          </div>
        </body>
        </html>
      `);
    }
  });
});

// Servir arquivos estáticos
app.use('/static', express.static(path.join(__dirname, 'front')));
app.use('/static', express.static(path.join(__dirname, 'front', 'index')));
// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Sisteminha do Prota está funcionando!',
    timestamp: new Date().toISOString(),
    iaStatus: iaGenerator.useRealAI ? 'DeepSeek (HuggingFace)' : 'IA Simulada'
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
      tasksGenerated: false
    };
    
    data.objectives.push(objective);
    await saveData(data);
    
    res.status(201).json(objective);
  } catch (error) {
    console.error('Erro ao criar objetivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Listar objetivos
app.get('/objectives', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.objectives);
  } catch (error) {
    console.error('Erro ao listar objetivos:', error);
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
    
    // Verificar se já existem tarefas
    const existingTasks = data.tasks.filter(task => task.objectiveId === parseInt(id));
    if (existingTasks.length > 0) {
      return res.status(400).json({ 
        error: 'Este objetivo já possui tarefas',
        tasks: existingTasks
      });
    }
    
    // Gerar tarefas com IA
    const prompt = `${objective.title}: ${objective.description}`;
    const generatedTasks = await iaGenerator.generateTasks(prompt);
    
    // Formatar tarefas
    const formattedTasks = generatedTasks.map((task, index) => ({
      id: Date.now() + index + 1,
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime || 15,
      status: "pending",
      objectiveId: parseInt(id),
      createdAt: new Date().toISOString()
    }));
    
    // Adicionar ao banco
    formattedTasks.forEach(task => {
      data.tasks.push(task);
    });
    
    // Marcar objetivo como processado
    objective.tasksGenerated = true;
    objective.generatedAt = new Date().toISOString();
    
    await saveData(data);
    
    res.status(201).json({
      message: `Geradas ${formattedTasks.length} tarefas`,
      tasks: formattedTasks,
      iaSource: iaGenerator.useRealAI ? 'DeepSeek (HuggingFace)' : 'IA Simulada',
      objectiveId: parseInt(id)
    });
    
  } catch (error) {
    console.error('Erro ao gerar tarefas:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar tarefas',
      details: error.message
    });
  }
});

// Listar todas as tarefas
app.get('/tasks', async (req, res) => {
  try {
    const data = await readData();
    
    // Agrupar tarefas por objetivo
    const tasksByObjective = data.objectives.map(obj => ({
      objective: obj,
      tasks: data.tasks.filter(task => task.objectiveId === obj.id)
    }));
    
    res.json({
      totalTasks: data.tasks.length,
      tasksByObjective,
      allTasks: data.tasks
    });
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
    
    const task = data.tasks.find(t => t.id === parseInt(id));
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    if (task.status === 'done') {
      return res.status(400).json({ error: 'Tarefa já concluída' });
    }
    
    // Atualizar status
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    
    // Adicionar pontos
    data.points += 10;
    
    await saveData(data);
    
    res.json({
      message: 'Tarefa concluída! +10 pontos',
      task,
      totalPoints: data.points
    });
    
  } catch (error) {
    console.error('Erro ao marcar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter pontuação
app.get('/points', async (req, res) => {
  try {
    const data = await readData();
    
    const completedTasks = data.tasks.filter(t => t.status === 'done');
    const totalEstimatedTime = completedTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    
    res.json({
      points: data.points,
      completedTasks: completedTasks.length,
      totalTasks: data.tasks.length,
      totalTimeInvested: totalEstimatedTime,
      message: `🎉 Você investiu ${totalEstimatedTime} minutos em seu crescimento!`
    });
  } catch (error) {
    console.error('Erro ao obter pontos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Iniciar servidor
async function startServer() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`
    🚀 Sisteminha do Prota iniciado!
    🌐 Acesse: http://localhost:${PORT}
    
    🤖 Status IA: ${iaGenerator.useRealAI ? 'DeepSeek (HuggingFace) ✅' : 'IA Simulada ⚠️'}
    ${!iaGenerator.useRealAI ? 
      '\n   ⚠️  Adicione HF_TOKEN no arquivo .env para usar IA real:' +
      '\n   HF_TOKEN=sua_chave_aqui' +
      '\n   🔗 https://huggingface.co/settings/tokens' : 
      ''}
    
    💡 Dica: Acesse a página inicial para criar objetivos e gerar tarefas!
    `);
  });
}

startServer();