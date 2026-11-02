/**
 * Catálogo Pedagógico Interativo — CETEP Recôncavo II Alberto Torres
 *
 * Base legal e curricular:
 * - Ensino Médio (Formação Geral Básica): LDB (Lei 9.394/96, Art. 35) e BNCC
 * - Educação Profissional Técnica de Nível Médio: Catálogo SUPROT / SEC-BA
 *   (Curso Técnico em Informática — Eixo Informação e Comunicação)
 *
 * COMO EXPANDIR FUTURAMENTE:
 * - Para adicionar novas videoaulas em qualquer matéria, basta incluir um item
 *   no array `videoSuggestions` da respectiva aba em `STUDY_SUBJECT_TABS`.
 * - Para adicionar novos módulos passo a passo ou exercícios guiados em Física,
 *   História, Geografia, Português, Química ou Biologia, basta adicionar objetos
 *   nos arrays `modules` e `exercises` da respectiva matéria abaixo.
 */

export const STUDY_SUBJECT_TABS = [
  {
    id: 'matematica',
    label: 'Matemática (LDB)',
    shortLabel: 'Matemática',
    badge: 'Interativo',
    icon: '🧮',
    legalBasis: 'LDB Art. 35 • BNCC Matemática e suas Tecnologias (Ensino Médio)',
    description:
      'Nivelamento visual de Matemática Básica, Álgebra passo a passo, Leitura de Gráficos e Simulador de Média das Unidades do CETEP.',
    hasInteractiveLab: true,
    modules: [
      {
        id: 'mat-basica-fracoes',
        title: 'Módulo 1 — Frações, Decimais e Porcentagem (Nivelamento)',
        subtitle: 'Entenda visualmente que fração, número com vírgula e porcentagem são três jeitos de mostrar a mesma parte.',
        tag: 'Matemática Básica',
        steps: [
          {
            title: 'Passo 1: O que é uma fração de verdade?',
            text: 'Imagine uma barra dividida em partes iguais. O número de baixo (denominador) diz em quantas partes a barra foi cortada. O número de cima (numerador) diz quantas partes você pegou.',
            formula: '1 / 4 = 1 parte de 4',
          },
          {
            title: 'Passo 2: Transformando em número decimal',
            text: 'Se você dividir o número de cima pelo de baixo (1 dividido por 4), encontra 0,25. Não precisa decorar: toda fração é uma divisão!',
            formula: '1 ÷ 4 = 0,25',
          },
          {
            title: 'Passo 3: E a porcentagem (%)?',
            text: 'Porcentagem significa "por cem". Multiplicando o decimal por 100, descobrimos quantos por cento da barra estão preenchidos: 0,25 × 100 = 25%.',
            formula: '0,25 × 100 = 25%',
          },
        ],
      },
      {
        id: 'mat-basica-regra3',
        title: 'Módulo 2 — Regra de Três Simples Sem Mistério',
        subtitle: 'Quando três valores são conhecidos, descobrimos o quarto valor (X) mantendo a proporção.',
        tag: 'Proporcionalidade',
        steps: [
          {
            title: 'Passo 1: Alinhe grandezas iguais na mesma coluna',
            text: 'Coloque a mesma unidade embaixo da mesma unidade (por exemplo: minutos embaixo de minutos, páginas embaixo de páginas).',
            formula: 'Coluna A (Tempo) ↔ Coluna B (Resultado)',
          },
          {
            title: 'Passo 2: Multiplique cruzado (em X)',
            text: 'Em grandezas diretamente proporcionais (quando uma sobe, a outra também sobe), multiplicamos em formato de X.',
            formula: 'A × X = B × C',
          },
          {
            title: 'Passo 3: Isole o X passando dividindo',
            text: 'O número que estava multiplicando o X passa para o outro lado dividindo. Pronto!',
            formula: 'X = (B × C) ÷ A',
          },
        ],
      },
      {
        id: 'mat-em-equacoes',
        title: 'Módulo 3 — Equações de 1º e 2º Grau e Funções (Ensino Médio)',
        subtitle: 'A lógica da balança de equilíbrio e a fórmula de Bhaskara dividida em 3 micro-passos.',
        tag: 'Álgebra LDB',
        steps: [
          {
            title: 'Passo 1: Equação de 1º Grau (ax + b = c)',
            text: 'Pense no sinal de igual (=) como o meio de uma balança. Para deixar o X sozinho, primeiro passamos o número somando/subtraindo para o outro lado com operação inversa.',
            formula: '2x + 4 = 14  →  2x = 14 - 4  →  x = 10 ÷ 2 = 5',
          },
          {
            title: 'Passo 2: Equação de 2º Grau — Quem são a, b, c?',
            text: 'Toda equação ax² + bx + c = 0 tem três coeficientes: "a" acompanha o x², "b" acompanha o x, e "c" é o número sozinho. Identificá-los evita 90% dos erros!',
            formula: 'x² - 5x + 6 = 0  →  a = 1, b = -5, c = 6',
          },
          {
            title: 'Passo 3: O Discriminante Delta (Δ) e Bhaskara',
            text: 'Primeiro calculamos só o Delta: Δ = b² - 4·a·c. Se Δ > 0, temos 2 raízes reais; se Δ = 0, 1 raiz; se Δ < 0, nenhuma raiz real. Depois aplicamos x = (-b ± √Δ) / (2a).',
            formula: 'Δ = (-5)² - 4·1·6 = 25 - 24 = 1  →  x₁ = 3, x₂ = 2',
          },
        ],
      },
      {
        id: 'mat-em-graficos',
        title: 'Módulo 4 — Estatística, Gráficos e Média Escolar (ENEM / LDB)',
        subtitle: 'Como ler gráficos sem se perder visualmente e calcular médias aritméticas.',
        tag: 'Estatística & ENEM',
        steps: [
          {
            title: 'Passo 1: Leia os eixos antes das barras',
            text: 'Todo gráfico tem um eixo horizontal (geralmente o tempo ou categorias) e um eixo vertical (a quantidade medida). Olhe os títulos dos eixos primeiro.',
            formula: 'Eixo X (Horizontal) × Eixo Y (Vertical)',
          },
          {
            title: 'Passo 2: Identifique picos, quedas e constância',
            text: 'Procure a barra mais alta (máximo), a mais baixa (mínimo) e onde houve maior salto entre duas colunas vizinhas.',
            formula: 'Variação = Valor Final - Valor Inicial',
          },
          {
            title: 'Passo 3: Média Aritmética Simples',
            text: 'Para achar a média das suas notas nas unidades do CETEP, some todas as notas e divida pela quantidade de unidades.',
            formula: 'Média = (Unid. 1 + Unid. 2 + Unid. 3) ÷ 3',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-mat-1',
        title: 'Porcentagem de bateria do notebook no laboratório',
        question: 'Um computador do laboratório de informática do CETEP está com 3/4 da carga total da bateria. Qual porcentagem isso representa?',
        options: ['25%', '50%', '75%', '80%'],
        correctIndex: 2,
        hints: [
          'Dica 1: Lembre que 1/4 equivale a 0,25 (ou 25%).',
          'Dica 2: Como temos 3 partes de 4 (3/4), basta multiplicar 25% por 3.',
        ],
        explanation: '3 ÷ 4 = 0,75. Multiplicando por 100, temos exatamente 75% de carga!',
      },
      {
        id: 'ex-mat-2',
        title: 'Regra de Três no estudo diário',
        question: 'Se um estudante resolve 6 questões em 15 minutos mantendo o mesmo ritmo, quantas questões ele resolverá em 30 minutos?',
        options: ['9 questões', '12 questões', '15 questões', '18 questões'],
        correctIndex: 1,
        hints: [
          'Dica 1: O tempo dobrou de 15 minutos para 30 minutos.',
          'Dica 2: Pela regra de três: X = (6 × 30) ÷ 15.',
        ],
        explanation: 'Como 30 minutos é o dobro de 15 minutos, a quantidade de questões também dobra: 6 × 2 = 12 questões.',
      },
      {
        id: 'ex-mat-3',
        title: 'Equação de 1º Grau passo a passo',
        question: 'Qual é o valor de x na equação 3x + 5 = 20?',
        options: ['x = 3', 'x = 5', 'x = 7', 'x = 15'],
        correctIndex: 1,
        hints: [
          'Dica 1: Passe o +5 para o outro lado subtraindo: 3x = 20 - 5.',
          'Dica 2: Agora você tem 3x = 15. Divida 15 por 3.',
        ],
        explanation: '3x = 20 - 5 → 3x = 15 → x = 15 ÷ 3 = 5.',
      },
      {
        id: 'ex-mat-4',
        title: 'Média das 3 Unidades no CETEP',
        question: 'Um aluno tirou 6,0 na I Unidade, 7,0 na II Unidade e 8,0 na III Unidade em Matemática. Qual é a sua média final?',
        options: ['6,5', '7,0', '7,5', '8,0'],
        correctIndex: 1,
        hints: [
          'Dica 1: Some as três notas: 6,0 + 7,0 + 8,0.',
          'Dica 2: Divida a soma (21,0) por 3 unidades.',
        ],
        explanation: '(6 + 7 + 8) ÷ 3 = 21 ÷ 3 = 7,0.',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-mat-1',
        title: 'Frações e Porcentagem do Zero (Visual e Rápido)',
        channel: 'Espaço reservado — Sugestão do Professor',
        duration: '12 min',
        topic: 'Matemática Básica',
        url: 'https://www.youtube.com/results?search_query=fracoes+e+porcentagem+matematica+basica+ensino+medio',
        notes: 'Ideal para revisar antes de usar a barra visual de frações.',
      },
      {
        id: 'vid-mat-2',
        title: 'Regra de Três Simples — Passo a Passo sem Decorar',
        channel: 'Espaço reservado — Sugestão do Professor',
        duration: '10 min',
        topic: 'Proporcionalidade',
        url: 'https://www.youtube.com/results?search_query=regra+de+tres+simples+passo+a+passo',
        notes: 'Mostra como montar as colunas e multiplicar cruzado.',
      },
      {
        id: 'vid-mat-3',
        title: 'Equação do 1º e 2º Grau (Bhaskara em 3 passos)',
        channel: 'Espaço reservado — Sugestão do Professor',
        duration: '15 min',
        topic: 'Álgebra Ensino Médio (LDB)',
        url: 'https://www.youtube.com/results?search_query=equacao+1+e+2+grau+passo+a+passo',
        notes: 'Focado em identificar os coeficientes a, b, c e o sinal do Delta.',
      },
    ],
  },
  {
    id: 'informatica',
    label: 'Informática (SUPROT)',
    shortLabel: 'Informática',
    badge: 'Curso Técnico',
    icon: '💻',
    legalBasis: 'Catálogo SUPROT / SEC-BA • Curso Técnico em Informática (CETEP Alberto Torres)',
    description:
      'A matemática aplicada diretamente às disciplinas técnicas de Arquitetura de Computadores, Redes, Lógica de Programação e Desenvolvimento Web.',
    hasInteractiveLab: true,
    modules: [
      {
        id: 'info-binario',
        title: 'Módulo 1 — Sistema Binário e Unidades de Memória (Arquitetura — 80h)',
        subtitle: 'Como os computadores contam usando apenas 0 e 1 (potências de base 2) e a diferença entre bits e Bytes.',
        tag: 'Arquitetura & Manutenção',
        steps: [
          {
            title: 'Passo 1: Por que base 2 (0 e 1)?',
            text: 'No hardware, um circuito elétrico está desligado (0) ou ligado (1). Cada dígito 0 ou 1 é chamado de 1 bit (Binary Digit).',
            formula: '1 Byte = 8 bits (ex: 00001010)',
          },
          {
            title: 'Passo 2: Os 8 cartões de potência de 2',
            text: 'Para converter 1 Byte (8 bits) em número decimal, usamos os valores: 128, 64, 32, 16, 8, 4, 2 e 1. Basta somar apenas as posições onde o bit vale 1!',
            formula: '00001010₂ = 8 + 2 = 10₁₀',
          },
          {
            title: 'Passo 3: Múltiplos de armazenamento (KB, MB, GB, TB)',
            text: 'Na informática, 1 Byte = 8 bits. A cada salto de unidade (KB → MB → GB → TB), multiplicamos por aproximadamente 1.000 (ou 1.024 no padrão binário KiB/MiB/GiB).',
            formula: '1 GB ≈ 1.024 MB  |  1 Byte = 8 bits',
          },
        ],
      },
      {
        id: 'info-redes',
        title: 'Módulo 2 — Velocidade de Download: Mbps vs. MB/s (Redes I e II — 120h)',
        subtitle: 'Por que uma internet de 100 Mega baixa arquivos a 12,5 MB por segundo?',
        tag: 'Redes de Computadores',
        steps: [
          {
            title: 'Passo 1: Letra "b" minúscula vs. "B" maiúscula',
            text: 'As operadoras vendem internet em Megabits por segundo (Mbps, com "b" minúsculo). Já o navegador e o Windows mostram o tamanho dos arquivos em MegaBytes (MB, com "B" maiúsculo).',
            formula: 'b = bit   |   B = Byte (8 bits)',
          },
          {
            title: 'Passo 2: A conta mágica da divisão por 8',
            text: 'Como 1 Byte precisa de 8 bits, para descobrir a velocidade real máxima de download em MB/s basta dividir a velocidade contratada (em Mbps) por 8.',
            formula: 'Velocidade (MB/s) = Internet (Mbps) ÷ 8',
          },
          {
            title: 'Passo 3: Calculando o tempo de download',
            text: 'Se você tem 80 Mbps de internet, sua taxa é 80 ÷ 8 = 10 MB/s. Um arquivo de 200 MB levará 200 ÷ 10 = 20 segundos!',
            formula: 'Tempo (s) = Tamanho (MB) ÷ Taxa (MB/s)',
          },
        ],
      },
      {
        id: 'info-logica-web',
        title: 'Módulo 3 — Operador MOD (%) e Proporções em CSS (Lógica & Web — 160h)',
        subtitle: 'Resto da divisão inteira na programação e cálculo de largura responsiva em telas.',
        tag: 'Lógica & Dev Web',
        steps: [
          {
            title: 'Passo 1: O que faz o operador % (MOD) na programação?',
            text: 'Em linguagens como JavaScript, Python e C, o símbolo % não é porcentagem: ele devolve o RESTO da divisão inteira! Exemplo: 10 % 2 dá resto 0 (logo, 10 é par).',
            formula: 'Se (numero % 2 == 0) → Número Par!',
          },
          {
            title: 'Passo 2: Proporção e Porcentagem no CSS (Desenvolvimento Web)',
            text: 'Para criar sites que funcionam tanto no celular quanto no monitor do laboratório, usamos larguras em % em vez de pixels fixos.',
            formula: 'Largura (px) = Tela Total (px) × (Porcentagem ÷ 100)',
          },
          {
            title: 'Passo 3: Grid de cartões sem quebrar a linha',
            text: 'Se você quer 4 cartões lado a lado ocupando 100% do container, cada cartão ocupa 100% ÷ 4 = 25% da largura (descontando o espaçamento gap).',
            formula: '100% ÷ N colunas = Largura de cada coluna (%)',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-info-1',
        title: 'Conversão Binário → Decimal (Arquitetura de Computadores)',
        question: 'Qual é o valor decimal do número binário de 4 bits 1010₂?',
        options: ['6', '8', '10', '12'],
        correctIndex: 2,
        hints: [
          'Dica 1: Os pesos das 4 posições da direita para a esquerda são: 8, 4, 2, 1.',
          'Dica 2: Em 1010, os bits ligados (1) estão nas posições do 8 e do 2. Some 8 + 2!',
        ],
        explanation: '1×8 + 0×4 + 1×2 + 0×1 = 8 + 2 = 10.',
      },
      {
        id: 'ex-info-2',
        title: 'Taxa real de transferência (Redes de Computadores)',
        question: 'No laboratório do CETEP, um link de rede marca 160 Mbps (Megabits por segundo). Qual é a velocidade máxima teórica de download em MegaBytes por segundo (MB/s)?',
        options: ['16 MB/s', '20 MB/s', '40 MB/s', '160 MB/s'],
        correctIndex: 1,
        hints: [
          'Dica 1: Lembre que 1 Byte = 8 bits.',
          'Dica 2: Divida 160 Mbps por 8 para encontrar a taxa em MB/s.',
        ],
        explanation: '160 Mbps ÷ 8 = 20 MB/s.',
      },
      {
        id: 'ex-info-3',
        title: 'Operador de Resto MOD (%) em Lógica de Programação',
        question: 'Em um algoritmo em JavaScript ou Portugol, qual é o resultado da expressão `17 % 5` (resto da divisão de 17 por 5)?',
        options: ['0', '2', '3', '3,4'],
        correctIndex: 1,
        hints: [
          'Dica 1: Quantas vezes o 5 cabe inteiro dentro de 17? (3 × 5 = 15).',
          'Dica 2: Subtraia 17 - 15 para descobrir quanto sobra de resto.',
        ],
        explanation: '17 dividido por 5 dá quociente 3 (pois 3 × 5 = 15) e sobra resto 2. Portanto, 17 % 5 = 2.',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-info-1',
        title: 'Sistema Binário Descomplicado (Bits, Bytes e Conversão)',
        channel: 'Espaço reservado — Informática CETEP',
        duration: '14 min',
        topic: 'Fundamentos e Arquitetura de Computadores',
        url: 'https://www.youtube.com/results?search_query=sistema+binario+para+iniciantes+arquitetura+de+computadores',
        notes: 'Complementa o conversor de cartões de 8 bits.',
      },
      {
        id: 'vid-info-2',
        title: 'Diferença entre Mbps e MB/s na Prática (Redes)',
        channel: 'Espaço reservado — Informática CETEP',
        duration: '8 min',
        topic: 'Redes de Computadores',
        url: 'https://www.youtube.com/results?search_query=diferenca+mbps+e+mbs+redes',
        notes: 'Explica por que dividimos a velocidade em Megabits por 8.',
      },
      {
        id: 'vid-info-3',
        title: 'Lógica de Programação: Operadores Aritméticos e Resto (%)',
        channel: 'Espaço reservado — Informática CETEP',
        duration: '11 min',
        topic: 'Lógica e Técnica de Programação',
        url: 'https://www.youtube.com/results?search_query=operador+modulo+resto+da+divisao+logica+de+programacao',
        notes: 'Ótimo para descobrir números pares, ímpares e múltiplos.',
      },
    ],
  },
  {
    id: 'fisica',
    label: 'Física',
    shortLabel: 'Física',
    badge: 'Em expansão',
    icon: '⚡',
    legalBasis: 'LDB Art. 35 • BNCC Ciências da Natureza e suas Tecnologias',
    description:
      'Espaço estruturado para conteúdos passo a passo de Física do Ensino Médio (Cinemática, Leis de Newton, Energia e Eletricidade básica) e videoaulas de apoio.',
    hasInteractiveLab: false,
    modules: [
      {
        id: 'fis-cinematica',
        title: 'Módulo Inicial — Velocidade Média e Unidades (km/h ↔ m/s)',
        subtitle: 'A relação entre espaço percorrido e tempo gasto, usando a mesma lógica de proporção da Matemática.',
        tag: 'Cinemática (LDB)',
        steps: [
          {
            title: 'Passo 1: O que é Velocidade Média?',
            text: 'É a divisão da distância percorrida (ΔS) pelo tempo gasto (Δt). Se um ônibus anda 120 km em 2 horas, sua velocidade média foi de 60 km/h.',
            formula: 'Vm = ΔS ÷ Δt',
          },
          {
            title: 'Passo 2: Convertendo m/s para km/h (Regra do 3,6)',
            text: 'Para transformar metros por segundo (m/s) em quilômetros por hora (km/h), multiplique por 3,6. Para fazer o caminho inverso (km/h para m/s), divida por 3,6.',
            formula: 'm/s  × 3,6  →  km/h   |   km/h  ÷ 3,6  →  m/s',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-fis-1',
        title: 'Conversão clássica do ENEM (km/h para m/s)',
        question: 'Um veículo se desloca a 72 km/h. Qual é essa velocidade em metros por segundo (m/s)?',
        options: ['10 m/s', '20 m/s', '25 m/s', '36 m/s'],
        correctIndex: 1,
        hints: [
          'Dica 1: Para passar de km/h para m/s, dividimos o valor por 3,6.',
          'Dica 2: Quanto é 72 ÷ 3,6? (Dica: 36 × 2 = 72).',
        ],
        explanation: '72 ÷ 3,6 = 20 m/s.',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-fis-1',
        title: 'Cinemática: Velocidade Média e Conversão km/h ↔ m/s',
        channel: 'Espaço reservado para Videoaulas de Física',
        duration: '12 min',
        topic: 'Física — 1º Ano',
        url: 'https://www.youtube.com/results?search_query=velocidade+media+fisica+ensino+medio',
        notes: 'Você pode adicionar novas videoaulas de Física em src/data/cetepStudyCatalog.js.',
      },
    ],
  },
  {
    id: 'humanas',
    label: 'História & Geografia',
    shortLabel: 'Humanas',
    badge: 'Em expansão',
    icon: '🌍',
    legalBasis: 'LDB Art. 35 • BNCC Ciências Humanas e Sociais Aplicadas',
    description:
      'Espaço preparado para linhas do tempo visuais, mapas mentais de História da Bahia e do Brasil, Geografia, Sociologia e Filosofia.',
    hasInteractiveLab: false,
    modules: [
      {
        id: 'hum-reconcavo',
        title: 'Módulo Inicial — Leitura de Fontes Históricas, Mapas e Escalas',
        subtitle: 'Como analisar textos históricos, mapas temáticos e dados demográficos sem sobrecarga de leitura.',
        tag: 'Ciências Humanas (LDB)',
        steps: [
          {
            title: 'Passo 1: Identifique Tempo e Espaço (Onde e Quando)',
            text: 'Antes de responder qualquer questão de História ou Geografia, grife o século/ano e a região geográfica mencionada no comando.',
            formula: 'Contexto = Tempo (Século/Ano) + Espaço (Região/Território)',
          },
          {
            title: 'Passo 2: Escala Cartográfica em Geografia',
            text: 'Em um mapa com escala 1:100.000, cada 1 cm medido na folha equivale a 100.000 cm (ou seja, 1 km) no terreno real.',
            formula: 'D (Real) = d (Mapa) × Escala',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-hum-1',
        title: 'Séculos em História (Regra prática)',
        question: 'O CETEP Recôncavo II Alberto Torres tem suas raízes históricas em 1948. A qual século pertence o ano de 1948?',
        options: ['Século XVIII (18)', 'Século XIX (19)', 'Século XX (20)', 'Século XXI (21)'],
        correctIndex: 2,
        hints: [
          'Dica 1: Quando o ano não termina em 00, pegamos os dois primeiros dígitos (19) e somamos 1.',
          'Dica 2: 19 + 1 = 20 (Século XX).',
        ],
        explanation: '1948 pertence ao Século XX (que vai de 1901 até 2000).',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-hum-1',
        title: 'História da Bahia e do Recôncavo: Revisão Visual',
        channel: 'Espaço reservado para Videoaulas de Humanas',
        duration: '15 min',
        topic: 'História & Geografia',
        url: 'https://www.youtube.com/results?search_query=historia+da+bahia+ensino+medio',
        notes: 'Adicione playlists de História, Geografia, Sociologia e Filosofia aqui.',
      },
    ],
  },
  {
    id: 'linguagens',
    label: 'Português & Redação',
    shortLabel: 'Linguagens',
    badge: 'Em expansão',
    icon: '✍️',
    legalBasis: 'LDB Art. 35 • BNCC Linguagens e suas Tecnologias',
    description:
      'Espaço estruturado para interpretação de textos, estrutura da Redação dissertativo-argumentativa, Inglês Técnico e videoaulas.',
    hasInteractiveLab: false,
    modules: [
      {
        id: 'ling-redacao',
        title: 'Módulo Inicial — Estrutura da Redação em 4 Blocos Visuais',
        subtitle: 'Divida seu texto em partes claras para vencer o bloqueio da folha em branco.',
        tag: 'Redação & Português',
        steps: [
          {
            title: 'Passo 1: Introdução (Tema + Tese)',
            text: 'Apresente o assunto e diga claramente qual é o problema central e quais 2 argumentos você vai defender nos próximos parágrafos.',
            formula: 'Parágrafo 1 = Contextualização + Tese (Argumento 1 + Argumento 2)',
          },
          {
            title: 'Passo 2: Desenvolvimento 1 e 2',
            text: 'No Parágrafo 2, explique o Argumento 1 com um exemplo ou dado. No Parágrafo 3, explique o Argumento 2.',
            formula: 'Parágrafos 2 e 3 = Tópico frasal + Repertório + Explicação',
          },
          {
            title: 'Passo 3: Conclusão (Proposta de Intervenção)',
            text: 'Responda a 5 perguntas curtas: Quem vai fazer? O que vai fazer? Como? Com qual efeito? + Detalhamento.',
            formula: 'Parágrafo 4 = Agente + Ação + Meio/Modo + Efeito + Detalhamento',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-ling-1',
        title: 'Elementos da Proposta de Intervenção (Redação)',
        question: 'Na conclusão de uma redação estilo ENEM, quantos elementos obrigatórios compõem uma proposta de intervenção nota máxima?',
        options: ['2 elementos', '3 elementos', '5 elementos', '8 elementos'],
        correctIndex: 2,
        hints: [
          'Dica 1: Lembre da lista: Agente (Quem?), Ação (O quê?), Meio/Modo (Como?), Efeito (Para quê?) e Detalhamento.',
        ],
        explanation: 'São 5 elementos: Agente, Ação, Meio/Modo, Efeito e Detalhamento.',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-ling-1',
        title: 'Como Começar uma Redação sem Travar (Passo a Passo)',
        channel: 'Espaço reservado para Videoaulas de Linguagens',
        duration: '10 min',
        topic: 'Português & Redação',
        url: 'https://www.youtube.com/results?search_query=como+fazer+redacao+passo+a+passo+ensino+medio',
        notes: 'Espaço pronto para sugestões dos professores de Linguagens do CETEP.',
      },
    ],
  },
  {
    id: 'natureza',
    label: 'Química & Biologia',
    shortLabel: 'Química & Bio',
    badge: 'Em expansão',
    icon: '🧬',
    legalBasis: 'LDB Art. 35 • BNCC Ciências da Natureza e suas Tecnologias',
    description:
      'Espaço reservado para Ecologia, Sustentabilidade (Tema da Mostra Científica AEE!), Citologia, Química Geral e videoaulas.',
    hasInteractiveLab: false,
    modules: [
      {
        id: 'nat-sustentabilidade',
        title: 'Módulo Inicial — Sustentabilidade, Energia e Meio Ambiente',
        subtitle: 'Conectando Biologia e Química ao tema da Mostra Científica do CETEP.',
        tag: 'Sustentabilidade & Natureza',
        steps: [
          {
            title: 'Passo 1: O Tripé da Sustentabilidade',
            text: 'Sustentabilidade equilibra 3 dimensões: Ambiental (preservar recursos naturais), Social (qualidade de vida e inclusão) e Econômica (uso eficiente sem desperdício).',
            formula: 'Sustentabilidade = Ambiental + Social + Econômico',
          },
          {
            title: 'Passo 2: Descarte consciente de lixo eletrônico (E-lixo)',
            text: 'Na Informática, placas, pilhas e baterias contêm metais pesados que não devem ir para o lixo comum. Reaproveitar computadores no laboratório é sustentabilidade na prática!',
            formula: 'Reduzir → Reutilizar → Reciclar (3 Rs na TI)',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'ex-nat-1',
        title: 'Sustentabilidade e TI Verde',
        question: 'Qual atitude no laboratório de informática contribui diretamente para a sustentabilidade ambiental?',
        options: [
          'Deixar todos os monitores ligados durante o final de semana',
          'Descartar baterias e placas eletrônicas em pontos de coleta de lixo eletrônico (e-lixo)',
          'Imprimir todos os códigos em papel antes de testar',
          'Trocar computadores que precisam apenas de limpeza preventiva',
        ],
        correctIndex: 1,
        hints: [
          'Dica 1: Baterias e placas possuem componentes químicos que contaminam o solo se descartados no lixo comum.',
        ],
        explanation: 'A coleta adequada de e-lixo e a manutenção preventiva evitam contaminação química e reduzem o desperdício.',
      },
    ],
    videoSuggestions: [
      {
        id: 'vid-nat-1',
        title: 'Sustentabilidade, Ecologia e Ciclos Biogeoquímicos',
        channel: 'Espaço reservado para Videoaulas de Química & Biologia',
        duration: '13 min',
        topic: 'Biologia & Química',
        url: 'https://www.youtube.com/results?search_query=sustentabilidade+ecologia+ensino+medio',
        notes: 'Espaço pronto para adicionar aulas de Química e Biologia.',
      },
    ],
  },
];
