// server.js - Sisteminha do Prota 2.0 (Redução Máxima de Atrito)
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
      points: 0,
      userStats: {
        totalTimeInvested: 0,
        sessions: 0,
        lastActive: null,
        energyLevel: 'normal'
      },
      userSettings: {
        defaultEnergyLevel: 'normal',
        showAdvanced: false,
        notificationType: 'minimal'
      }
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
    return { 
      objectives: [], 
      tasks: [], 
      points: 0,
      userStats: {
        totalTimeInvested: 0,
        sessions: 0,
        lastActive: null,
        energyLevel: 'normal'
      },
      userSettings: {
        defaultEnergyLevel: 'normal',
        showAdvanced: false,
        notificationType: 'minimal'
      }
    };
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

// ==================== ROTAS PRINCIPAIS ====================

// Página inicial - Novo fluxo adaptativo
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'front', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sisteminha do Prota 2.0</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            margin: 0;
          }
          .container {
            max-width: 500px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          h1 {
            color: #ffd700;
            margin-bottom: 30px;
            font-size: 2.5rem;
          }
          .status {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid ${iaGenerator.useRealAI ? '#4ade80' : '#fbbf24'};
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🧠 Sisteminha do Prota 2.0</h1>
          <p>O arquivo index.html não foi encontrado.</p>
          <p>Por favor, crie um arquivo index.html na pasta front/</p>
          <div class="status">
            <strong>🤖 Status da IA:</strong> ${iaGenerator.useRealAI ? 'DeepSeek ✅' : 'Simulada ⚠️'}
          </div>
          <p><a href="/health" style="color: #ffd700;">Verificar API</a></p>
        </div>
      </body>
      </html>
      `);
    }
  });
});

// ==================== NOVAS ROTAS PARA AS MELHORIAS ====================

// MELHORIA 1: Fluxo de entrada adaptativo
app.post('/api/user/set-energy', async (req, res) => {
  try {
    const { energyLevel } = req.body;
    
    if (!['muito_cansado', 'normal', 'motivado'].includes(energyLevel)) {
      return res.status(400).json({ error: 'Nível de energia inválido' });
    }
    
    const data = await readData();
    data.userStats.energyLevel = energyLevel;
    data.userStats.lastActive = new Date().toISOString();
    data.userStats.sessions += 1;
    
    await saveData(data);
    
    // Traduzir para português amigável
    const levelMap = {
      'muito_cansado': 'Muito cansado (5 min)',
      'normal': 'Normal (10-15 min)',
      'motivado': 'Motivado (20-30 min)'
    };
    
    res.json({
      success: true,
      message: `Modo ${levelMap[energyLevel]} ativado`,
      recommendedTime: energyLevel === 'muito_cansado' ? 5 : 
                     energyLevel === 'normal' ? 15 : 30
    });
    
  } catch (error) {
    console.error('Erro ao definir nível de energia:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// MELHORIA 2: Objetivo em uma frase
app.post('/api/objectives/quick', async (req, res) => {
  try {
    const { objective, energyLevel } = req.body;
    
    if (!objective || objective.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Por favor, escreva seu objetivo em uma frase' 
      });
    }
    
    const data = await readData();
    
    // Criar objetivo simplificado
    const objectiveObj = {
      id: Date.now(),
      title: objective.trim(),
      description: `Objetivo rápido: ${objective.trim()}`,
      createdAt: new Date().toISOString(),
      isQuick: true,
      energyLevel: energyLevel || 'normal'
    };
    
    data.objectives.push(objectiveObj);
    
    // Determinar número de tarefas baseado na energia
    const taskCount = energyLevel === 'muito_cansado' ? 2 : 
                     energyLevel === 'normal' ? 3 : 4;
    
    // Gerar tarefas com IA (contexto melhorado)
    const prompt = `Objetivo: ${objective}

Contexto: Usuário está ${energyLevel === 'muito_cansado' ? 'muito cansado, precisa de tarefas SUPER simples de 5 minutos' : 
                         energyLevel === 'normal' ? 'em estado normal, pode fazer tarefas de 10-15 minutos' : 
                         'motivado, pode fazer tarefas de 20-30 minutos'}

Gere ${taskCount} micro-tarefas executáveis imediatamente:`;
    
    const generatedTasks = await iaGenerator.generateTasks(prompt);
    
    // Formatar tarefas
    const formattedTasks = generatedTasks.slice(0, taskCount).map((task, index) => ({
      id: Date.now() + index + 1000,
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime || 
                    (energyLevel === 'muito_cansado' ? 5 : 
                     energyLevel === 'normal' ? 15 : 25),
      status: "pending",
      objectiveId: objectiveObj.id,
      createdAt: new Date().toISOString(),
      priority: index + 1,
      coachingTip: getCoachingTip(energyLevel, index)
    }));
    
    // Adicionar tarefas
    formattedTasks.forEach(task => {
      data.tasks.push(task);
    });
    
    // Atualizar estatísticas
    if (!data.userStats.lastActive) {
      data.userStats.lastActive = new Date().toISOString();
    }
    
    await saveData(data);
    
    res.status(201).json({
      success: true,
      message: `Objetivo criado e ${formattedTasks.length} tarefas geradas`,
      objective: objectiveObj,
      tasks: formattedTasks,
      recommendedFirstTask: formattedTasks[0],
      coachingMessage: getInitialCoachingMessage(energyLevel)
    });
    
  } catch (error) {
    console.error('Erro ao criar objetivo rápido:', error);
    res.status(500).json({ 
      error: 'Erro ao processar objetivo',
      details: error.message 
    });
  }
});

// Funções de apoio para coaching
function getCoachingTip(energyLevel, taskIndex) {
  const tips = {
    muito_cansado: [
      "Só 5 minutinhos, depois pode parar",
      "Essa tarefa destrava tudo depois",
      "Faça devagar, sem pressão"
    ],
    normal: [
      "Essa é a mais importante pra começar",
      "Complete essa e já é progresso",
      "Foco no próximo passo, não no fim"
    ],
    motivado: [
      "Essa tarefa abre caminho pras outras",
      "Bom momento pra avançar mais",
      "Mantenha o ritmo, mas respeite seus limites"
    ]
  };
  
  return tips[energyLevel]?.[taskIndex] || "Você consegue!";
}

function getInitialCoachingMessage(energyLevel) {
  const messages = {
    muito_cansado: "🌟 Só uma tarefinha de 5 minutos já é vitória. Se cansar, pare sem culpa.",
    normal: "🚀 Boa! Comece pela primeira tarefa. 15 minutos já fazem diferença.",
    motivado: "💪 Ótima energia! Aproveite o momento, mas não esgote tudo hoje."
  };
  
  return messages[energyLevel] || "Vamos lá! Um passo de cada vez.";
}

// MELHORIA 3: Dashboard orientado à ação
app.get('/api/dashboard/action-oriented', async (req, res) => {
  try {
    const data = await readData();
    
    // Encontrar próxima tarefa recomendada
    const pendingTasks = data.tasks.filter(t => t.status === 'pending');
    
    let recommendedTask = null;
    
    if (pendingTasks.length > 0) {
      // Prioridade 1: Tarefas do objetivo mais recente
      const recentObjectives = data.objectives
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);
      
      for (const objective of recentObjectives) {
        const objectiveTasks = pendingTasks
          .filter(t => t.objectiveId === objective.id)
          .sort((a, b) => (a.priority || 999) - (b.priority || 999));
        
        if (objectiveTasks.length > 0) {
          recommendedTask = objectiveTasks[0];
          break;
        }
      }
      
      // Se não encontrou, pega a mais antiga pendente
      if (!recommendedTask && pendingTasks.length > 0) {
        recommendedTask = pendingTasks.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        )[0];
      }
    }
    
    // Formatar resposta do dashboard
    const response = {
      userStats: {
        points: data.points,
        totalObjectives: data.objectives.length,
        totalTasks: data.tasks.length,
        completedTasks: data.tasks.filter(t => t.status === 'done').length,
        energyLevel: data.userStats.energyLevel || 'normal',
        totalTimeInvested: data.userStats.totalTimeInvested || 0
      },
      recommendedTask: recommendedTask ? {
        id: recommendedTask.id,
        title: recommendedTask.title,
        description: recommendedTask.description,
        estimatedTime: recommendedTask.estimatedTime,
        objectiveId: recommendedTask.objectiveId,
        coachingTip: recommendedTask.coachingTip
      } : null,
      quickActions: [
        {
          id: 'quick_objective',
          title: '🎯 Novo objetivo rápido',
          description: 'Em uma frase só',
          action: 'create_quick'
        },
        {
          id: 'five_min_task',
          title: '⚡ Tarefa de 5 minutos',
          description: 'Algo super rápido',
          action: 'quick_five_min'
        }
      ],
      greeting: getGreeting(),
      coachingMessage: recommendedTask ? 
        `Próximo passo: ${recommendedTask.title} (${recommendedTask.estimatedTime} min)` :
        "Sem tarefas pendentes. Que tal criar um objetivo?"
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// MELHORIA 4: Modo foco (execução guiada)
app.get('/api/tasks/:id/focus-mode', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await readData();
    
    const task = data.tasks.find(t => t.id === parseInt(id));
    
    if (!task) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    const objective = data.objectives.find(o => o.id === task.objectiveId);
    
    // Formatar resposta para modo foco
    const focusResponse = {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        estimatedTime: task.estimatedTime,
        priority: task.priority || 1
      },
      objective: objective ? {
        title: objective.title,
        id: objective.id
      } : null,
      focusInstructions: [
        "💡 Foco apenas nesta tarefa",
        "⏰ Não se preocupe com o tempo",
        "🎯 Termine quando conseguir",
        "😌 Pode pausar a qualquer momento"
      ],
      actionSteps: breakDownTask(task.description),
      timerOptions: {
        recommended: task.estimatedTime,
        short: Math.max(5, Math.floor(task.estimatedTime / 2)),
        long: Math.min(60, task.estimatedTime * 2)
      }
    };
    
    res.json(focusResponse);
    
  } catch (error) {
    console.error('Erro no modo foco:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// MELHORIA 5: Decisão pós-tarefa
app.post('/api/tasks/:id/complete-with-next-step', async (req, res) => {
  try {
    const { id } = req.params;
    const { nextAction } = req.body;
    
    const data = await readData();
    
    const taskIndex = data.tasks.findIndex(t => t.id === parseInt(id));
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    
    const task = data.tasks[taskIndex];
    
    // Marcar como concluída
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    
    // Adicionar pontos
    const pointsToAdd = 10;
    data.points += pointsToAdd;
    
    // Atualizar tempo total investido
    data.userStats.totalTimeInvested += (task.estimatedTime || 15);
    
    // Encontrar próxima tarefa baseada na ação escolhida
    let nextTask = null;
    let message = '';
    
    switch (nextAction) {
      case 'stop':
        message = "🎉 Ótimo trabalho! Parar por hoje é a escolha certa. Descanse!";
        break;
        
      case 'another':
        // Encontrar próxima tarefa do mesmo objetivo
        const sameObjectiveTasks = data.tasks
          .filter(t => t.objectiveId === task.objectiveId && t.status === 'pending')
          .sort((a, b) => (a.priority || 999) - (b.priority || 999));
        
        if (sameObjectiveTasks.length > 0) {
          nextTask = sameObjectiveTasks[0];
          message = `💪 Boa! Próxima tarefa: ${nextTask.title}`;
        } else {
          message = "✅ Todas as tarefas desse objetivo foram concluídas!";
        }
        break;
        
      case 'different':
        // Encontrar qualquer próxima tarefa
        const allPendingTasks = data.tasks
          .filter(t => t.status === 'pending' && t.id !== task.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        if (allPendingTasks.length > 0) {
          nextTask = allPendingTasks[0];
          message = `🔄 Mudando de objetivo: ${nextTask.title}`;
        } else {
          message = "🌟 Todas as tarefas concluídas! Que tal um novo objetivo?";
        }
        break;
    }
    
    await saveData(data);
    
    res.json({
      success: true,
      message: `Tarefa concluída! +${pointsToAdd} pontos`,
      pointsAdded: pointsToAdd,
      totalPoints: data.points,
      nextStep: {
        action: nextAction,
        message: message,
        nextTask: nextTask,
        coachingMessage: getPostTaskCoaching(nextAction)
      }
    });
    
  } catch (error) {
    console.error('Erro ao completar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Funções auxiliares
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function breakDownTask(description) {
  // Divide a descrição em passos menores
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, 3).map((s, i) => `Paso ${i + 1}: ${s.trim()}`);
}

function getPostTaskCoaching(action) {
  const coaching = {
    stop: "Descansar é parte do progresso. Até amanhã!",
    another: "Mantendo o ritmo! Mas lembre: pode parar quando quiser.",
    different: "Variar é bom! Mas não sobrecarregue."
  };
  return coaching[action] || "Progresso feito!";
}

// ==================== ROTAS CRUD EXISTENTES (ATUALIZADAS) ====================

// Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Sisteminha do Prota 2.0 funcionando!',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    iaStatus: iaGenerator.useRealAI ? 'DeepSeek (HuggingFace)' : 'IA Simulada',
    features: [
      'Fluxo adaptativo',
      'Objetivo em uma frase',
      'Dashboard orientado à ação',
      'Modo foco',
      'Decisão pós-tarefa sem culpa'
    ]
  });
});

// Criar objetivo (rota tradicional - mantida para compatibilidade)
app.post('/objectives', async (req, res) => {
  try {
    const { title, description, energyLevel } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        error: 'Título é obrigatório' 
      });
    }
    
    const data = await readData();
    const objective = {
      id: Date.now(),
      title,
      description: description || `Objetivo: ${title}`,
      createdAt: new Date().toISOString(),
      tasksGenerated: false,
      energyLevel: energyLevel || data.userStats.energyLevel || 'normal',
      isQuick: false
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
    
    // Ordenar por data (mais recentes primeiro)
    const sortedObjectives = data.objectives.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    res.json(sortedObjectives);
  } catch (error) {
    console.error('Erro ao listar objetivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter objetivo específico
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
      tasks: tasks.sort((a, b) => (a.priority || 999) - (b.priority || 999)),
      stats: {
        totalTasks: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        estimatedTime: tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar objetivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar tarefas para objetivo (rota tradicional)
app.post('/objectives/:id/generate-tasks', async (req, res) => {
  try {
    const { id } = req.params;
    const { energyLevel } = req.body;
    
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
    
    // Determinar número de tarefas
    const taskEnergyLevel = energyLevel || objective.energyLevel || 'normal';
    const taskCount = taskEnergyLevel === 'muito_cansado' ? 2 : 
                     taskEnergyLevel === 'normal' ? 3 : 4;
    
    // Gerar tarefas com IA
    const prompt = `Objetivo: ${objective.title}: ${objective.description}

Contexto: Usuário está ${taskEnergyLevel === 'muito_cansado' ? 'muito cansado' : 
                         taskEnergyLevel === 'normal' ? 'normal' : 'motivado'}

Gere ${taskCount} micro-tarefas executáveis:`;
    
    const generatedTasks = await iaGenerator.generateTasks(prompt);
    
    // Formatar tarefas
    const formattedTasks = generatedTasks.slice(0, taskCount).map((task, index) => ({
      id: Date.now() + index + 1,
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime || 
                    (taskEnergyLevel === 'muito_cansado' ? 5 : 
                     taskEnergyLevel === 'normal' ? 15 : 25),
      status: "pending",
      objectiveId: parseInt(id),
      createdAt: new Date().toISOString(),
      priority: index + 1,
      coachingTip: getCoachingTip(taskEnergyLevel, index)
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
      objectiveId: parseInt(id),
      recommendedFirstTask: formattedTasks[0]
    });
    
  } catch (error) {
    console.error('Erro ao gerar tarefas:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar tarefas',
      details: error.message
    });
  }
});

// Listar todas as tarefas com filtros
app.get('/tasks', async (req, res) => {
  try {
    const { status, objectiveId, limit } = req.query;
    const data = await readData();
    
    let tasks = [...data.tasks];
    
    // Aplicar filtros
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    
    if (objectiveId) {
      tasks = tasks.filter(task => task.objectiveId === parseInt(objectiveId));
    }
    
    // Ordenar
    tasks.sort((a, b) => {
      // Pendentes primeiro
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      // Por prioridade
      return (a.priority || 999) - (b.priority || 999);
    });
    
    // Limitar se necessário
    if (limit) {
      tasks = tasks.slice(0, parseInt(limit));
    }
    
    res.json({
      total: tasks.length,
      tasks: tasks,
      stats: {
        pending: data.tasks.filter(t => t.status === 'pending').length,
        done: data.tasks.filter(t => t.status === 'done').length,
        estimatedTimeTotal: tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0)
      }
    });
  } catch (error) {
    console.error('Erro ao listar tarefas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Marcar tarefa como concluída (rota tradicional)
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
    const pointsToAdd = 10;
    data.points += pointsToAdd;
    
    // Atualizar tempo investido
    data.userStats.totalTimeInvested += (task.estimatedTime || 15);
    
    await saveData(data);
    
    res.json({
      message: 'Tarefa concluída! +10 pontos',
      task,
      totalPoints: data.points,
      timeInvested: data.userStats.totalTimeInvested,
      nextStepSuggestion: getNextStepSuggestion(data, task.objectiveId)
    });
    
  } catch (error) {
    console.error('Erro ao marcar tarefa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter pontuação e estatísticas
app.get('/points', async (req, res) => {
  try {
    const data = await readData();
    
    const completedTasks = data.tasks.filter(t => t.status === 'done');
    const totalEstimatedTime = completedTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);
    
    res.json({
      points: data.points,
      completedTasks: completedTasks.length,
      totalTasks: data.tasks.length,
      totalTimeInvested: data.userStats.totalTimeInvested,
      timePerTask: completedTasks.length > 0 ? 
        Math.round(data.userStats.totalTimeInvested / completedTasks.length) : 0,
      message: getPointsMessage(data.points),
      streak: calculateStreak(data),
      achievements: getAchievements(data)
    });
  } catch (error) {
    console.error('Erro ao obter pontos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== FUNÇÕES AUXILIARES ====================

function getPointsMessage(points) {
  if (points === 0) return "🎯 Primeiros passos! Crie seu primeiro objetivo.";
  if (points < 50) return "🚀 Começando bem! Continue com pequenas tarefas.";
  if (points < 200) return "🌟 Bom ritmo! Progresso consistente é a chave.";
  if (points < 500) return "💪 Impressionante! Você está criando um hábito.";
  return "🏆 Excelente! Você domina o sistema de micro-progresso.";
}

function calculateStreak(data) {
  if (!data.userStats.lastActive) return 0;
  
  const lastActive = new Date(data.userStats.lastActive);
  const today = new Date();
  const diffTime = Math.abs(today - lastActive);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 1 ? 1 : 0; // Streak simples
}

function getAchievements(data) {
  const achievements = [];
  
  if (data.points >= 10) {
    achievements.push({ id: 'first_points', name: 'Primeiros Passos', icon: '🎯' });
  }
  
  if (data.tasks.filter(t => t.status === 'done').length >= 5) {
    achievements.push({ id: 'five_tasks', name: '5 Tarefas Concluídas', icon: '✅' });
  }
  
  if (data.objectives.length >= 3) {
    achievements.push({ id: 'three_objectives', name: '3 Objetivos', icon: '🎯' });
  }
  
  if (data.userStats.totalTimeInvested >= 60) {
    achievements.push({ id: 'one_hour', name: '1 Hora Investida', icon: '⏰' });
  }
  
  return achievements;
}

function getNextStepSuggestion(data, objectiveId) {
  const pendingTasks = data.tasks.filter(t => 
    t.status === 'pending' && t.objectiveId === objectiveId
  );
  
  if (pendingTasks.length > 0) {
    const nextTask = pendingTasks.sort((a, b) => 
      (a.priority || 999) - (b.priority || 999)
    )[0];
    
    return {
      type: 'continue_objective',
      task: nextTask,
      message: `Próxima tarefa: ${nextTask.title}`
    };
  }
  
  // Se não há mais tarefas nesse objetivo
  const otherPendingTasks = data.tasks.filter(t => 
    t.status === 'pending' && t.objectiveId !== objectiveId
  );
  
  if (otherPendingTasks.length > 0) {
    return {
      type: 'switch_objective',
      message: 'Este objetivo está completo! Que tal outro?'
    };
  }
  
  return {
    type: 'create_new',
    message: 'Todas as tarefas concluídas! Novo objetivo?'
  };
}

// ==================== ROTA PARA TAREFA DE 5 MINUTOS ====================

app.post('/api/tasks/quick-five-min', async (req, res) => {
  try {
    const { category } = req.body;
    
    const categories = {
      organization: "Organização rápida",
      learning: "Aprendizado rápido",
      health: "Saúde rápida",
      creative: "Criatividade rápida"
    };
    
    const categoryName = categories[category] || "Tarefa rápida";
    
    const quickTask = {
      id: Date.now(),
      title: `${categoryName} (5 min)`,
      description: getQuickTaskDescription(category),
      estimatedTime: 5,
      status: "pending",
      objectiveId: null, // Tarefa avulsa
      createdAt: new Date().toISOString(),
      isQuickTask: true,
      coachingTip: "Apenas 5 minutos! Pode parar a qualquer momento."
    };
    
    const data = await readData();
    data.tasks.push(quickTask);
    await saveData(data);
    
    res.json({
      success: true,
      task: quickTask,
      message: "Tarefa de 5 minutos criada! Foque só nisso."
    });
    
  } catch (error) {
    console.error('Erro ao criar tarefa rápida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

function getQuickTaskDescription(category) {
  const tasks = {
    organization: "Organize uma pequena área da sua mesa ou arquivos digitais.",
    learning: "Leia um artigo curto ou assista a um vídeo educativo de 5 minutos.",
    health: "Faça um alongamento rápido ou respire profundamente por 1 minuto.",
    creative: "Escreva 3 ideias ou faça um esboço rápido de algo."
  };
  
  return tasks[category] || "Faça algo produtivo por apenas 5 minutos.";
}

// ==================== ROTA PARA ESTATÍSTICAS AVANÇADAS (ESCONDIDA) ====================

app.get('/api/advanced/stats', async (req, res) => {
  try {
    const data = await readData();
    
    // Só mostra se o usuário tiver certa experiência
    if (data.tasks.filter(t => t.status === 'done').length < 5) {
      return res.status(403).json({
        error: 'Estatísticas avançadas disponíveis após 5 tarefas concluídas',
        required: 5,
        current: data.tasks.filter(t => t.status === 'done').length
      });
    }
    
    const advancedStats = {
      productivity: {
        tasksPerDay: calculateTasksPerDay(data),
        averageTimePerTask: calculateAverageTime(data),
        bestTimeOfDay: analyzeBestTime(data),
        completionRate: calculateCompletionRate(data)
      },
      patterns: {
        favoriteEnergyLevel: getFavoriteEnergyLevel(data),
        mostProductiveObjective: getMostProductiveObjective(data),
        taskDurationPattern: analyzeTaskDurationPattern(data)
      },
      insights: generateInsights(data)
    };
    
    res.json(advancedStats);
    
  } catch (error) {
    console.error('Erro nas estatísticas avançadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

async function startServer() {
  await initializeData();
  
  app.listen(PORT, () => {
    console.log(`
    🚀 SISTEMINHA DO PROTA 2.0 INICIADO!
    ========================================
    
    🌐 Acesse: http://localhost:${PORT}
    
    🤖 Status IA: ${iaGenerator.useRealAI ? 'DeepSeek (HuggingFace) ✅' : 'IA Simulada ⚠️'}
    
    🎯 NOVAS FUNCIONALIDADES:
    1. Fluxo adaptativo por energia
    2. Objetivo em uma frase
    3. Dashboard orientado à ação
    4. Modo foco guiado
    5. Decisão pós-tarefa sem culpa
    
    📊 ROTAS PRINCIPAIS:
    GET  /                            - Página inicial (novo fluxo)
    POST /api/user/set-energy         - Definir nível de energia
    POST /api/objectives/quick        - Objetivo rápido em uma frase
    GET  /api/dashboard/action-oriented - Dashboard inteligente
    GET  /api/tasks/:id/focus-mode    - Modo foco guiado
    POST /api/tasks/:id/complete-with-next-step - Conclusão com próximo passo
    
    🔧 ROTAS TRADICIONAIS (mantidas):
    GET  /health                      - Status do sistema
    POST /objectives                  - Criar objetivo tradicional
    GET  /objectives                  - Listar objetivos
    POST /objectives/:id/generate-tasks - Gerar tarefas com IA
    PATCH /tasks/:id/done             - Marcar tarefa como concluída
    GET  /points                      - Ver pontuação
    
    💡 PRINCÍPIO DO SISTEMA 2.0:
    "Usuário cansado não quer escolher.
    Quer ser conduzido com dignidade."
    
    ${!iaGenerator.useRealAI ? 
      '\n   ⚠️  DICA: Adicione HF_TOKEN no .env para IA real:' +
      '\n   HF_TOKEN=sua_chave_aqui' +
      '\n   🔗 https://huggingface.co/settings/tokens' : 
      ''}
    
    ========================================
    `);
  });
}

// Funções auxiliares para estatísticas avançadas
function calculateTasksPerDay(data) {
  const completedTasks = data.tasks.filter(t => t.status === 'done');
  if (completedTasks.length === 0) return 0;
  
  const firstTask = new Date(Math.min(...completedTasks.map(t => new Date(t.completedAt))));
  const lastTask = new Date(Math.max(...completedTasks.map(t => new Date(t.completedAt))));
  const days = Math.max(1, (lastTask - firstTask) / (1000 * 60 * 60 * 24));
  
  return (completedTasks.length / days).toFixed(2);
}

function calculateAverageTime(data) {
  const completedTasks = data.tasks.filter(t => t.status === 'done' && t.estimatedTime);
  if (completedTasks.length === 0) return 0;
  
  const total = completedTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  return Math.round(total / completedTasks.length);
}

function analyzeBestTime(data) {
  // Implementação simplificada
  return "Noite (após 18h)";
}

function calculateCompletionRate(data) {
  if (data.tasks.length === 0) return 0;
  return Math.round((data.tasks.filter(t => t.status === 'done').length / data.tasks.length) * 100);
}

function getFavoriteEnergyLevel(data) {
  const objectives = data.objectives.filter(o => o.energyLevel);
  if (objectives.length === 0) return "normal";
  
  const counts = {};
  objectives.forEach(o => {
    counts[o.energyLevel] = (counts[o.energyLevel] || 0) + 1;
  });
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

function getMostProductiveObjective(data) {
  const objectivesWithTasks = data.objectives.map(obj => {
    const tasks = data.tasks.filter(t => t.objectiveId === obj.id);
    const completed = tasks.filter(t => t.status === 'done').length;
    return { ...obj, completed, total: tasks.length };
  });
  
  const productive = objectivesWithTasks.filter(o => o.total > 0)
    .sort((a, b) => (b.completed / b.total) - (a.completed / a.total));
  
  return productive[0] || null;
}

function analyzeTaskDurationPattern(data) {
  const tasks = data.tasks.filter(t => t.estimatedTime);
  if (tasks.length === 0) return "Sem dados suficientes";
  
  const avg = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0) / tasks.length;
  
  if (avg <= 10) return "Prefere tarefas rápidas (até 10 min)";
  if (avg <= 20) return "Tarefas moderadas (10-20 min)";
  return "Tarefas mais longas (20+ min)";
}

function generateInsights(data) {
  const insights = [];
  
  const completionRate = calculateCompletionRate(data);
  if (completionRate > 80) {
    insights.push("🎯 Excelente taxa de conclusão! Você segue bem as tarefas.");
  } else if (completionRate < 50) {
    insights.push("💡 Talvez as tarefas estejam muito longas. Tente de 5-10 min.");
  }
  
  const avgTime = calculateAverageTime(data);
  if (avgTime > 25) {
    insights.push("⏰ Suas tarefas são longas. Que tal quebrar em menores?");
  } else if (avgTime < 10) {
    insights.push("⚡ Você é rápido! Continue com tarefas curtas e frequentes.");
  }
  
  if (data.objectives.length > 5 && data.tasks.filter(t => t.status === 'done').length < 10) {
    insights.push("📝 Muitos objetivos, poucas conclusões. Foque em um por vez.");
  }
  
  if (insights.length === 0) {
    insights.push("🌟 Continue assim! Pequenos passos levam longe.");
  }
  
  return insights;
}

startServer();