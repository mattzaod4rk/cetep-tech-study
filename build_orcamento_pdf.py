import os, subprocess

html = r"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Planejamento e Orçamento — CETEP Tech Study</title>
<style>
/* ─── PAGE ─────────────────────────────────────────── */
@page {
  size: A4 portrait;
  margin: 18mm 16mm 22mm 16mm;
  @bottom-center {
    content: "CETEP Tech Study  |  Planejamento e Orçamento  |  Setembro de 2026          Página " counter(page);
    font-family: Arial, sans-serif;
    font-size: 7.5pt;
    color: #555;
    border-top: 0.5px solid #1a4b8c;
    padding-top: 4px;
  }
}

/* ─── RESET ────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  font-size: 9.5pt;
  line-height: 1.42;
  color: #1a1a1a;
  background: #fff;
  text-align: justify;
  counter-reset: page;
}

/* ─── HEADER ───────────────────────────────────────── */
.header-wrap {
  border: 1.5px solid #1a4b8c;
  border-radius: 2px;
  margin-bottom: 12px;
  overflow: hidden;
}
.header-top {
  background: #1a4b8c;
  color: #fff;
  padding: 6px 12px 5px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-area {
  flex-shrink: 0;
  border-right: 1px solid rgba(255,255,255,0.35);
  padding-right: 12px;
  text-align: center;
}
.logo-area svg { display: block; }
.school-names { flex: 1; }
.school-names .line1 {
  font-size: 12pt;
  font-weight: bold;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.school-names .line2 {
  font-size: 8pt;
  font-weight: normal;
  opacity: 0.88;
  margin-top: 1px;
}
.school-names .line3 {
  font-size: 7.5pt;
  opacity: 0.75;
  margin-top: 1px;
}
.header-meta {
  display: flex;
  gap: 0;
  font-size: 8pt;
  color: #1a1a1a;
}
.meta-cell {
  flex: 1;
  padding: 5px 12px 4px 12px;
  border-right: 1px solid #d0d8ea;
}
.meta-cell:last-child { border-right: none; }
.meta-cell .lbl { font-weight: bold; color: #1a4b8c; display: block; margin-bottom: 1px; }

/* ─── DOC TITLE ────────────────────────────────────── */
.doc-title {
  text-align: center;
  font-size: 14pt;
  font-weight: bold;
  color: #0f2e6e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 14px 0 3px 0;
}
.doc-subtitle {
  text-align: center;
  font-size: 9pt;
  color: #444;
  margin-bottom: 8px;
}
.title-rule {
  border: none;
  border-top: 1.5px solid #1a4b8c;
  margin: 0 0 12px 0;
}

/* ─── SECTION HEADING ──────────────────────────────── */
h2 {
  font-size: 10pt;
  font-weight: bold;
  color: #fff;
  background: #1a4b8c;
  padding: 4px 9px;
  margin: 14px 0 6px 0;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  page-break-after: avoid;
  border-radius: 1px;
}
h3 {
  font-size: 9.5pt;
  font-weight: bold;
  color: #0f2e6e;
  margin: 9px 0 4px 0;
  padding-bottom: 2px;
  border-bottom: 0.75px solid #9ab0d6;
  page-break-after: avoid;
}
h4 {
  font-size: 9pt;
  font-weight: bold;
  color: #1a4b8c;
  margin: 7px 0 3px 0;
}

/* ─── PARAGRAPH ────────────────────────────────────── */
p { margin-bottom: 5px; font-size: 9pt; }
.indent { text-indent: 1em; }

/* ─── TABLE ────────────────────────────────────────── */
table.tbl {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0 10px 0;
  font-size: 8.5pt;
  page-break-inside: auto;
}
table.tbl thead { display: table-header-group; }
table.tbl th {
  background: #1a4b8c;
  color: #fff;
  padding: 5px 8px;
  text-align: left;
  font-size: 8pt;
  font-weight: bold;
  border: 1px solid #1a4b8c;
}
table.tbl td {
  padding: 4px 8px;
  border: 1px solid #c8d4e8;
  vertical-align: top;
  color: #1a1a1a;
}
table.tbl tr:nth-child(even) td { background: #f0f4fb; }
table.tbl .right { text-align: right; }
table.tbl .center { text-align: center; }
table.tbl .bold { font-weight: bold; }
table.tbl .total-row td {
  background: #dce6f5 !important;
  font-weight: bold;
  color: #0f2e6e;
  border-top: 1.5px solid #1a4b8c;
}
table.tbl .subtotal-row td {
  background: #eef2fa !important;
  font-weight: bold;
  border-top: 1px solid #9ab0d6;
}
table.tbl .phase-row td {
  background: #e8eff9 !important;
  font-weight: bold;
  color: #0f2e6e;
  font-size: 8pt;
}

/* ─── INFO BOXES ───────────────────────────────────── */
.infobox {
  border: 0.75px solid #9ab0d6;
  border-left: 3.5px solid #1a4b8c;
  background: #f5f8fd;
  padding: 6px 10px;
  margin: 7px 0;
  font-size: 8.5pt;
  page-break-inside: avoid;
}
.alertbox {
  border: 0.75px solid #c9a200;
  border-left: 3.5px solid #c9a200;
  background: #fffbeb;
  padding: 6px 10px;
  margin: 7px 0;
  font-size: 8.5pt;
  page-break-inside: avoid;
}
.alertbox strong { color: #7a5c00; }
.infobox strong { color: #0f2e6e; }

/* ─── BULLET LIST ──────────────────────────────────── */
ul.blist { margin: 3px 0 6px 0; }
ul.blist li {
  list-style: none;
  padding-left: 12px;
  position: relative;
  margin-bottom: 2px;
  font-size: 8.8pt;
}
ul.blist li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #1a4b8c;
  font-weight: bold;
}
ul.blist.tight li { margin-bottom: 0; }

/* ─── TIMELINE BLOCK ───────────────────────────────── */
.timeline { margin: 6px 0 8px 0; }
.tl-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-bottom: 4px;
  font-size: 8.8pt;
}
.tl-date {
  flex-shrink: 0;
  width: 88px;
  font-weight: bold;
  color: #1a4b8c;
  padding-top: 1px;
}
.tl-sep {
  flex-shrink: 0;
  width: 8px;
  text-align: center;
  color: #9ab0d6;
}
.tl-content { flex: 1; }

/* ─── PAGE BREAK ───────────────────────────────────── */
.pb { page-break-before: always; }

/* ─── SIGNATURE ────────────────────────────────────── */
.sig-section {
  margin-top: 18px;
  border: 1px solid #9ab0d6;
  border-radius: 2px;
  padding: 12px 14px;
  page-break-inside: avoid;
}
.sig-title {
  font-size: 9.5pt;
  font-weight: bold;
  color: #0f2e6e;
  text-transform: uppercase;
  border-bottom: 1px solid #9ab0d6;
  padding-bottom: 5px;
  margin-bottom: 10px;
  letter-spacing: 0.03em;
}
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.sig-field { margin-bottom: 14px; }
.sig-label { font-size: 8pt; color: #444; margin-bottom: 16px; display: block; }
.sig-line {
  border-bottom: 1px solid #1a1a1a;
  margin-top: 4px;
  width: 100%;
}
.sig-sub { font-size: 7.5pt; color: #666; margin-top: 2px; }

/* ─── BADGE / CHIP ─────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 7.5pt;
  font-weight: bold;
}
.badge-blue { background: #dce6f5; color: #0f2e6e; border: 0.5px solid #9ab0d6; }
.badge-green { background: #e2f5e8; color: #155a2a; border: 0.5px solid #7dc899; }
.badge-yellow { background: #fff8db; color: #7a5c00; border: 0.5px solid #e6c34d; }
.badge-red { background: #fce8e8; color: #7a1a1a; border: 0.5px solid #e07070; }

/* ─── DIVIDER ──────────────────────────────────────── */
.rule { border: none; border-top: 0.5px solid #9ab0d6; margin: 10px 0; }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════
     CABEÇALHO INSTITUCIONAL
═══════════════════════════════════════════════ -->
<div class="header-wrap">
  <div class="header-top">
    <div class="logo-area">
      <svg width="54" height="54" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
        <text x="50" y="32" font-size="13" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">CETEP</text>
        <text x="50" y="44" font-size="6.5" font-family="Arial" fill="rgba(255,255,255,0.8)" text-anchor="middle">RECÔNCAVO II</text>
        <text x="50" y="54" font-size="7" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">ALBERTO TORRES</text>
        <line x1="18" y1="60" x2="82" y2="60" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>
        <text x="50" y="70" font-size="5.8" font-family="Arial" fill="rgba(255,255,255,0.7)" text-anchor="middle">Cruz das Almas – BA</text>
        <text x="50" y="79" font-size="5.5" font-family="Arial" fill="rgba(255,255,255,0.55)" text-anchor="middle">Desde 1948</text>
      </svg>
    </div>
    <div class="school-names">
      <div class="line1">CETEP Recôncavo II</div>
      <div class="line2">Centro Territorial de Educação Profissional Recôncavo II Alberto Torres</div>
      <div class="line3">Cruz das Almas – Bahia &nbsp;|&nbsp; Técnico em Informática Integrado ao Ensino Médio</div>
    </div>
  </div>
  <div class="header-meta">
    <div class="meta-cell"><span class="lbl">Projeto</span>CETEP Tech Study</div>
    <div class="meta-cell"><span class="lbl">Documento</span>Planejamento e Orçamento</div>
    <div class="meta-cell"><span class="lbl">Versão</span>1.0 — MVP Beta</div>
    <div class="meta-cell"><span class="lbl">Data</span>Setembro de 2026</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════
     TÍTULO DO DOCUMENTO
═══════════════════════════════════════════════ -->
<div class="doc-title">Planejamento e Orçamento para Implementação</div>
<div class="doc-subtitle">Fases de desenvolvimento, infraestrutura, segurança de dados, conformidade LGPD e custo total estimado</div>
<hr class="title-rule">

<!-- ═══════════════════════════════════════════════
     1. APRESENTAÇÃO
═══════════════════════════════════════════════ -->
<h2>1. Apresentação do Projeto</h2>

<p>O <strong>CETEP Tech Study</strong> é uma plataforma web de apoio pedagógico desenvolvida especificamente para os estudantes do Curso Técnico em Informática Integrado ao Ensino Médio do CETEP Alberto Torres. O sistema foi concebido com foco em acessibilidade para alunos atendidos pelo Atendimento Educacional Especializado (AEE), incluindo estudantes com TDAH, TEA e baixa visão, sem se apresentar como ferramenta médica ou clínica.</p>

<p>O presente documento tem por finalidade apresentar à direção da instituição um panorama claro e objetivo dos <strong>custos necessários para a evolução do projeto</strong>, contemplando as etapas que vão desde a apresentação na Mostra Pedagógica (28 e 29 de outubro de 2026) até a implantação completa em produção, com banco de dados real, segurança compatível com a LGPD e conformidade com o ECA Digital (Lei nº 15.211/2025).</p>

<div class="alertbox">
  <strong>Atenção — Dado sensível:</strong> O sistema armazenará nomes, e-mails e dados de desempenho de estudantes menores de idade. Isso impõe obrigações legais expressas pela LGPD (Lei nº 13.709/2018), pelo ECA Digital (Lei nº 15.211/2025) e pelas diretrizes da ANPD, que devem ser observadas antes da entrada em produção com dados reais.
</div>

<!-- ═══════════════════════════════════════════════
     2. SITUAÇÃO ATUAL (FASE BETA)
═══════════════════════════════════════════════ -->
<h2>2. Situação Atual — Fase Beta (MVP)</h2>

<h3>2.1 O que já foi desenvolvido</h3>
<p>O MVP (Produto Mínimo Viável) está funcional e pronto para demonstração. O código encontra-se publicado no repositório GitHub em <strong>github.com/mattzaod4rk/cetep-tech-study</strong>. As funcionalidades entregues incluem:</p>

<ul class="blist">
  <li>Sistema de autenticação com dois papéis de usuário (Aluno e Professor), com senha protegida por SHA-256</li>
  <li>Dashboard com estatísticas semanais, alertas visuais de prazo e ações rápidas</li>
  <li>Módulo de Tarefas com CRUD completo, subtarefas e filtros por prioridade e disciplina</li>
  <li>Agenda com calendário mensal interativo e gestão de eventos com indicadores de urgência</li>
  <li>Modo Foco (timer Pomodoro) com anel SVG animado e registro de sessões</li>
  <li>Módulo de Progresso com gráfico semanal, sistema de níveis e conquistas (badges)</li>
  <li>Configurações com três temas (Claro, Escuro, Alto Contraste) e três tamanhos de fonte</li>
  <li>Painel do Professor em modo demonstração com dados fictícios</li>
  <li>Resumidor de texto local por frequência de termos, sem envio de dados a servidores externos</li>
  <li>Arquitetura com camada DataService isolada (Adapter Pattern) para migração futura a banco real</li>
</ul>

<h3>2.2 Limitações da fase atual</h3>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:35%">Limitação</th>
      <th>Situação atual</th>
      <th style="width:28%">Resolução prevista</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Armazenamento de dados</td><td>localStorage do navegador — dados ficam apenas no dispositivo do usuário e são perdidos ao limpar o histórico</td><td>Fase 2: banco de dados em nuvem (Supabase)</td></tr>
    <tr><td>Compartilhamento professor–aluno</td><td>Professor vê apenas dados fictícios; não há conexão real com os alunos</td><td>Fase 2: banco de dados compartilhado</td></tr>
    <tr><td>Acesso multidevice</td><td>Dados não sincronizam entre computadores/celulares do mesmo aluno</td><td>Fase 2: autenticação e sync em nuvem</td></tr>
    <tr><td>Segurança avançada</td><td>Sem HTTPS/SSL próprio, sem rate limiting, sem proteção contra acesso não autorizado em nível de servidor</td><td>Fase 2–3: configuração de segurança no Supabase e Vercel</td></tr>
    <tr><td>Conformidade LGPD</td><td>Sem política de privacidade, sem RIPD, sem consentimento formal dos responsáveis</td><td>Fase 3: documentação legal e adequação técnica</td></tr>
    <tr><td>Visual / identidade</td><td>Design funcional, porém com aparência genérica — necessita refinamento antes da Mostra</td><td>Fase 1 (imediata): redesign de interface</td></tr>
  </tbody>
</table>

<!-- ═══════════════════════════════════════════════
     3. FASES DE IMPLEMENTAÇÃO
═══════════════════════════════════════════════ -->
<div class="pb"></div>
<h2>3. Fases de Implementação</h2>

<div class="infobox">
  <strong>Cronograma-base:</strong> O projeto está dividido em três fases. A Fase 1 é imediata e tem como marco a Mostra Pedagógica de 28–29 de outubro de 2026. As Fases 2 e 3 podem ser executadas ao longo do 1º semestre de 2027, conforme disponibilidade de recursos e aprovação institucional.
</div>

<!-- ─── FASE 1 ─── -->
<h3>Fase 1 — Preparação para a Mostra (Até 27 de outubro de 2026)</h3>
<p>Objetivo: deixar o MVP em plenas condições de apresentação pública, com visual profissional e sem aparência genérica de ferramenta automatizada.</p>

<table class="tbl">
  <thead>
    <tr><th style="width:28%">Entrega</th><th>Descrição</th><th style="width:16%" class="center">Complexidade</th><th style="width:14%" class="center">Responsável</th></tr>
  </thead>
  <tbody>
    <tr><td>Redesign visual completo</td><td>Refinamento da tipografia, paleta de cores, espaçamentos, hierarquia visual e componentes de UI para eliminar aparência genérica. Ajuste de cards, botões, formulários e dashboard. Sem alteração de lógica.</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N. / Agentes de desenvolvimento</td></tr>
    <tr><td>Deploy em produção (Vercel)</td><td>Ativação do deploy público com HTTPS automático (Let's Encrypt) via Vercel Hobby (gratuito). URL do tipo cetep-tech-study.vercel.app ou domínio próprio.</td><td class="center"><span class="badge badge-green">Baixa</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Registro de domínio</td><td>Registro do domínio <em>ceteptechstudy.com.br</em> (ou similar) no Registro.br por R$ 40,00/ano. Opcional para a Mostra — o endereço Vercel gratuito já funciona.</td><td class="center"><span class="badge badge-green">Baixa</span></td><td class="center">Instituição / Secretaria</td></tr>
    <tr><td>Testes de acessibilidade</td><td>Verificação do funcionamento dos temas Alto Contraste, tamanhos de fonte e navegação por teclado nos dispositivos disponíveis na escola.</td><td class="center"><span class="badge badge-green">Baixa</span></td><td class="center">Matheus N. / AEE</td></tr>
    <tr><td>Material de apresentação</td><td>Texto de leitura e atividade escolar impressa (já concluídos), roteiro de demonstração ao vivo e QR Code de acesso para os visitantes.</td><td class="center"><span class="badge badge-green">Baixa</span></td><td class="center">Equipe pedagógica / Projeto</td></tr>
  </tbody>
</table>

<!-- ─── FASE 2 ─── -->
<h3>Fase 2 — Implementação Real (1º Semestre de 2027)</h3>
<p>Objetivo: substituir o armazenamento local (localStorage) por banco de dados em nuvem, com autenticação segura e compartilhamento real entre alunos e professores.</p>

<table class="tbl">
  <thead>
    <tr><th style="width:28%">Entrega</th><th>Descrição</th><th style="width:16%" class="center">Complexidade</th><th style="width:14%" class="center">Responsável</th></tr>
  </thead>
  <tbody>
    <tr><td>Banco de dados (Supabase)</td><td>Criação e configuração do banco PostgreSQL no Supabase. Migração do DataService para o SupabaseAdapter (já previsto na arquitetura). Modelos de dados para usuários, tarefas, eventos e sessões.</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Autenticação segura</td><td>Substituição do hash local SHA-256 pelo sistema de autenticação do Supabase Auth (JWT + RLS), com verificação de e-mail, recuperação de senha e proteção contra força bruta.</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Row-Level Security (RLS)</td><td>Configuração de políticas de segurança no banco para garantir que cada aluno acesse somente seus próprios dados e que professores vejam apenas dados agregados autorizados.</td><td class="center"><span class="badge badge-red">Alta</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Painel do professor (real)</td><td>Integração do painel do professor com dados reais e agregados da turma, respeitando privacidade e políticas RLS. Substituição dos dados fictícios.</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Hosting em produção (Vercel Pro)</td><td>Upgrade do plano Vercel para suportar acessos simultâneos, proteção de variáveis de ambiente e logs de auditoria. Configuração do domínio próprio com SSL.</td><td class="center"><span class="badge badge-green">Baixa</span></td><td class="center">Matheus N.</td></tr>
  </tbody>
</table>

<!-- ─── FASE 3 ─── -->
<h3>Fase 3 — Segurança, LGPD e Maturidade (2º Semestre de 2027)</h3>
<p>Objetivo: adequar o sistema à legislação brasileira de proteção de dados, com foco especial na proteção de dados de menores de idade conforme exigido pelo ECA Digital (Lei nº 15.211/2025).</p>

<table class="tbl">
  <thead>
    <tr><th style="width:28%">Entrega</th><th>Descrição</th><th style="width:16%" class="center">Complexidade</th><th style="width:14%" class="center">Responsável</th></tr>
  </thead>
  <tbody>
    <tr><td>Política de Privacidade e Termos de Uso</td><td>Elaboração de documentos legais em linguagem acessível, com descrição clara dos dados coletados, finalidade, tempo de retenção e direitos dos titulares (alunos e responsáveis).</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N. / Apoio jurídico institucional</td></tr>
    <tr><td>Consentimento dos responsáveis</td><td>Implementação de fluxo de consentimento expresso (por escrito ou digital) dos pais/responsáveis para alunos menores de 18 anos, conforme LGPD Art. 14 e ECA Digital.</td><td class="center"><span class="badge badge-red">Alta</span></td><td class="center">Matheus N. / Gestão institucional</td></tr>
    <tr><td>Relatório de Impacto à Proteção de Dados (RIPD)</td><td>Elaboração do RIPD identificando riscos ao tratamento dos dados dos menores, medidas mitigatórias adotadas e responsável pelo tratamento (DPO ou equivalente).</td><td class="center"><span class="badge badge-red">Alta</span></td><td class="center">Apoio jurídico institucional</td></tr>
    <tr><td>Backups e auditoria</td><td>Ativação dos backups diários com retenção de 7 dias (inclusos no Supabase Pro). Log de auditoria de acessos críticos (login, exclusão de conta, exportação de dados).</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Minimização e anonimização</td><td>Revisão do modelo de dados para garantir que apenas informações estritamente necessárias sejam coletadas. Implementação de anonimização nos relatórios do professor.</td><td class="center"><span class="badge badge-yellow">Média</span></td><td class="center">Matheus N.</td></tr>
    <tr><td>Teste de penetração (pentest básico)</td><td>Revisão de segurança da aplicação identificando vulnerabilidades comuns (OWASP Top 10): XSS, CSRF, injection, autenticação fraca, exposição de dados sensíveis.</td><td class="center"><span class="badge badge-red">Alta</span></td><td class="center">Matheus N. / Apoio técnico externo</td></tr>
  </tbody>
</table>

<!-- ═══════════════════════════════════════════════
     4. ORÇAMENTO — INFRAESTRUTURA
═══════════════════════════════════════════════ -->
<div class="pb"></div>
<h2>4. Orçamento — Infraestrutura e Hospedagem</h2>

<div class="infobox">
  <strong>Referência cambial utilizada:</strong> US$ 1,00 = R$ 5,60 (setembro de 2026, aproximado). Os valores em reais para serviços em dólar estão sujeitos à variação cambial e ao IOF de 4,38% em cartões brasileiros. Os valores abaixo representam estimativas realistas para planejamento.
</div>

<h3>4.1 Fase 1 — Para a Mostra (setembro e outubro de 2026)</h3>

<table class="tbl">
  <thead>
    <tr><th>Serviço</th><th>Plano</th><th>Custo mensal</th><th>Período</th><th class="right">Custo até a Mostra</th><th>Observação</th></tr>
  </thead>
  <tbody>
    <tr><td>Vercel (hospedagem)</td><td>Hobby (Gratuito)</td><td>R$ 0,00/mês</td><td>Set–Out/2026</td><td class="right bold">R$ 0,00</td><td>HTTPS automático incluso. Suficiente para a demonstração.</td></tr>
    <tr><td>GitHub (repositório)</td><td>Free</td><td>R$ 0,00/mês</td><td>Set–Out/2026</td><td class="right bold">R$ 0,00</td><td>Repositório e integração com a Vercel.</td></tr>
    <tr><td>SSL / HTTPS (segurança)</td><td>Automático</td><td>R$ 0,00/mês</td><td>Set–Out/2026</td><td class="right bold">R$ 0,00</td><td>Certificado incluso automaticamente.</td></tr>
    <tr><td>Ferramentas de desenvolvimento</td><td>ChatGPT Go + Google AI Pro</td><td>R$ 75,98/mês</td><td>2 meses</td><td class="right">R$ 151,96</td><td>Ferramentas utilizadas pelo responsável técnico para desenvolver, testar, corrigir e evoluir o sistema.</td></tr>
    <tr><td>Domínio .com.br</td><td>Registro.br</td><td>Não se aplica</td><td>Pagamento único</td><td class="right">R$ 40,00</td><td>Opcional para a Mostra.</td></tr>
    <tr class="total-row"><td colspan="4"><strong>TOTAL ESTIMADO DA FASE 1</strong></td><td class="right"><strong>R$ 191,96</strong></td><td>R$ 151,96 referentes a dois meses das ferramentas de desenvolvimento + R$ 40,00 referentes ao domínio opcional.</td></tr>
  </tbody>
</table>

<div class="infobox" style="border-left-color:#0f2e6e; background:#eef2fb; padding: 10px 14px;">
  <strong style="font-size:10.5pt; display:block; margin-bottom:5px; color:#0f2e6e;">INVESTIMENTO INICIAL PARA A MOSTRA: R$ 191,96</strong>
  Esse valor considera dois meses das ferramentas de desenvolvimento atualmente utilizadas pelo responsável técnico e o registro opcional do domínio. A infraestrutura de hospedagem, GitHub e HTTPS permanece sem custo nesta fase.
</div>

<h3>4.2 Fase 2 e 3 — Implementação em Produção (a partir de 2027)</h3>

<table class="tbl">
  <thead>
    <tr><th>Serviço</th><th>Plano</th><th class="right">Custo Mensal (USD)</th><th class="right">Custo Mensal (R$)*</th><th>O que inclui</th></tr>
  </thead>
  <tbody>
    <tr><td>Supabase (banco de dados)</td><td>Pro</td><td class="right">US$ 25,00</td><td class="right bold">≈ R$ 145,00</td><td>PostgreSQL ativo 24h, 8 GB de armazenamento, autenticação inclusa, backups diários, até 100.000 usuários ativos/mês</td></tr>
    <tr><td>Vercel (hospedagem)</td><td>Pro</td><td class="right">US$ 20,00</td><td class="right bold">≈ R$ 116,00</td><td>Domínio próprio, proteção de variáveis de ambiente, logs de auditoria e maior capacidade de publicação</td></tr>
    <tr><td>Domínio .com.br</td><td>Registro.br (1 ano)</td><td class="right">Anual</td><td class="right bold">R$ 40,00/ano</td><td>Domínio ceteptechstudy.com.br ou similar. Pago uma vez por ano.</td></tr>
    <tr><td>E-mail transacional</td><td>Resend (Gratuito)</td><td class="right">US$ 0,00</td><td class="right bold">R$ 0,00</td><td>Até 3.000 e-mails/mês sem custo. Suficiente para confirmação de cadastro e recuperação de senha.</td></tr>
    <tr class="subtotal-row"><td colspan="2"><strong>Subtotal mensal (Fases 2–3)</strong></td><td class="right">US$ 45,00</td><td class="right">≈ R$ 261,00</td><td>Mais R$ 40,00/ano pelo domínio (≈ R$ 3,33/mês)</td></tr>
    <tr class="total-row"><td colspan="2"><strong>TOTAL MENSAL ESTIMADO (infraestrutura)</strong></td><td class="right">Sem custo adicional</td><td class="right">≈ R$ 264,33 / mês</td><td>Inclui banco de dados, hospedagem, domínio e e-mail</td></tr>
  </tbody>
</table>

<div class="alertbox">
  <strong>Possibilidade de redução de custo:</strong> Instituições públicas de ensino podem solicitar planos educacionais junto ao Supabase e à Vercel. Ambas as empresas possuem programas de desconto para projetos sem fins lucrativos e educacionais. Recomenda-se formalizar a solicitação após a aprovação do projeto pela direção.
</div>

<!-- ═══════════════════════════════════════════════
     5. ORÇAMENTO — FERRAMENTAS DE IA
═══════════════════════════════════════════════ -->
<h2>5. Orçamento — Ferramentas de Desenvolvimento Assistido por IA</h2>

<p>As ferramentas listadas abaixo são utilizadas pelo responsável técnico no desenvolvimento, manutenção e evolução do sistema — <strong>não integram a infraestrutura do site</strong> e não são necessárias para que a plataforma funcione para os usuários finais (alunos e professores). Trata-se de assinaturas pessoais do desenvolvedor, utilizadas como instrumentos de trabalho.</p>

<table class="tbl">
  <thead>
    <tr><th style="width:22%">Ferramenta</th><th style="width:16%">Plano</th><th class="right" style="width:16%">Custo Mensal (R$)</th><th>Finalidade no projeto</th><th style="width:12%" class="center">Status</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>ChatGPT</strong><br><small>OpenAI</small></td>
      <td>Go (R$ 39,99/mês)</td>
      <td class="right bold">R$ 39,99</td>
      <td>Planejamento, análise, documentação, revisão e apoio ao desenvolvimento.</td>
      <td class="center"><span class="badge badge-green">Em uso</span></td>
    </tr>
    <tr>
      <td><strong>Google Gemini</strong><br><small>Antigravity / AI Pro</small></td>
      <td>AI Pro (≈ R$ 35,99/mês)</td>
      <td class="right bold">≈ R$ 35,99</td>
      <td>Principal ferramenta usada no desenvolvimento, testes, publicação e manutenção do sistema.</td>
      <td class="center"><span class="badge badge-green">Em uso</span></td>
    </tr>
    <tr>
      <td><strong>Claude</strong><br><small>Anthropic (via Antigravity)</small></td>
      <td>Via Antigravity</td>
      <td class="right bold">Sem custo adicional</td>
      <td>Modelos Claude disponíveis dentro do Antigravity sem custo extra ao plano já contratado. Usado para revisão e análise complementar.</td>
      <td class="center"><span class="badge badge-blue">Disponível</span></td>
    </tr>
    <tr>
      <td><strong>Créditos adicionais<br>Antigravity (AGY)</strong><br><small>Google</small></td>
      <td>Sob demanda</td>
      <td class="right bold">Variável</td>
      <td>Ativados somente quando o volume de desenvolvimento ultrapassa a cota semanal do plano. Sem mensalidade fixa.</td>
      <td class="center"><span class="badge badge-yellow">Eventual</span></td>
    </tr>
    <tr>
      <td><strong>ChatGPT Plus</strong><br><small>OpenAI</small></td>
      <td>Plus — Opcional</td>
      <td class="right bold">Não incluso</td>
      <td>Possível upgrade futuro para maior capacidade. Não faz parte do custo atual.</td>
      <td class="center"><span class="badge badge-yellow">Opcional</span></td>
    </tr>
    <tr class="subtotal-row">
      <td colspan="2"><strong>Custo atual (ChatGPT Go + Google AI Pro)</strong></td>
      <td class="right">R$ 75,98 / mês</td>
      <td colspan="2">Ferramentas atualmente utilizadas e custeadas pelo responsável técnico</td>
    </tr>
    <tr class="subtotal-row">
      <td colspan="2"><strong>Cenário ampliado (ChatGPT Plus + Google AI Pro — futuro/opcional)</strong></td>
      <td class="right">≈ R$ 151,00 / mês</td>
      <td colspan="2">Cenário futuro e opcional — não representa custo atual</td>
    </tr>
    <tr class="total-row">
      <td colspan="2"><strong>Cenário de sprint (ferramentas atuais + créditos Antigravity sob demanda)</strong></td>
      <td class="right">R$ 75,98 + variável</td>
      <td colspan="2">Créditos adicionais ativados conforme necessidade; sem mensalidade fixa</td>
    </tr>
  </tbody>
</table>

<div class="infobox">
  <strong>Observação:</strong> As ferramentas de desenvolvimento assistido por IA são instrumentos de trabalho do responsável técnico. O site funciona normalmente para alunos e professores sem que essas assinaturas estejam ativas — elas são necessárias apenas para quem programa, testa e mantém o sistema.
</div>

<!-- ─── INVESTIMENTO JÁ REALIZADO ─── -->
<h3>5.1 Investimento já realizado pelo responsável técnico</h3>
<p>O desenvolvimento do CETEP Tech Study teve início em <strong>julho de 2026</strong>. Desde então, o responsável técnico vem arcando pessoalmente com os custos das ferramentas de desenvolvimento.</p>

<table class="tbl">
  <thead>
    <tr><th>Período</th><th>Ferramenta</th><th class="right">Custo mensal</th><th class="right">Valor acumulado</th><th>Observação</th></tr>
  </thead>
  <tbody>
    <tr><td>Jul–Set/2026<br><small>3 meses</small></td><td>ChatGPT Go + Google AI Pro</td><td class="right">R$ 75,98</td><td class="right bold">R$ 227,94</td><td>Investimento já realizado pelo responsável técnico desde o início do desenvolvimento</td></tr>
    <tr><td>Outubro/2026<br><small>+ 1 mês</small></td><td>ChatGPT Go + Google AI Pro</td><td class="right">R$ 75,98</td><td class="right">R$ 75,98</td><td>Mês da Mostra — custo previsto, ainda a ser pago</td></tr>
    <tr class="total-row"><td colspan="2"><strong>Projeção acumulada até outubro de 2026</strong></td><td class="right">R$ 75,98 / mês</td><td class="right"><strong>R$ 303,92</strong></td><td>Total estimado de julho a outubro de 2026</td></tr>
  </tbody>
</table>

<div class="infobox">
  Esses valores correspondem ao investimento pessoal do responsável técnico durante o período de desenvolvimento. <strong>Não representam custo obrigatório para o funcionamento do site</strong>, nem são de responsabilidade da instituição — são registrados aqui apenas para transparência e contextualização do esforço de desenvolvimento.<br><br>
  O valor de <strong>R$ 191,96</strong> (solicitado como custo inicial na Fase 1) é diferente: ele representa apenas o valor referente às ferramentas de desenvolvimento para os meses de setembro e outubro de 2026 (R$ 151,96), somado ao custo do domínio opcional (R$ 40,00).
</div>


<!-- ═══════════════════════════════════════════════
     6. SEGURANÇA E LGPD
═══════════════════════════════════════════════ -->
<div class="pb"></div>
<h2>6. Segurança e Conformidade LGPD</h2>

<h3>6.1 Exigências legais aplicáveis ao projeto</h3>
<p>O CETEP Tech Study tratará dados pessoais de estudantes menores de 18 anos. Isso ativa proteções especiais previstas em três instrumentos legais:</p>

<table class="tbl">
  <thead>
    <tr><th style="width:30%">Legislação</th><th>Exigência principal para o projeto</th></tr>
  </thead>
  <tbody>
    <tr><td><strong>LGPD</strong><br>Lei nº 13.709/2018 — Art. 14</td><td>Dados de crianças e adolescentes exigem consentimento específico e em destaque de pelo menos um dos pais ou responsável legal antes de qualquer tratamento.</td></tr>
    <tr><td><strong>ECA Digital</strong><br>Lei nº 15.211/2025</td><td>Plataformas digitais devem implementar mecanismos de verificação de idade, adotar Privacy by Design (proteção por concepção) e proibir criação de perfis comportamentais de menores.</td></tr>
    <tr><td><strong>Diretrizes ANPD</strong><br>Enunciado CD/ANPD nº 01/2023</td><td>O tratamento deve priorizar o "melhor interesse" do menor em todas as etapas. Relatório de Impacto à Proteção de Dados (RIPD) é obrigatório para tratamento de dados de crianças em escala.</td></tr>
  </tbody>
</table>

<h3>6.2 Medidas técnicas de segurança — já implementadas (Fase Beta)</h3>
<ul class="blist tight">
  <li>Hash SHA-256 das senhas via Web Crypto API nativa — senhas nunca armazenadas em texto puro</li>
  <li>Isolamento de dados por usuário (userId) — cada aluno acessa apenas seus próprios dados</li>
  <li>Sem integração com serviços de rastreamento ou publicidade de terceiros</li>
  <li>Nenhum dado é enviado a servidores externos (tudo no localStorage local do navegador)</li>
</ul>

<h3>6.3 Medidas técnicas de segurança — a implementar (Fases 2 e 3)</h3>
<ul class="blist tight">
  <li>HTTPS/SSL via Let's Encrypt (incluso no Vercel) — já ativo no deploy em produção</li>
  <li>Autenticação JWT com expiração e refresh token (Supabase Auth)</li>
  <li>Row-Level Security (RLS) no banco de dados — garantia de que aluno A não acessa dados do aluno B no nível do banco</li>
  <li>Rate limiting na API para prevenção de ataques de força bruta e abuso</li>
  <li>Backups automáticos diários com retenção de 7 dias (Supabase Pro)</li>
  <li>Variáveis de ambiente seguras no servidor (chaves de API nunca expostas no código público)</li>
  <li>Política de Privacidade publicada no site com linguagem acessível</li>
  <li>Consentimento expresso dos responsáveis legais antes do primeiro acesso do aluno menor</li>
  <li>Possibilidade de exclusão de conta e dados pelo aluno/responsável (direito ao apagamento — LGPD Art. 18)</li>
</ul>

<h3>6.4 Custo de conformidade LGPD</h3>

<table class="tbl">
  <thead>
    <tr><th>Item</th><th>Como executar</th><th class="right">Custo estimado</th></tr>
  </thead>
  <tbody>
    <tr><td>Política de Privacidade e Termos de Uso</td><td>Elaboração com auxílio de IA (Claude Pro / ChatGPT) + revisão por advogado parceiro da escola</td><td class="right">R$ 0 a R$ 500 (1× único)</td></tr>
    <tr><td>Relatório de Impacto (RIPD)</td><td>Documento interno elaborado pelo responsável do projeto com modelo fornecido pela ANPD</td><td class="right">R$ 0 (custo de tempo)</td></tr>
    <tr><td>Formulário de consentimento dos responsáveis</td><td>Formulário físico ou digital no ato de matrícula — elaboração interna com apoio da coordenação</td><td class="right">R$ 0 (custo de impressão)</td></tr>
    <tr><td>Treinamento da equipe (professores/gestores)</td><td>Workshop interno de 2h sobre LGPD na escola — material pronto disponível na ANPD e MEC</td><td class="right">R$ 0</td></tr>
    <tr class="total-row"><td><strong>TOTAL de conformidade</strong></td><td>Cenário sem assessoria jurídica externa</td><td class="right"><strong>R$ 0 a R$ 500 (1× único)</strong></td></tr>
  </tbody>
</table>

<!-- ═══════════════════════════════════════════════
     7. CUSTO TOTAL CONSOLIDADO
═══════════════════════════════════════════════ -->
<h2>7. Custo Total Consolidado por Fase</h2>

<h3>7.1 Fase 1 — Mostra Pedagógica (out/2026) — Investimento inicial</h3>

<table class="tbl">
  <thead>
    <tr><th>Item</th><th>Tipo</th><th class="right">Valor</th></tr>
  </thead>
  <tbody>
    <tr><td>Infraestrutura (Vercel Hobby + GitHub Free + SSL)</td><td>Mensal</td><td class="right bold">R$ 0,00</td></tr>
    <tr><td>Ferramentas de desenvolvimento (Gemini Pro + ChatGPT Go)</td><td>Mensal</td><td class="right">R$ 75,98 / mês</td></tr>
    <tr><td>Custo inicial até outubro (2 meses de ferramentas)</td><td>Único</td><td class="right">R$ 151,96</td></tr>
    <tr><td>Domínio .com.br</td><td>Único (opcional)</td><td class="right">R$ 40,00</td></tr>
    <tr class="total-row"><td colspan="2"><strong>TOTAL INICIAL Fase 1</strong></td><td class="right"><strong>R$ 191,96</strong></td></tr>
  </tbody>
</table>

<h3>7.2 Fase 2 — Implementação em produção (2027)</h3>

<table class="tbl">
  <thead>
    <tr><th>Item</th><th>Tipo</th><th class="right">Valor Mensal</th></tr>
  </thead>
  <tbody>
    <tr><td>Supabase Pro (banco + auth + backups)</td><td>Mensal</td><td class="right bold">≈ R$ 145,00</td></tr>
    <tr><td>Vercel Pro (hospedagem + domínio customizado)</td><td>Mensal</td><td class="right bold">≈ R$ 116,00</td></tr>
    <tr><td>Resend (e-mail transacional)</td><td>Mensal</td><td class="right bold">R$ 0,00</td></tr>
    <tr><td>Domínio .com.br (pro-rata anual)</td><td>Pro-rata</td><td class="right">≈ R$ 3,33</td></tr>
    <tr><td>Ferramentas de IA (desenvolvimento)</td><td>Mensal</td><td class="right">≈ R$ 225,00</td></tr>
    <tr class="subtotal-row"><td colspan="2"><strong>Subtotal mensal — infraestrutura</strong></td><td class="right">≈ R$ 264,33 / mês</td></tr>
    <tr class="total-row"><td colspan="2"><strong>TOTAL Fase 2 (infraestrutura + IA)</strong></td><td class="right">≈ R$ 489,33 / mês</td></tr>
  </tbody>
</table>

<h3>7.3 Fase 3 — Segurança e LGPD (2027 — custo único)</h3>

<table class="tbl">
  <thead>
    <tr><th>Item</th><th>Tipo</th><th class="right">Valor Estimado</th></tr>
  </thead>
  <tbody>
    <tr><td>Política de Privacidade + Termos de Uso (revisão jurídica)</td><td>Único</td><td class="right">R$ 0 a R$ 500,00</td></tr>
    <tr><td>RIPD (elaboração interna)</td><td>Único</td><td class="right">R$ 0,00</td></tr>
    <tr><td>Pentest básico (revisão de segurança)</td><td>Único</td><td class="right">R$ 0,00 (com ferramentas livres)</td></tr>
    <tr><td>Implementação técnica RLS + consentimento</td><td>Único</td><td class="right">Incluso no esforço da Fase 2</td></tr>
    <tr class="total-row"><td colspan="2"><strong>TOTAL Fase 3 (conformidade)</strong></td><td class="right"><strong>R$ 0 a R$ 500,00 (custo único)</strong></td></tr>
  </tbody>
</table>

<!-- ═══════════════════════════════════════════════
     8. QUADRO RESUMO GERAL
═══════════════════════════════════════════════ -->
<div class="pb"></div>
<h2>8. Quadro Resumo Geral — Visão Financeira Consolidada</h2>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:22%">Fase</th>
      <th style="width:20%">Período estimado</th>
      <th class="right" style="width:22%">Infraestrutura recorrente (mensal)</th>
      <th class="right" style="width:20%">Ferramentas de desenvolvimento (mensal)</th>
      <th class="right">Custos únicos</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Fase 1</strong><br>Beta / Mostra</td>
      <td>Set–Out/2026</td>
      <td class="right bold">R$ 0,00</td>
      <td class="right">R$ 75,98</td>
      <td class="right">R$ 40,00 (domínio, opcional)</td>
    </tr>
    <tr>
      <td><strong>Fase 2</strong><br>Implementação real</td>
      <td>1º Sem/2027</td>
      <td class="right bold">≈ R$ 264,33</td>
      <td class="right">≈ R$ 75,98<br><small style="color:#555;">(ChatGPT Go + Google AI Pro)</small></td>
      <td class="right">—</td>
    </tr>
    <tr>
      <td><strong>Fase 3</strong><br>LGPD e segurança</td>
      <td>2º Sem/2027</td>
      <td class="right bold">≈ R$ 264,33</td>
      <td class="right">≈ R$ 75,98</td>
      <td class="right">R$ 0 a R$ 500,00</td>
    </tr>
    <tr class="total-row">
      <td colspan="2"><strong>TOTAL ANUAL estimado (Fases 2+3 — 12 meses)</strong></td>
      <td class="right">≈ R$ 3.171,96</td>
      <td class="right">≈ R$ 911,76</td>
      <td class="right">R$ 0 a R$ 540,00</td>
    </tr>
    <tr class="total-row">
      <td colspan="4"><strong>TOTAL RECORRENTE ANUAL (infraestrutura + ferramentas de desenvolvimento)</strong></td>
      <td class="right"><strong>≈ R$ 4.083,72 / ano</strong></td>
    </tr>
  </tbody>
</table>

<div class="infobox" style="border-left-color:#0f2e6e; background:#eef2fb;">
  <strong style="font-size:9.5pt; display:block; margin-bottom:5px; color:#0f2e6e;">CUSTO RECORRENTE MENSAL ESTIMADO APÓS A IMPLANTAÇÃO REAL</strong>
  <table style="width:100%; border-collapse:collapse; font-size:8.8pt;">
    <tr>
      <td style="padding:2px 0;"><strong>Infraestrutura do sistema (banco + hospedagem + domínio):</strong></td>
      <td style="text-align:right; font-weight:bold;">≈ R$ 264,33 / mês</td>
    </tr>
    <tr>
      <td style="padding:2px 0;"><strong>Ferramentas de desenvolvimento utilizadas pelo responsável técnico:</strong></td>
      <td style="text-align:right; font-weight:bold;">≈ R$ 75,98 / mês</td>
    </tr>
    <tr style="border-top:1px solid #9ab0d6;">
      <td style="padding:4px 0 2px 0;"><strong>Total considerando ambos:</strong></td>
      <td style="text-align:right; font-weight:bold; color:#0f2e6e; font-size:10pt;">≈ R$ 340,31 / mês</td>
    </tr>
  </table>
</div>

<div class="infobox">
  <strong>Observação:</strong> Os custos de infraestrutura são recorrentes e necessários para manter a plataforma em produção. As ferramentas de desenvolvimento assistido são utilizadas pelo responsável técnico para programar, testar, corrigir e evoluir o sistema; elas <strong>não são necessárias</strong> para que a plataforma funcione para os alunos e professores. Créditos adicionais do Antigravity, ChatGPT Plus e Claude Pro <strong>não estão inclusos no custo atual</strong> — são cenários futuros ou opcionais. <strong>Os valores anuais correspondem à projeção de 12 meses de custos recorrentes. Investimento inicial estimado até a Mostra (Fase 1): R$ 191,96 (este valor inicial não representa uma mensalidade).</strong>
</div>


<!-- ═══════════════════════════════════════════════
     9. CRONOGRAMA
═══════════════════════════════════════════════ -->
<h2>9. Cronograma de Referência</h2>

<table class="tbl">
  <thead>
    <tr><th style="width:18%">Período</th><th style="width:14%" class="center">Marco</th><th>Entregas previstas</th></tr>
  </thead>
  <tbody>
    <tr><td>Setembro de 2026</td><td class="center"><span class="badge badge-blue">Agora</span></td><td>MVP funcional em demo. Redesign visual. Deploy no Vercel (gratuito). Preparação do material da Mostra (texto de leitura, atividade, roteiro de apresentação).</td></tr>
    <tr><td>27 de outubro de 2026</td><td class="center"><span class="badge badge-blue">Fase 1</span></td><td>Site finalizado para apresentação. Visual profissional. URL pública estável. Aprovação da direção.</td></tr>
    <tr><td>28–29 de outubro de 2026</td><td class="center"><span class="badge badge-green">🎓 Mostra</span></td><td><strong>Mostra Pedagógica do CETEP.</strong> Apresentação ao público, professores, alunos e convidados. Demo ao vivo com alunos e painel do professor.</td></tr>
    <tr><td>Nov/2026 – Jan/2027</td><td class="center"><span class="badge badge-yellow">Pós-mostra</span></td><td>Coleta de feedback. Definição do roadmap real. Aprovação do orçamento. Início do planejamento da Fase 2.</td></tr>
    <tr><td>Fev–Jun/2027</td><td class="center"><span class="badge badge-yellow">Fase 2</span></td><td>Contratação Supabase Pro + Vercel Pro. Migração do DataService para Supabase. Autenticação real. RLS. Painel do professor com dados reais. Testes com turma piloto.</td></tr>
    <tr><td>Jul–Dez/2027</td><td class="center"><span class="badge badge-red">Fase 3</span></td><td>Elaboração da Política de Privacidade. RIPD. Consentimento dos responsáveis. Pentest básico. Lançamento oficial para todos os alunos da instituição.</td></tr>
  </tbody>
</table>

<!-- ═══════════════════════════════════════════════
     10. RECOMENDAÇÕES FINAIS
═══════════════════════════════════════════════ -->
<h2>10. Recomendações e Próximos Passos</h2>

<ol style="margin:0 0 6px 18px; font-size:9pt; line-height:1.6;">
  <li><strong>Autorizar a Fase 1 imediatamente</strong> — não há custo de infraestrutura; apenas o trabalho de finalização visual e deploy.</li>
  <li><strong>Registrar o domínio .com.br</strong> (R$ 40,00 no Registro.br) para dar identidade permanente ao projeto.</li>
  <li><strong>Apresentar o projeto na Mostra</strong> em 28–29/10/2026 para validar com a comunidade escolar e levantar demanda real de uso.</li>
  <li><strong>Após a Mostra</strong>, apresentar este documento ao conselho ou direção para aprovação formal do orçamento das Fases 2 e 3.</li>
  <li><strong>Iniciar o processo LGPD antes da coleta de dados reais</strong> — os formulários de consentimento dos responsáveis devem estar prontos antes de qualquer aluno criar conta com dados que sejam armazenados em servidor.</li>
  <li><strong>Explorar convênio com o Supabase e Vercel</strong> para desconto educacional — isso pode reduzir em até 50% o custo mensal de infraestrutura.</li>
  <li><strong>Considerar o projeto como componente curricular</strong> do próprio Curso Técnico em Informática — alunos avançados podem contribuir com o desenvolvimento, ampliando o aprendizado prático e reduzindo custos de mão de obra.</li>
</ol>

<div class="infobox">
  <strong>Potencial de expansão:</strong> O CETEP Tech Study foi projetado com arquitetura modular e escalável. Após a implementação completa no curso Técnico em Informática, o sistema pode ser adaptado para outros cursos e unidades do CETEP Recôncavo II sem necessidade de reescrita, apenas configurando novas disciplinas, professores e turmas no painel de administração.
</div>

<!-- ═══════════════════════════════════════════════
     ASSINATURAS
═══════════════════════════════════════════════ -->
<!-- ═══════════════════════════════════════════════
     11. RESPONSABILIDADE TÉCNICA
═══════════════════════════════════════════════ -->
<h2>11. Responsabilidade Técnica e Continuidade do Projeto</h2>

<p>O responsável pelo desenvolvimento do CETEP Tech Study tem interesse em continuar cuidando do projeto enquanto ele permanecer ativo na instituição. Isso inclui manter o site funcionando, corrigir problemas, atualizar o sistema, adicionar novas funcionalidades e garantir que tudo esteja seguro e acessível para os alunos e professores.</p>

<p>As áreas de atuação previstas são:</p>
<ul class="blist tight">
  <li>Manutenção técnica e correção de falhas</li>
  <li>Atualizações de segurança e acessibilidade</li>
  <li>Gerenciamento da infraestrutura e do ambiente de produção</li>
  <li>Implantação de novas funcionalidades conforme demanda pedagógica</li>
  <li>Suporte técnico ao uso da plataforma por alunos e professores</li>
  <li>Evolução contínua do sistema</li>
</ul>

<p>A forma de continuidade desse trabalho — se como colaboração voluntária, estágio, bolsa ou outra modalidade — será definida pela instituição de acordo com suas normas e possibilidades.</p>

<div class="infobox">
  <strong>Responsável técnico proposto:</strong> Matheus de Jesus Nascimento — desenvolvimento, manutenção, implantação e suporte técnico do CETEP Tech Study.
</div>

<div class="alertbox">
  <strong>Nota:</strong> Este registro expressa disponibilidade e intenção. Não é um contrato, não define salário, cargo ou modalidade de vínculo. Qualquer formalização caberá à administração escolar.
</div>

<div class="pb"></div>
<h2>Aprovação e Ciência</h2>

<p style="margin-bottom:14px;">Este documento foi elaborado para apresentação à direção do CETEP Recôncavo II Alberto Torres e representa o planejamento técnico e orçamentário do projeto <strong>CETEP Tech Study</strong>. As informações financeiras são estimativas baseadas em preços oficialmente publicados pelos fornecedores em setembro de 2026, sujeitas a variação cambial e atualização de tabelas de preços.</p>

<div class="sig-section">
  <div class="sig-title">Aprovação e Ciência Institucional</div>
  <div class="sig-grid">
    <div>
      <div class="sig-field">
        <span class="sig-label">Responsável pelo projeto e desenvolvimento</span>
        <div style="margin-top:4px; font-size:9pt; font-weight:bold; color:#1a1a1a;">Matheus de Jesus Nascimento</div>
        <div class="sig-line" style="margin-top:18px;"></div>
        <div class="sig-sub">Assinatura</div>
      </div>
      <div class="sig-field">
        <span class="sig-label">Cargo / Função na instituição</span>
        <div class="sig-line"></div>
        <div class="sig-sub">Ex.: Estudante do Técnico em Informática / Desenvolvedor</div>
      </div>
    </div>
    <div>
      <div class="sig-field">
        <span class="sig-label">Direção da Instituição</span>
        <div class="sig-line"></div>
        <div class="sig-sub">Nome completo / Assinatura</div>
      </div>
      <div class="sig-field">
        <span class="sig-label">Cargo</span>
        <div class="sig-line"></div>
        <div class="sig-sub">Ex.: Diretora Geral / Diretora Pedagógica</div>
      </div>
    </div>
    <div>
      <div class="sig-field">
        <span class="sig-label">Coordenação Pedagógica / AEE</span>
        <div class="sig-line"></div>
        <div class="sig-sub">Nome completo / Assinatura</div>
      </div>
      <div class="sig-field">
        <span class="sig-label">Cargo / Função</span>
        <div class="sig-line"></div>
        <div class="sig-sub">Ex.: Coordenador(a) de AEE / Professor(a) de TI</div>
      </div>
    </div>
    <div>
      <div class="sig-field">
        <span class="sig-label">Data de aprovação</span>
        <div class="sig-line"></div>
        <div class="sig-sub">______ / ______ / __________</div>
      </div>
      <div class="sig-field">
        <span class="sig-label">Carimbo institucional (se aplicável)</span>
        <div style="height:38px; border: 0.75px dashed #9ab0d6; margin-top:4px; border-radius:2px;"></div>
      </div>
    </div>
  </div>
  <div style="margin-top:6px; font-size:7.8pt; color:#555; border-top:0.5px solid #d0d8ea; padding-top:6px;">
    Documento de planejamento interno. Não constitui contrato ou compromisso financeiro formal. Valores estimados com base em preços de mercado de setembro de 2026. Para formalização de despesas, consultar a Coordenação Financeira da instituição.
  </div>
</div>

</body>
</html>
"""

# write html
html_path = os.path.abspath("orcamento_cetep_tech_study.html")
pdf_path  = os.path.abspath("orcamento_cetep_tech_study.pdf")

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

# generate PDF via Chrome headless
browser = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
res = subprocess.run([
    browser,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={pdf_path}",
    f"file:///{html_path.replace(os.sep, '/')}",
], capture_output=True, text=True)

print("Exit code:", res.returncode)
print("Stderr:", res.stderr[:300] if res.stderr else "—")
exists = os.path.exists(pdf_path)
print(f"PDF exists: {exists}")
if exists:
    size = os.path.getsize(pdf_path)
    print(f"PDF size: {size:,} bytes ({size/1024:.1f} KB)")
