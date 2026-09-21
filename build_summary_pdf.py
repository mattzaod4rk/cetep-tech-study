import os
import subprocess

html_content = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Resumo Completo - CETEP Tech Study</title>
<style>
  @page {
    size: A4 portrait;
    margin: 11mm 15mm 11mm 15mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 9pt;
    line-height: 1.32;
    color: #000000;
    background: #ffffff;
    text-align: justify;
  }

  /* ── Header ── */
  .header-box {
    border: 1.8px solid #000;
    padding: 6px 10px;
    margin-bottom: 10px;
  }
  .header-table { width: 100%; border-collapse: collapse; }
  .logo-cell {
    width: 70px;
    vertical-align: middle;
    text-align: center;
    padding-right: 10px;
    border-right: 1.5px solid #000;
  }
  .info-cell { padding-left: 12px; vertical-align: middle; }
  .school-title {
    text-align: center;
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.2;
    margin-bottom: 5px;
  }
  .hdr-fields { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .hdr-fields td { padding: 1.5px 0; }

  /* ── Document Title ── */
  .doc-title {
    text-align: center;
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 8px;
    letter-spacing: 0.02em;
  }
  .doc-sub {
    text-align: center;
    font-size: 8.5pt;
    color: #333;
    margin-bottom: 10px;
  }

  /* ── Section Heading ── */
  h2 {
    font-size: 9.4pt;
    font-weight: bold;
    text-transform: uppercase;
    background: #000;
    color: #fff;
    padding: 3px 7px;
    margin-top: 9px;
    margin-bottom: 4px;
    letter-spacing: 0.03em;
  }
  h3 {
    font-size: 9pt;
    font-weight: bold;
    margin-top: 5px;
    margin-bottom: 2px;
    color: #000;
    border-bottom: 0.5px solid #999;
    padding-bottom: 1px;
  }

  p { margin-bottom: 4px; text-indent: 0; }

  /* ── Table ── */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 4px 0;
    font-size: 8.2pt;
  }
  table.data-table th {
    background: #222;
    color: #fff;
    padding: 3px 6px;
    text-align: left;
    font-size: 8pt;
  }
  table.data-table td {
    padding: 2.5px 6px;
    border-bottom: 0.5px solid #ddd;
    vertical-align: top;
  }
  table.data-table tr:nth-child(even) td { background: #f5f5f5; }

  /* ── Code Block ── */
  .code-block {
    background: #f3f3f3;
    border: 0.8px solid #bbb;
    border-left: 3px solid #000;
    font-family: "Courier New", Courier, monospace;
    font-size: 7.4pt;
    line-height: 1.4;
    padding: 5px 8px;
    margin: 4px 0;
    white-space: pre;
  }

  /* ── Info Box ── */
  .info-box {
    background: #f7f7f7;
    border: 0.8px solid #aaa;
    border-left: 3.5px solid #000;
    padding: 5px 9px;
    margin: 5px 0;
    font-size: 8.5pt;
  }

  /* ── Two-column list ── */
  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 16px;
    font-size: 8.4pt;
  }
  .two-col li { list-style: none; padding-left: 8px; position: relative; }
  .two-col li::before { content: "•"; position: absolute; left: 0; }

  /* ── Bullet list ── */
  .blist { margin: 3px 0 4px 0; }
  .blist li {
    list-style: none;
    padding-left: 10px;
    position: relative;
    margin-bottom: 2px;
    font-size: 8.4pt;
  }
  .blist li::before { content: "—"; position: absolute; left: 0; }

  /* ── Page Break ── */
  .pb { page-break-before: always; }

  /* ── Divider ── */
  .divider { border-top: 0.5px solid #999; margin: 6px 0; }
</style>
</head>
<body>

<!-- ════════════════ HEADER ════════════════ -->
<div class="header-box">
  <table class="header-table">
    <tr>
      <td class="logo-cell">
        <svg width="62" height="62" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#b22222" stroke-width="2.5"/>
          <path d="M 22 50 Q 50 16 78 50 Q 50 84 22 50" fill="none" stroke="#2e8b57" stroke-width="2"/>
          <text x="50" y="35" font-size="10.5" font-family="Arial" font-weight="bold" fill="#b22222" text-anchor="middle">CETEP</text>
          <text x="50" y="46" font-size="5.8" font-family="Arial" font-weight="bold" fill="#111" text-anchor="middle">RECÔNCAVO II</text>
          <text x="50" y="55" font-size="6.2" font-family="Arial" font-weight="bold" fill="#111" text-anchor="middle">ALBERTO TORRES</text>
          <text x="50" y="66" font-size="4.8" font-family="Arial" fill="#555" text-anchor="middle">Cruz das Almas - BA</text>
          <text x="50" y="75" font-size="4.8" font-family="Arial" font-weight="bold" fill="#b22222" text-anchor="middle">Desde 1948</text>
        </svg>
      </td>
      <td class="info-cell">
        <div class="school-title">
          CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL<br>
          RECÔNCAVO II ALBERTO TORRES
        </div>
        <table class="hdr-fields">
          <tr>
            <td><strong>Projeto:</strong> CETEP Tech Study</td>
            <td><strong>Versão:</strong> MVP 1.0</td>
            <td><strong>Data:</strong> Set./2026</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Curso:</strong> Técnico em Informática Integrado ao Ensino Médio</td>
            <td><strong>Público-alvo:</strong> 2º Ano / AEE</td>
          </tr>
          <tr>
            <td colspan="3"><strong>Repositório:</strong> github.com/mattzaod4rk/cetep-tech-study</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>

<!-- ════════════════ TITLE ════════════════ -->
<div class="doc-title">RESUMO COMPLETO DO PROJETO — CETEP TECH STUDY</div>
<div class="doc-sub">Documento de referência técnica e funcional | AEE — Técnico em Informática | CETEP Alberto Torres, Cruz das Almas — BA</div>

<!-- ════════════════ 1. VISÃO GERAL ════════════════ -->
<h2>1. Visão Geral</h2>
<p>O <strong>CETEP Tech Study</strong> é uma aplicação web do tipo SPA (Single Page Application) desenvolvida com <strong>React 18 + Vite</strong> e sistema de design próprio em CSS puro (sem Tailwind). O armazenamento de dados é local, via <em>localStorage</em> do navegador, sem backend externo. A arquitetura foi planejada com camada de acesso a dados isolada (<em>Adapter Pattern</em>), permitindo futura migração para banco de dados real (ex: Supabase) sem reescrita das telas.</p>
<p>O sistema foi concebido para organizar a rotina de estudos de estudantes do curso <strong>Técnico em Informática do CETEP Alberto Torres</strong>, com foco especial em acessibilidade para alunos com TDAH, TEA e baixa visão — sem se apresentar como ferramenta médica.</p>

<!-- ════════════════ 2. PAPÉIS DE USUÁRIO ════════════════ -->
<h2>2. Papéis de Usuário (Contas)</h2>
<table class="data-table">
  <tr><th>Papel</th><th>Seleção</th><th>Acesso</th></tr>
  <tr><td><strong>Aluno</strong></td><td>No momento do cadastro</td><td>Todas as funcionalidades pessoais: tarefas, agenda, foco, progresso, configurações, resumidor de texto</td></tr>
  <tr><td><strong>Professor</strong></td><td>No momento do cadastro</td><td>Somente Painel Demonstrativo da turma (dados fictícios, sem acesso aos dados privados dos alunos)</td></tr>
</table>
<p style="margin-top:3px; font-size:8pt;"><em>Senhas protegidas por SHA-256 via Web Crypto API nativa. Sessão persistida no localStorage (usuário continua logado ao reabrir o navegador).</em></p>

<!-- ════════════════ 3. MAPA DE ROTAS ════════════════ -->
<h2>3. Mapa de Rotas da Aplicação</h2>
<table class="data-table">
  <tr><th>Rota</th><th>Tela</th><th>Acesso</th></tr>
  <tr><td>/auth</td><td>Login / Cadastro</td><td>Público</td></tr>
  <tr><td>/dashboard</td><td>Dashboard Principal do Aluno</td><td>Aluno</td></tr>
  <tr><td>/tasks</td><td>Gerenciamento de Tarefas</td><td>Aluno</td></tr>
  <tr><td>/agenda</td><td>Agenda e Calendário Mensal</td><td>Aluno</td></tr>
  <tr><td>/focus</td><td>Modo Foco (Temporizador Pomodoro)</td><td>Aluno</td></tr>
  <tr><td>/progress</td><td>Progresso, Conquistas e Gamificação</td><td>Aluno</td></tr>
  <tr><td>/settings</td><td>Configurações Visuais e de Conta</td><td>Aluno</td></tr>
  <tr><td>/teacher</td><td>Painel do Professor (Demonstração)</td><td>Professor</td></tr>
</table>

<!-- ════════════════ 4. FUNCIONALIDADES POR ABA ════════════════ -->
<h2>4. Funcionalidades por Tela</h2>

<h3>4.1 Autenticação (/auth)</h3>
<ul class="blist">
  <li>Alternância entre Login e Cadastro na mesma tela</li>
  <li>Campos: Nome, E-mail, Senha, Confirmar Senha, Papel (Aluno / Professor)</li>
  <li>Validação de campos em tempo real com mensagens de erro</li>
  <li>Hash SHA-256 da senha via Web Crypto API (nunca armazenada em texto puro)</li>
  <li>Redirecionamento pós-login: Aluno → /dashboard | Professor → /teacher</li>
</ul>

<h3>4.2 Dashboard (/dashboard)</h3>
<ul class="blist">
  <li>Saudação dinâmica por hora: "Bom dia / Boa tarde / Boa noite, [Nome]!" + data atual</li>
  <li><strong>4 Cards de Estatísticas Semanais:</strong> Tempo Estudado (destaque principal, azul) | Tarefas Concluídas (destaque secundário, verde) | Sessões de Foco | Pontuação Total + Nível</li>
  <li><strong>Alertas visuais automáticos:</strong> Alerta vermelho para tarefas em atraso; alerta amarelo para eventos nos próximos 3 dias</li>
  <li><strong>4 Ações Rápidas em tiles clicáveis:</strong> Nova Tarefa | Agenda | Modo Foco | Resumir Texto</li>
  <li><strong>Coluna esquerda:</strong> Tarefas com prazo para hoje (checkbox para concluir) + próximos prazos da semana</li>
  <li><strong>Coluna direita:</strong> Próximos eventos (7 dias) com badge de urgência + mini gráfico de barras diário semanal</li>
</ul>

<h3>4.3 Tarefas (/tasks)</h3>
<ul class="blist">
  <li>CRUD completo: criar, editar, concluir, excluir</li>
  <li>Filtros: Todas / Pendentes / Concluídas / Em progresso + barra de busca por título</li>
  <li>Modal de criação/edição: Título, Disciplina (Algoritmos, Redes, Hardware, SO, BD, Web, Programação, Outro), Prioridade (Alta/Média/Baixa), Prazo, Descrição, Subtarefas (adicionar/remover etapas)</li>
  <li>Barra lateral colorida por prioridade (vermelho/amarelo/verde); ações (editar/excluir) visíveis no hover</li>
  <li>Pontuação: +10 pts ao concluir tarefa completa; +5 pts ao marcar subtarefa</li>
</ul>

<div class="pb"></div>

<h3>4.4 Agenda (/agenda)</h3>
<ul class="blist">
  <li>Calendário mensal interativo com navegação entre meses; dias com eventos marcados com ponto indicador</li>
  <li>Tipos de evento: Prova / Trabalho / Seminário / Reunião / Outro</li>
  <li>Campos: Título, Data, Horário, Disciplina, Tipo, Descrição</li>
  <li>Badge de urgência: vermelho (≤2 dias), amarelo (≤5 dias), neutro (demais)</li>
  <li>Integração automática com Dashboard: eventos nos próximos 3 dias geram alerta amarelo a cada abertura do app</li>
</ul>

<h3>4.5 Modo Foco (/focus)</h3>
<ul class="blist">
  <li>Anel SVG circular animado com preenchimento progressivo e efeito glow azul</li>
  <li>Timer numérico centralizado com tipografia em Plus Jakarta Sans (800 weight)</li>
  <li>Durações predefinidas: 10 min / 25 min / 50 min; campo personalizado: 1–180 min</li>
  <li>Controles: Iniciar / Pausar / Retomar / Reiniciar</li>
  <li>Ao finalizar: +15 pontos atribuídos; sessão registrada com data, duração e status</li>
  <li>Histórico das últimas sessões com data, duração e status (Completo / Interrompido)</li>
</ul>

<h3>4.6 Progresso (/progress)</h3>
<ul class="blist">
  <li>Gráfico de barras semanal: minutos estudados por dia (Dom–Sáb); hoje destacado em azul</li>
  <li>Sistema de 7 níveis por pontuação: Iniciante (0) → Aprendiz (100) → Estudante (250) → Dedicado (500) → Avançado (1000) → Expert (2000) → Mestre (4000 pts)</li>
  <li>Barra de progresso para o próximo nível</li>
  <li>Histórico tabular de sessões de foco: data, duração, status</li>
  <li>8 Conquistas/Badges: Primeira Tarefa | Primeiro Foco | 5 Tarefas | Maratona de Foco (3 sessões/dia) | Constância (7 dias com atividade) | 100 Pts | 500 Pts | 1000 Pts</li>
</ul>

<h3>4.7 Configurações (/settings)</h3>
<ul class="blist">
  <li><strong>Tema visual:</strong> Claro / Escuro / Alto Contraste (via data-theme no &lt;html&gt;)</li>
  <li><strong>Tamanho de fonte:</strong> Pequeno (0.875×) / Médio (1×) / Grande (1.2×) (via data-font-size no &lt;html&gt;)</li>
  <li><strong>Exportar dados:</strong> Gera arquivo JSON com todas as tarefas, eventos e sessões para backup</li>
  <li><strong>Importar dados:</strong> Restaura dados a partir de arquivo JSON de backup</li>
  <li><strong>Resumidor de Texto:</strong> Campo livre para colar texto; extração local por frequência de termos (sem IA externa)</li>
  <li><strong>Conta:</strong> Exibe nome, e-mail e papel do usuário logado; botão de Logout</li>
</ul>

<h3>4.8 Painel do Professor (/teacher)</h3>
<ul class="blist">
  <li>Cards de estatísticas demonstrativas da turma: total de alunos, tarefas concluídas, sessões de foco, média de pontuação</li>
  <li>Tabela de alunos com dados de exemplo: nome, tarefas, tempo de foco, pontos, nível</li>
  <li>Gráfico semanal agregado com atividade média da turma por dia</li>
  <li>Todos os dados são fictícios (modo demonstração); sem acesso real aos dados privados dos alunos</li>
</ul>

<!-- ════════════════ 5. ARQUITETURA ════════════════ -->
<h2>5. Arquitetura de Código</h2>

<div class="code-block">cetep-tech-study/
├── index.html                   ← SEO/PWA meta tags + favicon
├── vite.config.js
├── package.json
├── public/
│   ├── favicon.svg              ← Capelo em squircle azul (vetor)
│   ├── favicon.ico              ← Multi-resolução 16/32/48px
│   ├── favicon-32x32.png
│   ├── favicon-16x16.png
│   └── apple-touch-icon.png    ← 180×180px (iOS)
└── src/
    ├── main.jsx                 ← Entry point React 18
    ├── App.jsx                  ← Roteamento (React Router v6)
    ├── contexts/
    │   ├── AuthContext.jsx      ← Login / Logout / Sessão
    │   └── AppContext.jsx       ← Gamificação e estado global
    ├── services/
    │   ├── DataService.js       ← FACHADA (interface pública única)
    │   ├── LocalStorageAdapter.js ← Implementação (lê/escreve browser)
    │   └── crypto.js            ← Hash SHA-256 Web Crypto API
    ├── components/
    │   ├── layout/AppLayout.jsx ← Sidebar + BottomNav + Outlet
    │   ├── tasks/TaskModal.jsx  ← Modal criar/editar tarefa
    │   └── SummarizeModal.jsx  ← Modal resumidor
    ├── pages/
    │   ├── AuthPage.jsx
    │   ├── DashboardPage.jsx
    │   ├── TasksPage.jsx
    │   ├── AgendaPage.jsx
    │   ├── FocusPage.jsx
    │   ├── ProgressPage.jsx
    │   ├── SettingsPage.jsx
    │   └── teacher/TeacherDashboard.jsx
    ├── utils/
    │   ├── dates.js             ← formatDateBR, relativeDays, isOverdue
    │   └── summarizer.js        ← Extração por frequência local
    └── styles/
        └── index.css            ← Sistema de design completo</div>

<div class="info-box">
  <strong>Padrão Adapter (Troca futura para Supabase):</strong><br>
  Páginas → DataService.js (fachada pública) → LocalStorageAdapter.js (implementação)<br>
  Para migrar: criar SupabaseAdapter.js e trocar o import no DataService. Nenhuma página ou componente precisa ser alterado.
</div>

<div class="pb"></div>

<!-- ════════════════ 6. DESIGN SYSTEM ════════════════ -->
<h2>6. Design System (index.css)</h2>

<table class="data-table">
  <tr><th>Elemento</th><th>Especificação</th></tr>
  <tr><td><strong>Fonte Títulos</strong></td><td>Plus Jakarta Sans 700/800 (headings, valores stat, timer do foco)</td></tr>
  <tr><td><strong>Fonte Corpo</strong></td><td>Inter 400/500/600 (texto corrido, labels, navegação)</td></tr>
  <tr><td><strong>Tema Claro</strong></td><td>Azul Royal hsl(224, 76%, 50%) | Fundo slate-warm hsl(220, 24%, 97.8%)</td></tr>
  <tr><td><strong>Tema Escuro</strong></td><td>Azul Índigo hsl(224, 85%, 65%) | Fundo midnight hsl(222, 28%, 9%)</td></tr>
  <tr><td><strong>Alto Contraste</strong></td><td>Amarelo neon sobre preto absoluto (WCAG AAA — acessibilidade máxima)</td></tr>
  <tr><td><strong>Escala de Fonte</strong></td><td>0.875× (Pequeno) / 1× (Médio) / 1.2× (Grande) via CSS custom property</td></tr>
  <tr><td><strong>Sombras</strong></td><td>5 níveis xs→xl + glow (azul para botão primário e anel do foco)</td></tr>
  <tr><td><strong>Componentes CSS</strong></td><td>.card · .stat-card · .btn · .badge · .chip · .task-item · .calendar-day · .modal · .progress-bar · .achievement-card · .focus-ring · .nav-item</td></tr>
</table>

<!-- ════════════════ 7. DEPENDÊNCIAS ════════════════ -->
<h2>7. Dependências Principais</h2>
<table class="data-table">
  <tr><th>Pacote</th><th>Versão</th><th>Função</th></tr>
  <tr><td>react</td><td>18.x</td><td>Framework UI</td></tr>
  <tr><td>react-dom</td><td>18.x</td><td>Renderização DOM</td></tr>
  <tr><td>react-router-dom</td><td>6.x</td><td>Roteamento SPA (sem reload)</td></tr>
  <tr><td>lucide-react</td><td>latest</td><td>Biblioteca de ícones SVG</td></tr>
  <tr><td>react-hot-toast</td><td>latest</td><td>Notificações visuais (toasts)</td></tr>
  <tr><td>vite</td><td>8.x</td><td>Build tool e servidor de dev</td></tr>
</table>

<!-- ════════════════ 8. FLUXO DO ALUNO ════════════════ -->
<h2>8. Fluxo Completo — Usuário Aluno</h2>
<div class="code-block">Acessa o site
    → /auth → Cadastro (Sou Aluno + Nome + E-mail + Senha) ou Login
    → /dashboard → Saudação + alertas de prazo + estatísticas semanais
        → Cria tarefa (modal) com subtarefas → Salva
    → /tasks → Gerencia lista completa, filtra, edita, conclui (+10 pts)
    → /agenda → Cadastra prova → Dashboard exibe alerta automático
    → /focus → Sessão de 25 min → Anel conta regressivamente → +15 pts
    → /progress → Gráfico semanal + conquistas desbloqueadas + nível atual
    → /settings → Muda para Tema Escuro + Fonte Grande → Exporta JSON</div>

<!-- ════════════════ 9. DATASERVICE OPS ════════════════ -->
<h2>9. Operações Disponíveis no DataService</h2>
<div class="two-col">
  <ul>
    <li>getTasks(userId)</li>
    <li>saveTask(userId, task)</li>
    <li>completeTask(userId, taskId)</li>
    <li>deleteTask(userId, taskId)</li>
    <li>getAgendaEvents(userId)</li>
    <li>saveAgendaEvent(userId, event)</li>
    <li>deleteAgendaEvent(userId, eventId)</li>
  </ul>
  <ul>
    <li>getFocusSessions(userId)</li>
    <li>saveFocusSession(userId, session)</li>
    <li>getGamification(userId)</li>
    <li>saveGamification(userId, data)</li>
    <li>getWeeklyStats(userId)</li>
    <li>exportUserData(userId)</li>
    <li>importUserData(userId, data)</li>
  </ul>
</div>

<!-- ════════════════ 10. CONQUISTAS ════════════════ -->
<h2>10. Sistema de Conquistas e Níveis</h2>

<table class="data-table" style="margin-bottom:5px;">
  <tr><th>Conquista</th><th>Condição de Desbloqueio</th></tr>
  <tr><td>Primeira Tarefa</td><td>Concluir 1 tarefa</td></tr>
  <tr><td>Primeiro Foco</td><td>Finalizar 1 sessão de foco</td></tr>
  <tr><td>5 Tarefas</td><td>Concluir 5 tarefas no total</td></tr>
  <tr><td>Maratona de Foco</td><td>Completar 3 sessões de foco em um único dia</td></tr>
  <tr><td>Constância</td><td>Registrar atividade por 7 dias seguidos</td></tr>
  <tr><td>100 / 500 / 1000 Pontos</td><td>Atingir respectivo total de pontos acumulados</td></tr>
</table>

<table class="data-table">
  <tr><th>Nível</th><th>Título</th><th>Pontos Necessários</th></tr>
  <tr><td>1</td><td>Iniciante</td><td>0</td></tr>
  <tr><td>2</td><td>Aprendiz</td><td>100</td></tr>
  <tr><td>3</td><td>Estudante</td><td>250</td></tr>
  <tr><td>4</td><td>Dedicado</td><td>500</td></tr>
  <tr><td>5</td><td>Avançado</td><td>1.000</td></tr>
  <tr><td>6</td><td>Expert</td><td>2.000</td></tr>
  <tr><td>7</td><td>Mestre</td><td>4.000</td></tr>
</table>

<!-- ════════════════ 11. FERRAMENTAS DE CONSTRUÇÃO ════════════════ -->
<h2>11. Ferramentas Utilizadas na Construção do Projeto</h2>
<table class="data-table">
  <tr><th>Ferramenta</th><th>Finalidade</th></tr>
  <tr><td>GitHub CLI (gh)</td><td>Criação do repositório público e push automatizado</td></tr>
  <tr><td>Vercel CLI</td><td>Build e deploy em produção via linha de comando</td></tr>
  <tr><td>Microsoft Edge (Headless)</td><td>Geração de favicons PNG/ICO e PDFs institucionais a partir de HTML/CSS</td></tr>
  <tr><td>Python + Pillow</td><td>Processamento de imagens: resize dos favicons e conversão de formatos</td></tr>
  <tr><td>Web Crypto API (nativa)</td><td>Hash SHA-256 das senhas, sem dependência de biblioteca externa</td></tr>
</table>

<!-- ════════════════ 12. ARQUIVOS PEDAGÓGICOS ════════════════ -->
<h2>12. Materiais Pedagógicos Gerados (fora da aplicação)</h2>
<table class="data-table">
  <tr><th>Arquivo</th><th>Descrição</th></tr>
  <tr><td>texto_leitura_cetep_tech_study.pdf</td><td>Texto escolar (2 págs. A4) no padrão CETEP: contexto, funcionalidades, acessibilidade e questões de discussão. Para leitura e debate em sala antes da atividade.</td></tr>
  <tr><td>atividade_cetep_tech_study_aee.pdf</td><td>Folha de atividade com 10 questões (múltipla escolha, associação, V/F e dissertativas) no padrão CETEP, voltada à turma AEE do 2º ano do Técnico em Informática.</td></tr>
</table>
<p style="font-size:8pt; margin-top:3px;"><em>Ambos os PDFs gerados com cabeçalho institucional oficial (logotipo, campos de identificação, padrão CETEP Alberto Torres) e diagramados em formato A4 com texto justificado padrão escolar.</em></p>

</body>
</html>'''

# Save HTML
html_path = os.path.abspath('resumo_completo_cetep_tech_study.html')
pdf_path = os.path.abspath('resumo_completo_cetep_tech_study.pdf')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Compile to PDF
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    f"file:///{html_path.replace(os.sep, '/')}"
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Exit code:", res.returncode)
print(f"PDF exists: {os.path.exists(pdf_path)}")
if os.path.exists(pdf_path):
    print(f"PDF Size: {os.path.getsize(pdf_path)} bytes")

# Copy to public folder
import subprocess as sp
sp.run(['powershell', '-Command',
    f'Copy-Item "{pdf_path}" "public/resumo_completo_cetep_tech_study.pdf" -Force'],
    capture_output=True)
sp.run(['powershell', '-Command',
    f'Copy-Item "{html_path}" "public/resumo_completo_cetep_tech_study.html" -Force'],
    capture_output=True)
print("Copied to public/")
