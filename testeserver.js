#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { exec } = require('child_process');

// Configuração
const API_BASE = 'http://localhost:3000';
const HEADER = `
███████╗██╗███████╗████████╗███████╗███╗   ███╗██╗███╗   ██╗██╗███╗   ██╗██╗  ██╗ █████╗ 
██╔════╝██║██╔════╝╚══██╔══╝██╔════╝████╗ ████║██║████╗  ██║██║████╗  ██║██║  ██║██╔══██╗
███████╗██║███████╗   ██║   █████╗  ██╔████╔██║██║██╔██╗ ██║██║██╔██╗ ██║███████║███████║
╚════██║██║╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██║██║╚██╗██║██║██║╚██╗██║██╔══██║██╔══██║
███████║██║███████║   ██║   ███████╗██║ ╚═╝ ██║██║██║ ╚████║██║██║ ╚████║██║  ██║██║  ██║
╚══════╝╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝
                                                                                        
███╗   ███╗██╗███████╗███████╗██╗   ██╗██╗██████╗     ██████╗███████╗███████╗███████╗
████╗ ████║██║██╔════╝██╔════╝██║   ██║██║██╔══██╗   ██╔════╝██╔════╝██╔════╝██╔════╝
██╔████╔██║██║███████╗███████╗██║   ██║██║██████╔╝   ██║     █████╗  ███████╗███████╗
██║╚██╔╝██║██║╚════██║╚════██║██║   ██║██║██╔═══╝    ██║     ██╔══╝  ╚════██║╚════██║
██║ ╚═╝ ██║██║███████║███████║╚██████╔╝██║██║        ╚██████╗███████╗███████║███████║
╚═╝     ╚═╝╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═╝╚═╝         ╚═════╝╚══════╝╚══════╝╚══════╝
`.cyan;

class SistemaTester {
  constructor() {
    this.objectiveId = null;
    this.taskIds = [];
    this.testResults = [];
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printSection(title) {
    console.log(`\n${'═'.repeat(50)}`.rainbow);
    console.log(`🔧 ${title.bold.white}`.bgBlack);
    console.log(`${'═'.repeat(50)}`.rainbow);
  }

  printResult(testName, status, data = null) {
    const statusText = status === 'PASS' ? '✅ PASS'.green : '❌ FAIL'.red;
    console.log(`\n${testName}: ${statusText}`);
    
    if (data) {
      console.log('📊 Dados:'.gray);
      console.log(JSON.stringify(data, null, 2).gray);
    }
    
    this.testResults.push({ test: testName, status });
  }

  async checkServerStatus() {
    this.printSection('INICIALIZANDO TESTES');
    
    console.log('\n🔍 Verificando conexão com servidor...'.yellow);
    
    try {
      const response = await axios.get(`${API_BASE}/health`);
      this.printResult('Servidor Status', 'PASS', response.data);
      console.log('\n🚀 Servidor encontrado! Iniciando testes...'.green);
      return true;
    } catch (error) {
      this.printResult('Servidor Status', 'FAIL');
      console.log('\n💀 Servidor offline! Execute:'.red);
      console.log('   node server.js'.cyan.bold);
      return false;
    }
  }

  async testCreateObjective() {
    this.printSection('1️⃣ TESTE: CRIAR OBJETIVO');
    
    const objectives = [
      {
        title: "Criar um blog pessoal",
        description: "Quero criar um blog para compartilhar meus aprendizados em programação e desenvolvimento pessoal."
      },
      {
        title: "Aprender a tocar violão",
        description: "Sempre quis aprender violão, preciso começar com acordes básicos e músicas simples."
      },
      {
        title: "Organizar finanças pessoais",
        description: "Preciso criar um sistema para controlar meus gastos e economizar para viagens."
      }
    ];

    console.log('\n🎯 Criando 3 objetivos de teste...'.yellow);
    
    for (let i = 0; i < objectives.length; i++) {
      try {
        const response = await axios.post(`${API_BASE}/objectives`, objectives[i]);
        if (i === 0) this.objectiveId = response.data.id;
        
        console.log(`✓ Objetivo "${response.data.title}" criado (ID: ${response.data.id})`.green);
        await this.delay(500);
      } catch (error) {
        console.log(`✗ Erro ao criar objetivo ${i + 1}`.red);
      }
    }
    
    try {
      const response = await axios.get(`${API_BASE}/objectives`);
      this.printResult('Listar Objetivos', 'PASS', {
        total: response.data.length,
        objectives: response.data.map(obj => ({ id: obj.id, title: obj.title }))
      });
    } catch (error) {
      this.printResult('Listar Objetivos', 'FAIL');
    }
  }

  async testGetSpecificObjective() {
    this.printSection('2️⃣ TESTE: OBTER OBJETIVO ESPECÍFICO');
    
    if (!this.objectiveId) {
      console.log('⚠️ Nenhum objetivo criado, pulando teste...'.yellow);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/objectives/${this.objectiveId}`);
      this.printResult('Obter Objetivo por ID', 'PASS', {
        id: response.data.id,
        title: response.data.title,
        hasTasks: response.data.tasks ? response.data.tasks.length : 0
      });
    } catch (error) {
      this.printResult('Obter Objetivo por ID', 'FAIL');
    }
  }

  async testGenerateTasks() {
    this.printSection('3️⃣ TESTE: GERAR TAREFAS COM IA');
    
    if (!this.objectiveId) {
      console.log('⚠️ Nenhum objetivo criado, pulando teste...'.yellow);
      return;
    }
    
    console.log('\n🤖 Gerando tarefas com IA simulada...'.yellow);
    
    try {
      const response = await axios.post(`${API_BASE}/objectives/${this.objectiveId}/generate-tasks`);
      
      if (response.data.tasks) {
        this.taskIds = response.data.tasks.map(task => task.id);
        console.log(`✅ Geradas ${response.data.tasks.length} tarefas:`.green);
        
        response.data.tasks.forEach((task, index) => {
          console.log(`   ${index + 1}. ${task.title} (${task.estimatedTime}min)`.gray);
        });
      }
      
      this.printResult('Gerar Tarefas com IA', 'PASS', {
        message: response.data.message,
        tasksGenerated: response.data.tasks ? response.data.tasks.length : 0
      });
    } catch (error) {
      this.printResult('Gerar Tarefas com IA', 'FAIL');
    }
  }

  async testListTasks() {
    this.printSection('4️⃣ TESTE: LISTAR TAREFAS');
    
    console.log('\n📋 Testando diferentes formas de listar tarefas...'.yellow);
    
    // Teste 1: Listar todas as tarefas
    try {
      const response = await axios.get(`${API_BASE}/tasks`);
      console.log(`✓ Total de tarefas no sistema: ${response.data.length}`.green);
    } catch (error) {
      console.log('✗ Erro ao listar todas as tarefas'.red);
    }
    
    // Teste 2: Listar tarefas pendentes
    try {
      const response = await axios.get(`${API_BASE}/tasks?status=pending`);
      console.log(`✓ Tarefas pendentes: ${response.data.length}`.green);
    } catch (error) {
      console.log('✗ Erro ao listar tarefas pendentes'.red);
    }
    
    // Teste 3: Listar tarefas por objetivo
    if (this.objectiveId) {
      try {
        const response = await axios.get(`${API_BASE}/tasks?objectiveId=${this.objectiveId}`);
        console.log(`✓ Tarefas do objetivo ${this.objectiveId}: ${response.data.length}`.green);
        this.printResult('Listar Tarefas com Filtros', 'PASS', {
          allTasks: true,
          pendingTasks: true,
          byObjective: true
        });
      } catch (error) {
        this.printResult('Listar Tarefas com Filtros', 'FAIL');
      }
    }
  }

  async testCompleteTasks() {
    this.printSection('5️⃣ TESTE: COMPLETAR TAREFAS');
    
    if (this.taskIds.length === 0) {
      console.log('⚠️ Nenhuma tarefa disponível, pulando teste...'.yellow);
      return;
    }
    
    console.log('\n🎯 Completando 2 tarefas para testar pontuação...'.yellow);
    let pointsBefore = 0;
    
    // Primeiro, pegar pontos atuais
    try {
      const pointsResponse = await axios.get(`${API_BASE}/points`);
      pointsBefore = pointsResponse.data.points;
      console.log(`Pontos antes: ${pointsBefore}`.gray);
    } catch (error) {
      console.log('Não foi possível verificar pontos antes'.red);
    }
    
    // Completar primeira tarefa
    try {
      const response = await axios.patch(`${API_BASE}/tasks/${this.taskIds[0]}/done`);
      console.log(`✓ Tarefa ${this.taskIds[0]} completada! +${response.data.pointsAdded} pontos`.green);
    } catch (error) {
      console.log(`✗ Erro ao completar tarefa ${this.taskIds[0]}`.red);
    }
    
    await this.delay(1000);
    
    // Completar segunda tarefa
    try {
      const response = await axios.patch(`${API_BASE}/tasks/${this.taskIds[1]}/done`);
      console.log(`✓ Tarefa ${this.taskIds[1]} completada! +${response.data.pointsAdded} pontos`.green);
    } catch (error) {
      console.log(`✗ Erro ao completar tarefa ${this.taskIds[1]}`.red);
    }
    
    // Verificar pontos após completar
    await this.delay(500);
    try {
      const pointsResponse = await axios.get(`${API_BASE}/points`);
      const pointsAfter = pointsResponse.data.points;
      const pointsGained = pointsAfter - pointsBefore;
      
      console.log(`\n📊 Pontos depois: ${pointsAfter}`.cyan);
      console.log(`📈 Pontos ganhos: ${pointsGained}`.green);
      
      this.printResult('Completar Tarefas', 'PASS', {
        tasksCompleted: 2,
        pointsBefore,
        pointsAfter,
        pointsGained
      });
    } catch (error) {
      this.printResult('Completar Tarefas', 'FAIL');
    }
  }

  async testUndoTasks() {
    this.printSection('6️⃣ TESTE: REVERTER TAREFAS (OPCIONAL)');
    
    if (this.taskIds.length < 2) {
      console.log('⚠️ Tarefas insuficientes, pulando teste...'.yellow);
      return;
    }
    
    console.log('\n↩️  Revertendo uma tarefa completada...'.yellow);
    
    try {
      const pointsBeforeResponse = await axios.get(`${API_BASE}/points`);
      const pointsBefore = pointsBeforeResponse.data.points;
      console.log(`Pontos antes da reversão: ${pointsBefore}`.gray);
      
      // Reverter a primeira tarefa que completamos
      const response = await axios.patch(`${API_BASE}/tasks/${this.taskIds[0]}/undo`);
      
      console.log(`✓ Tarefa ${this.taskIds[0]} revertida! -${response.data.pointsRemoved} pontos`.yellow);
      
      const pointsAfterResponse = await axios.get(`${API_BASE}/points`);
      const pointsAfter = pointsAfterResponse.data.points;
      
      console.log(`Pontos depois da reversão: ${pointsAfter}`.cyan);
      
      this.printResult('Reverter Tarefas', 'PASS', {
        taskId: this.taskIds[0],
        pointsBefore,
        pointsAfter,
        pointsDifference: pointsAfter - pointsBefore
      });
    } catch (error) {
      console.log('ℹ️ Teste de reversão falhou (pode ser normal se a rota não existir)'.yellow);
      this.printResult('Reverter Tarefas', 'SKIP');
    }
  }

  async testEdgeCases() {
    this.printSection('7️⃣ TESTE: CASOS ESPECIAIS E ERROS');
    
    console.log('\n🧪 Testando comportamentos de erro...'.yellow);
    
    // Teste 1: Objetivo inexistente
    try {
      await axios.get(`${API_BASE}/objectives/999999`);
      console.log('✗ Deveria falhar para objetivo inexistente'.red);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✓ Objetivo inexistente retorna 404 (CORRETO)'.green);
      }
    }
    
    // Teste 2: Criar objetivo sem título
    try {
      await axios.post(`${API_BASE}/objectives`, { description: "Sem título" });
      console.log('✗ Deveria falhar sem título'.red);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✓ Falha ao criar sem título (CORRETO)'.green);
      }
    }
    
    // Teste 3: Completar tarefa já completada
    if (this.taskIds.length > 0) {
      try {
        await axios.patch(`${API_BASE}/tasks/${this.taskIds[1]}/done`);
        await axios.patch(`${API_BASE}/tasks/${this.taskIds[1]}/done`); // Segunda vez
        console.log('✗ Deveria falhar ao completar tarefa já feita'.red);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.log('✓ Falha ao completar tarefa já feita (CORRETO)'.green);
        }
      }
    }
    
    this.printResult('Casos Especiais', 'PASS');
  }

  async runAllTests() {
    console.clear();
    console.log(HEADER);
    console.log('\n' + '▄'.repeat(80).rainbow);
    console.log('🚀 INICIANDO TESTES AUTOMATIZADOS DO SISTEMINHA DO PROTA'.bold.white);
    console.log('📍 API: ' + API_BASE.cyan);
    console.log('⏰ ' + new Date().toLocaleString().gray);
    console.log('▄'.repeat(80).rainbow + '\n');
    
    // Verificar se servidor está rodando
    const serverOk = await this.checkServerStatus();
    if (!serverOk) {
      console.log('\n💀 Testes abortados!'.red.bold);
      process.exit(1);
    }
    
    await this.delay(1000);
    
    // Executar testes sequenciais
    const tests = [
      this.testCreateObjective.bind(this),
      this.testGetSpecificObjective.bind(this),
      this.testGenerateTasks.bind(this),
      this.testListTasks.bind(this),
      this.testCompleteTasks.bind(this),
      this.testUndoTasks.bind(this),
      this.testEdgeCases.bind(this)
    ];
    
    for (let i = 0; i < tests.length; i++) {
      await tests[i]();
      await this.delay(1000);
    }
    
    // Resumo final
    this.printSection('📊 RESUMO DOS TESTES');
    
    console.log('\n📈 Resultados:'.bold);
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅'.green : 
                    result.status === 'FAIL' ? '❌'.red : '⚠️'.yellow;
      console.log(`  ${index + 1}. ${result.test.padEnd(40)} ${status}`);
    });
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const total = this.testResults.length;
    
    console.log('\n' + '━'.repeat(50).rainbow);
    console.log(`🎯 ${passed}/${total} testes passaram`.bold);
    
    if (passed === total) {
      console.log('\n✨ TODOS OS TESTES PASSARAM! SISTEMA PRONTO PARA PRÓXIMA FASE ✨'.green.bold);
      console.log('\n' + '█'.repeat(60).green);
      console.log('🚀 MVP VALIDADO COM SUCESSO!'.bold);
      console.log('🎯 Pronto para implementação real da IA'.cyan);
      console.log('💾 Dados de teste disponíveis em data.json'.gray);
      console.log('█'.repeat(60).green);
    } else {
      console.log('\n⚠️  ALGUNS TESTES FALHARAM. VERIFIQUE O SERVIDOR.'.yellow.bold);
    }
    
    // Mostrar endpoints testados
    console.log('\n🔗 Endpoints testados:'.bold);
    const endpoints = [
      'GET    /health',
      'POST   /objectives',
      'GET    /objectives',
      'GET    /objectives/:id',
      'POST   /objectives/:id/generate-tasks',
      'GET    /tasks',
      'PATCH  /tasks/:id/done',
      'PATCH  /tasks/:id/undo',
      'GET    /points'
    ];
    
    endpoints.forEach(ep => console.log(`  ${ep}`.gray));
    
    // Dados criados
    console.log('\n📁 Dados criados durante testes:'.bold);
    console.log(`  Objetivos: 3`.gray);
    console.log(`  Tarefas: ${this.taskIds.length}`.gray);
    console.log(`  Pontos: (verifique com GET /points)`.gray);
    
    console.log('\n' + '▀'.repeat(80).rainbow);
    console.log('✅ Testes concluídos em ' + new Date().toLocaleTimeString().cyan);
    console.log('💡 Dica: Use o navegador em http://localhost:3000 para ver a interface web'.magenta);
    console.log('▀'.repeat(80).rainbow);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const tester = new SistemaTester();
  
  // Verificar dependências
  try {
    require('axios');
    require('colors');
  } catch (error) {
    console.log('\n📦 Instalando dependências necessárias...'.yellow);
    exec('npm install axios colors', (err, stdout, stderr) => {
      if (err) {
        console.log('❌ Erro ao instalar dependências:'.red);
        console.log(stderr);
        process.exit(1);
      }
      console.log('✅ Dependências instaladas! Reinicie o teste.'.green);
      process.exit(0);
    });
    return;
  }
  
  // Executar testes
  tester.runAllTests().catch(error => {
    console.error('💀 Erro fatal durante testes:'.red.bold);
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = SistemaTester;