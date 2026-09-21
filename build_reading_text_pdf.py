import os
import subprocess

html_content = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Texto de Leitura e Estudo - CETEP Tech Study</title>
<style>
  @page {
    size: A4 portrait;
    margin: 11mm 15mm 11mm 15mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-size: 9.6pt;
    line-height: 1.36;
    color: #000000;
    background: #ffffff;
    text-align: justify;
  }

  /* ── Header Box ── */
  .header-box {
    border: 1.8px solid #000000;
    padding: 6px 10px;
    margin-bottom: 12px;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
  }
  .header-logo-cell {
    width: 75px;
    vertical-align: middle;
    text-align: center;
    padding-right: 10px;
    border-right: 1.5px solid #000000;
  }
  .header-content-cell {
    padding-left: 12px;
    vertical-align: middle;
  }
  .school-title {
    text-align: center;
    font-size: 11pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.2;
    margin-bottom: 5px;
    letter-spacing: 0.01em;
  }
  .header-fields-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .header-fields-table td {
    padding: 1.5px 0;
  }

  /* ── Main Titles ── */
  .doc-title {
    text-align: center;
    font-size: 11.5pt;
    font-weight: bold;
    text-transform: uppercase;
    text-decoration: underline;
    margin-bottom: 10px;
    letter-spacing: 0.02em;
  }

  /* ── Section Headings ── */
  h2 {
    font-size: 10.2pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 8px;
    margin-bottom: 4px;
    color: #000000;
    border-bottom: 1px solid #cccccc;
    padding-bottom: 1px;
  }

  p {
    margin-bottom: 6px;
    text-indent: 18px;
  }
  p.no-indent {
    text-indent: 0;
  }

  /* ── Feature List ── */
  .topic-item {
    margin-bottom: 6px;
    padding-left: 6px;
  }
  .topic-item strong {
    color: #000000;
  }

  /* ── Discussion Box ── */
  .discussion-box {
    background-color: #f5f5f5;
    border: 1px solid #999999;
    border-left: 4px solid #000000;
    padding: 8px 12px;
    margin-top: 10px;
    margin-bottom: 8px;
    font-size: 9.2pt;
  }
  .discussion-box strong {
    display: block;
    margin-bottom: 4px;
    text-transform: uppercase;
    font-size: 9.5pt;
  }
  .discussion-box ol {
    margin-left: 18px;
  }
  .discussion-box li {
    margin-bottom: 3px;
  }

  /* ── Page Break Helper ── */
  .page-break {
    page-break-before: always;
  }
</style>
</head>
<body>

  <!-- ══════════════════════════════════════════════ HEADER ══════════════════════════════════════════════ -->
  <div class="header-box">
    <table class="header-table">
      <tr>
        <td class="header-logo-cell">
          <svg width="66" height="66" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#b22222" stroke-width="2.5"/>
            <path d="M 22 50 Q 50 16 78 50 Q 50 84 22 50" fill="none" stroke="#2e8b57" stroke-width="2"/>
            <text x="50" y="35" font-size="10.5" font-family="Arial" font-weight="bold" fill="#b22222" text-anchor="middle">CETEP</text>
            <text x="50" y="46" font-size="5.8" font-family="Arial" font-weight="bold" fill="#111111" text-anchor="middle">RECÔNCAVO II</text>
            <text x="50" y="55" font-size="6.2" font-family="Arial" font-weight="bold" fill="#111111" text-anchor="middle">ALBERTO TORRES</text>
            <text x="50" y="66" font-size="4.8" font-family="Arial" fill="#555555" text-anchor="middle">Cruz das Almas - BA</text>
            <text x="50" y="75" font-size="4.8" font-family="Arial" font-weight="bold" fill="#b22222" text-anchor="middle">Desde 1948</text>
          </svg>
        </td>
        <td class="header-content-cell">
          <div class="school-title">
            CENTRO TERRITORIAL DE EDUCAÇÃO PROFISSIONAL<br>
            RECÔNCAVO II ALBERTO TORRES
          </div>
          <table class="header-fields-table">
            <tr>
              <td colspan="2">
                <strong>Estudante:</strong> __________________________________________________
              </td>
              <td style="text-align: right;">
                <strong>Data:</strong> ______________
              </td>
            </tr>
            <tr>
              <td><strong>Curso:</strong> Técnico em Informática</td>
              <td><strong>Série:</strong> 2º ano</td>
              <td style="text-align: right;"><strong>Turno:</strong> Matutino</td>
            </tr>
            <tr>
              <td colspan="2"><strong>Componente:</strong> Atend. Educacional Especializado (AEE)</td>
              <td style="text-align: right;"><strong>Prof. (a):</strong> _________________</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>

  <!-- ══════════════════════════════════════════════ TITLE ══════════════════════════════════════════════ -->
  <div class="doc-title">TEXTO DE LEITURA: O PROJETO "CETEP TECH STUDY" E A ROTINA DE ESTUDOS</div>

  <!-- ══════════════════════════════════════════════ SECTION 1 ══════════════════════════════════════════════ -->
  <h2>1. Contexto e Desafios no Curso Técnico em Informática</h2>
  <p>
    O curso Técnico em Informática Integrado ao Ensino Médio no CETEP Alberto Torres exige dos estudantes dedicação constante a componentes curriculares de alta complexidade técnica. Ao longo do ano letivo, a turma lida simultaneamente com disciplinas como <em>Algoritmos e Lógica de Programação, Redes de Computadores, Arquitetura de Hardware, Banco de Dados e Desenvolvimento Web</em>, além das matérias da base comum nacional.
  </p>
  <p>
    Essa rotina intensa gera um volume expressivo de avaliações práticas, entregas de relatórios, listas de exercícios e seminários. Para muitos estudantes — em especial aqueles acompanhados pelo Atendimento Educacional Especializado (AEE), como alunos com Transtorno do Déficit de Atenção com Hiperatividade (TDAH), Transtorno do Espectro Autista (TEA) ou baixa visão —, o maior desafio não é a capacidade de aprender os códigos ou os circuitos, mas sim gerenciar o tempo, evitar a sobrecarga sensorial e organizar as etapas de cada trabalho sem ansiedade.
  </p>

  <!-- ══════════════════════════════════════════════ SECTION 2 ══════════════════════════════════════════════ -->
  <h2>2. O que é o CETEP Tech Study?</h2>
  <p>
    O <strong>CETEP Tech Study</strong> é uma aplicação web desenvolvida como ferramenta de apoio pedagógico e organizacional voltada para a realidade dos alunos de informática do CETEP. O projeto não se propõe a ser uma ferramenta clínica ou médica, mas sim uma solução tecnológica de acessibilidade e produtividade escolar.
  </p>
  <p>
    A proposta central da plataforma é oferecer um ambiente digital limpo, sem anúncios ou distrações, onde o estudante possa centralizar suas demandas acadêmicas, monitorar seu tempo de dedicação semanal e ajustar a interface de acordo com suas necessidades visuais e cognitivas.
  </p>

  <!-- ══════════════════════════════════════════════ SECTION 3 ══════════════════════════════════════════════ -->
  <h2>3. Principais Funcionalidades da Plataforma</h2>

  <div class="topic-item">
    <strong>a) Divisão de Tarefas em Subtarefas:</strong> Grandes tarefas (como "Construir um Banco de Dados Relacional") costumam causar bloqueio inicial ou procrastinação. O sistema permite cadastrar uma tarefa principal e desmembrá-la em pequenas etapas sequenciais. Cada subtarefa concluída é marcada individualmente, gerando clareza de progresso e diminuindo a sensação de sobrecarga mental.
  </div>

  <div class="topic-item">
    <strong>b) Modo Foco (Técnica de Blocos de Tempo):</strong> Baseado no método Pomodoro, o usuário escolhe tempos pré-definidos (10, 25 ou 50 minutos) ou personalizados. Durante a sessão, o cronômetro visual assume o centro da tela, ocultando menus laterais e elementos secundários para apoiar a manutenção da atenção em uma única atividade por vez.
  </div>

  <div class="topic-item">
    <strong>c) Agenda Escolar e Indicadores de Prioridade:</strong> Cadastro de provas, trabalhos em grupo e reuniões. Os eventos recebem marcações de prioridade por cores: verde (baixa prioridade / prazos longos), amarelo (média prioridade / atenção aos próximos dias) e vermelho (alta prioridade / prazos em menos de 72 horas).
  </div>

  <!-- ══════════════════════════════════════════════ PAGE 2 ══════════════════════════════════════════════ -->
  <div class="page-break"></div>

  <div class="topic-item">
    <strong>d) Gamificação Educacional:</strong> O esforço do estudante é traduzido em métricas motivacionais. O sistema atribui 10 pontos por tarefa concluída, 5 pontos por subtarefa e 15 pontos por sessão de foco finalizada. Com isso, o aluno acompanha sua evolução de nível (de Iniciante até Mestre) e desbloqueia conquistas escolares que valorizam a regularidade nos estudos.
  </div>

  <div class="topic-item">
    <strong>e) Resumidor de Texto Local:</strong> Ferramenta integrada que processa textos teóricos extensos inseridos pelo aluno, identificando as sentenças mais relevantes e palavras-chave por frequência de termos, facilitando a revisão prévia de conteúdos densos de informática.
  </div>

  <!-- ══════════════════════════════════════════════ SECTION 4 ══════════════════════════════════════════════ -->
  <h2>4. Acessibilidade, Privacidade e Portabilidade dos Dados</h2>
  <p>
    Para atender às necessidades de conforto visual, a plataforma disponibiliza três opções de tamanho de fonte (Pequeno, Médio e Grande) e três perfis de contraste: <em>Tema Claro</em> (para ambientes iluminados), <em>Tema Escuro</em> (para redução de fadiga ocular) e <em>Alto Contraste</em> (amarelo sobre fundo preto, indicado para baixa visão).
  </p>
  <p>
    Em relação à segurança, o sistema não exige conexão com servidores externos ou bancos de dados remotos nesta etapa. As informações ficam salvas localmente no navegador (via <em>localStorage</em>) e as senhas dos alunos são protegidas por criptografia (SHA-256). Caso o estudante precise trocar de computador nos laboratórios do CETEP, ele pode utilizar o botão <strong>Exportar Dados</strong> para gerar um arquivo em formato JSON e transferir suas anotações com facilidade.
  </p>

  <!-- ══════════════════════════════════════════════ SECTION 5 ══════════════════════════════════════════════ -->
  <h2>5. Conclusão Pedagógica</h2>
  <p>
    O projeto demonstra que o desenvolvimento de software pode atuar diretamente na inclusão escolar e no fortalecimento da autonomia dos estudantes da educação profissional. Organizar a rotina de estudos em passos acessíveis é uma competência fundamental não apenas para a conclusão do curso técnico, mas também para o futuro exercício profissional no mercado de tecnologia.
  </p>

  <!-- ══════════════════════════════════════════════ DISCUSSION BOX ══════════════════════════════════════════════ -->
  <div class="discussion-box">
    <strong>Questões para Discussão em Sala de Aula:</strong>
    <ol>
      <li>Ao planejar um projeto prático de informática, por que a estratégia de dividir uma tarefa em partes menores ajuda na organização do grupo ou do aluno individual?</li>
      <li>Qual a importância de um sistema de software oferecer ajustes de acessibilidade (como alto contraste e fontes ampliadas) logo em sua tela inicial?</li>
      <li>De que maneira o registro de tempo e o foco direcionado podem colaborar para reduzir o estresse antes das semanas de provas no CETEP?</li>
    </ol>
  </div>

</body>
</html>'''

# Save HTML
html_path = os.path.abspath('texto_leitura_cetep_tech_study.html')
pdf_path = os.path.abspath('texto_leitura_cetep_tech_study.pdf')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

# Compile to PDF using Edge
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
print("PDF compilation exit code:", res.returncode)
print(f"PDF exists: {os.path.exists(pdf_path)}")
if os.path.exists(pdf_path):
    print(f"PDF Size: {os.path.getsize(pdf_path)} bytes")

# Also copy to public folder
subprocess.run(['powershell', '-Command', f'Copy-Item "{pdf_path}" "public/texto_leitura_cetep_tech_study.pdf" -Force'], capture_output=True)
subprocess.run(['powershell', '-Command', f'Copy-Item "{html_path}" "public/texto_leitura_cetep_tech_study.html" -Force'], capture_output=True)
