// Game logic extracted from inline script
let jogadores = [];
let perguntasSelecionadas = [];
let perguntaAtual = 0;
let playersAnswers = []; // respostas temporárias por pergunta (índice original por jogador ou null)
let playersButtons = []; // referências aos botões por jogador para marcar feedback (buttons in displayed order)
let playersLocalIndices = []; // mapping per player: displayedIndex -> original option index
let playersAnswerOrder = []; // ordem em que os jogadores responderam (índices de jogador)
let showingFeedback = false; // flag para estado de feedback antes de avançar
let playersScoreBadges = []; // elementos de badge de pontuação por jogador
let audioCtx = null;
let suspenseOsc = null;
let suspenseGain = null;
let tickIntervalId = null;
let timerIntervalId = null;
let remainingTime = 0;
let timerWasForced = false; // true when we set remainingTime=0 because all players answered
let finalDrumInterval = null;
let bigOverlayKeyHandler = null;
// flag para indicar que as animações do pódio já começaram
let podioAnimationsStarted = false;

// shared selection / feedback sound (used for option selection and point ticks)
function playSelectionSound(freq = 880) {
    try {
        if (!audioCtx)
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.value = 0.000178;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.linearRampToValueAtTime(0.035566, audioCtx.currentTime + 0.01);
        g.gain.linearRampToValueAtTime(0.000178, audioCtx.currentTime + 0.18);
        setTimeout(() => {
            try {
                o.stop();
                o.disconnect();
                g.disconnect();
            } catch (e) {}
        }, 220);
    } catch (e) {
        /* ignore audio errors */
    }
}

const bancoPerguntas = [
    {
        p: "O que significa a sigla EPI?",
        o: [
            "Equipamento de Proteção Individual",
            "Equipe de Prevenção Interna",
            "Estudo de Proteção Industrial",
            "Equipamento de Proteção Integrado",
        ],
        c: 0,
    },
    {
        p: "Qual norma regulamenta o uso de EPI no Brasil?",
        o: ["NR-6", "NR-10", "NR-12", "NR-17"],
        c: 0,
    },
    {
        p: "A NR-10 trata sobre segurança em: ",
        o: [
            "Máquinas pesadas",
            "Instalações elétricas",
            "Altura",
            "Produtos químicos",
        ],
        c: 1,
    },
    {
        p: "Qual o objetivo principal da CIPA?",
        o: [
            "Fiscalizar salários",
            "Prevenir acidentes",
            "Treinar novos funcionários",
            "Elaborar laudos técnicos",
        ],
        c: 1,
    },
    {
        p: "A NR-35 trata de trabalho em: ",
        o: [
            "Ambientes confinados",
            "Altura",
            "Áreas químicas",
            "Ambientes aquáticos",
        ],
        c: 1,
    },
    {
        p: "Extintor classe C é indicado para: ",
        o: [
            "Líquidos inflamáveis",
            "Equipamentos elétricos",
            "Madeira e papel",
            "Gases inflamáveis",
        ],
        c: 1,
    },
    {
        p: "Qual documento registra acidentes de trabalho?",
        o: ["CAT", "CFT", "SAT", "LTCAT"],
        c: 0,
    },
    {
        p: "A cor amarela nas sinalizações geralmente indica: ",
        o: ["Proibição", "Advertência", "Obrigação", "Informação"],
        c: 1,
    },
    {
        p: "EPC significa: ",
        o: [
            "Equipamento de Proteção Coletiva",
            "Estudo de Proteção Civil",
            "Escala de Prevenção Corporativa",
            "Estrutura de Proteção Coletiva",
        ],
        c: 0,
    },
    {
        p: "A NR-12 trata de: ",
        o: [
            "Máquinas e Equipamentos",
            "Produtos Químicos",
            "Riscos Biológicos",
            "Trabalho em altura",
        ],
        c: 0,
    },
    // Mais 40 perguntas reais de Segurança no Trabalho
    {
        p: "Qual é a principal finalidade da NR-1?",
        o: [
            "Definir diretrizes gerais de SST",
            "Regulamentar eletricidade",
            "Normatizar EPI",
            "Estabelecer penalidades administrativas",
        ],
        c: 0,
    },
    {
        p: "O que a NR-5 regulamenta?",
        o: [
            "CIPA",
            "EPC",
            "Brigada de Incêndio",
            "Programa de Conservação auditiva",
        ],
        c: 0,
    },
    {
        p: "Qual a periodicidade mínima da SIPAT?",
        o: ["Mensal", "Semestral", "Anual", "Bienal"],
        c: 2,
    },
    {
        p: "A NR-33 trata de: ",
        o: ["Espaços confinados", "Altura", "Químicos", "Trabalho noturno"],
        c: 0,
    },
    {
        p: "O que significa CAT?",
        o: [
            "Comunicação de Acidente de Trabalho",
            "Cadastro Ambiental Trabalhista",
            "Certificado de Avaliação Técnica",
            "Comissão de Acompanhamento de Trabalho",
        ],
        c: 0,
    },
    {
        p: "Qual o agente de risco representado pela cor azul?",
        o: ["Físico", "Biológico", "Químico", "Ergonômico"],
        c: 0,
    },
    {
        p: "A ergonomia é tratada pela: ",
        o: ["NR-17", "NR-15", "NR-9", "NR-7"],
        c: 0,
    },
    {
        p: "A NR-15 trata de: ",
        o: [
            "Atividades insalubres",
            "Máquinas",
            "Eletricidade",
            "Condições sanitárias",
        ],
        c: 0,
    },
    {
        p: "Qual extintor é indicado para incêndios classe A?",
        o: ["Água", "Pó químico", "CO₂", "Espuma"],
        c: 0,
    },
    {
        p: "A cor vermelha na segurança indica: ",
        o: [
            "Proibição",
            "Equipamentos contra incêndio",
            "Advertência",
            "Saída de emergência",
        ],
        c: 1,
    },
    {
        p: "A NR-18 é aplicada principalmente na: ",
        o: [
            "Construção civil",
            "Indústria farmacêutica",
            "Laboratórios",
            "Setor de TI",
        ],
        c: 0,
    },
    {
        p: "A quem cabe fornecer EPIs?",
        o: ["Empregado", "Empregador", "Governo", "Fornecedor"],
        c: 1,
    },
    {
        p: "A quem cabe usar EPIs corretamente?",
        o: ["Empregador", "Empregado", "Estado", "CIPA"],
        c: 1,
    },
    {
        p: "A escolha do EPI deve ser baseada em: ",
        o: [
            "Preferência do funcionário",
            "Avaliação de riscos",
            "Custo mais baixo",
            "Tendência do mercado",
        ],
        c: 1,
    },
    {
        p: "A NR-32 trata da segurança em: ",
        o: [
            "Ambientes hospitalares",
            "Construção civil",
            "Usinas",
            "Instituições de ensino",
        ],
        c: 0,
    },
    {
        p: "Qual sinalização indica risco biológico?",
        o: [
            "Amarelo com triângulo",
            "Símbolo trevo",
            "Preto e branco X",
            "Símbolo biomédico padrão",
        ],
        c: 1,
    },
    {
        p: "O que é PPRA?",
        o: [
            "Programa de Prevenção de Riscos Ambientais",
            "Plano de Proteção de Riscos Agrários",
            "Projeto de Riscos Associados",
            "Programa de Prevenção de Riscos Administrativos",
        ],
        c: 0,
    },
    {
        p: "O PCMSO é regulamentado por qual NR?",
        o: ["NR-7", "NR-11", "NR-18", "NR-6"],
        c: 0,
    },
    {
        p: "A ordem correta de combate ao incêndio é: ",
        o: [
            "Avaliar, fugir, combater",
            "Identificar, acionar alarme, combater se possível",
            "Combater imediatamente",
            "Chamar a brigada e aguardar",
        ],
        c: 1,
    },
    {
        p: "O uso correto de luvas isolantes é exigido em trabalho: ",
        o: ["Com eletricidade", "Com madeira", "Com altura", "Com solventes"],
        c: 0,
    },
    {
        p: "O que caracteriza um espaço confinado?",
        o: [
            "Alta temperatura",
            "Acesso limitado",
            "Barulho excessivo",
            "Ventilação natural",
        ],
        c: 1,
    },
    {
        p: "A NR-10 exige que o trabalhador seja: ",
        o: [
            "Treinado e capacitado",
            "Graduado em engenharia",
            "Autorizado pela CIPA",
            "Habilitado pelo sindicato",
        ],
        c: 0,
    },
    {
        p: "O mapa de risco utiliza quantas cores principais?",
        o: ["3", "5", "7", "4"],
        c: 1,
    },
    {
        p: "Ruído acima de qual nível exige proteção?",
        o: ["40 dB", "85 dB", "100 dB", "70 dB"],
        c: 1,
    },
    {
        p: "A documentação obrigatória de SST deve ser: ",
        o: [
            "Arquivada por 1 ano",
            "Mantida por 20 anos",
            "Jogada fora mensalmente",
            "Disponibilizada apenas digitalmente",
        ],
        c: 1,
    },
    {
        p: "Qual é a NR que trata de máquinas?",
        o: ["NR-11", "NR-12", "NR-16", "NR-20"],
        c: 1,
    },
    {
        p: "Qual é o equipamento obrigatório para trabalho em altura?",
        o: [
            "Capacete comum",
            "Cinto paraquedista",
            "Luvas de borracha",
            "Protetor auricular",
        ],
        c: 1,
    },
    {
        p: "Extintor classe B é destinado a: ",
        o: [
            "Sólidos",
            "Líquidos inflamáveis",
            "Eletricidade",
            "Gasoso inflamável",
        ],
        c: 1,
    },
    {
        p: "O que é APR?",
        o: [
            "Análise Preliminar de Risco",
            "Apenas Procedimento Rotineiro",
            "Ação Preventiva de Registro",
            "Análise de Processo Rigorosa",
        ],
        c: 0,
    },
    {
        p: "A CIPA deve ter reuniões: ",
        o: ["Semanais", "Mensais", "Anuais", "Bimestrais"],
        c: 1,
    },
    {
        p: "Qual a NR dos inflamáveis e combustíveis?",
        o: ["NR-20", "NR-30", "NR-11", "NR-9"],
        c: 0,
    },
    {
        p: "Qual norma trata de ergonomia?",
        o: ["NR-6", "NR-17", "NR-19", "NR-24"],
        c: 1,
    },
    {
        p: "A quem comunicar um acidente grave?",
        o: [
            "Somente ao supervisor",
            "Apenas à CIPA",
            "Ao Ministério do Trabalho",
            "À família do funcionário",
        ],
        c: 2,
    },
    {
        p: "Qual item NÃO é EPI?",
        o: [
            "Capacete",
            "Protetor Solar",
            "Luva isolante",
            "Cinto de segurança veicular",
        ],
        c: 1,
    },
    {
        p: "A NR-24 trata de: ",
        o: ["Condições sanitárias", "Explosivos", "Ergonomia", "Sinalização"],
        c: 0,
    },
    {
        p: "Em caso de vazamento químico, a primeira ação deve ser: ",
        o: ["Correr", "Isolar a área", "Ligar para colegas", "Ventilar a área"],
        c: 1,
    },
    {
        p: "O que define risco ergonômico?",
        o: ["Ruído", "Postura inadequada", "Calor", "Iluminação insuficiente"],
        c: 1,
    },
    {
        p: "A cor verde indica: ",
        o: ["Segurança", "Incêndio", "Proibição", "Áreas de risco"],
        c: 0,
    },
    {
        p: "A NR-34 é aplicada em: ",
        o: ["Estaleiros", "Fábricas de alimentos", "Laboratórios", "Hospitais"],
        c: 0,
    },
    {
        p: "A análise de risco deve ser feita: ",
        o: [
            "Apenas no início da obra",
            "Sempre antes da atividade",
            "Quando ocorrer acidente",
            "Somente em atividades novas",
        ],
        c: 1,
    },
    {
        p: "O LTCAT serve para: ",
        o: [
            "Avaliar ruído apenas",
            "Analisar agentes nocivos",
            "Calcular folha de pagamento",
            "Registrar inspeções periódicas",
        ],
        c: 1,
    },
];

// Removed automatic filler questions to avoid 'Pergunta extra...' placeholders.

function iniciarJogo() {
    let n = null;
    if (typeof selectedPlayerCount === "number" && selectedPlayerCount >= 1) {
        n = selectedPlayerCount;
    } else {
        const numEl = document.getElementById("numJogadores");
        if (numEl) n = Number(numEl.value);
    }
    if (!n || n < 1 || n > 6) return alert("Número inválido!");

    // If name inputs exist, read them; otherwise fallback to default names
    const nameInputs = Array.from(
        document.querySelectorAll(".playerNameInput")
    );
    if (nameInputs.length === n) {
        jogadores = nameInputs.map((inp, i) => ({
            nome: inp.value.trim() || "Jogador " + (i + 1),
            pontos: 0,
        }));
    } else {
        jogadores = Array.from({ length: n }, (_, i) => ({
            nome: "Jogador " + (i + 1),
            pontos: 0,
        }));
    }
    perguntasSelecionadas = bancoPerguntas
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

    // Garantir 4 alternativas e embaralhar mantendo a resposta correta
    perguntasSelecionadas = perguntasSelecionadas.map((q) => {
        // garantir 4 opções com alternativa plausível
        while (q.o.length < 4) q.o.push("Outra alternativa");

        // embaralhar opções preservando índice da correta
        const oldIndex = q.c;
        const indices = q.o.map((_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const newOptions = indices.map((i) => q.o[i]);
        const newCorrect = indices.indexOf(oldIndex);
        return { p: q.p, o: newOptions, c: newCorrect };
    });

    // preparar respostas por jogador (null = sem resposta ainda)
    playersAnswers = Array(jogadores.length).fill(null);
    perguntaAtual = 0;

    document.getElementById("setup").classList.add("hidden");
    document.getElementById("perguntaArea").classList.remove("hidden");
    // mostrar barra e temporizador fixos
    const bottomBarEl = document.getElementById("bottomBar");
    const bottomTimerEl = document.getElementById("bottomTimer");
    if (bottomBarEl) bottomBarEl.style.display = "block";
    if (bottomTimerEl) bottomTimerEl.style.display = "block";
    // iniciar AudioContext no gesto do usuário
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            audioCtx = null;
        }
    }
    // mostrar overlay inicial e depois começar
    showOverlay("Jogo iniciado", 900, mostrarPergunta);
}

// Attach handlers to the player-count buttons (buttons exist in the DOM since script is loaded at end)
try {
    const countBtns = Array.from(
        document.querySelectorAll(".player-count-btn")
    );
    if (countBtns.length) {
        countBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                const n = Number(btn.dataset.count) || 0;
                configurarJogadores(n);
            });
            // allow Enter/Space keyboard action
            btn.addEventListener("keyup", (ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                    const n = Number(btn.dataset.count) || 0;
                    configurarJogadores(n);
                }
            });
        });
    }
} catch (e) {
    /* ignore init errors */
}

function configurarJogadores(n) {
    // n may be passed from the buttons; fallback to legacy input if available
    let count = Number(n) || 0;
    const numEl = document.getElementById("numJogadores");
    if (!count && numEl) count = Number(numEl.value) || 0;
    if (!count || count < 1 || count > 6)
        return alert("Informe um número de jogadores entre 1 e 6");

    selectedPlayerCount = count;

    // Apply force-full-layout and center-players only for 1..3 players so the
    // single-column/tall layout is used when there are few players. For 4 players
    // we allow sizing like 5-6 players to avoid the height/overflow that previously
    // caused answer boxes to be clipped.

    try {
        if (count <= 3) {
            document.body.classList.add("force-full-layout");
            document.body.classList.add("center-players");
        } else {
            document.body.classList.remove("force-full-layout");
            document.body.classList.remove("center-players");
        }
        // Add a helper class when exactly 4 players are selected so we can
        // apply CSS that matches the players-grid width for the next button.
        if (count === 4) document.body.classList.add("players-4");
        else document.body.classList.remove("players-4");
    } catch (e) {}

    // update active class on the count buttons
    const countButtons = Array.from(
        document.querySelectorAll(".player-count-btn")
    );
    countButtons.forEach((b) => {
        const c = Number(b.dataset.count);
        if (c === count) b.classList.add("active");
        else b.classList.remove("active");
    });

    const container = document.getElementById("playerNamesContainer");
    container.innerHTML = "";
    const info = document.createElement("div");
    info.style.marginTop = "8px";
    info.style.marginBottom = "8px";
    info.innerText = "Digite o nome de cada jogador:";
    container.appendChild(info);

    for (let i = 0; i < count; i++) {
        const row = document.createElement("div");
        row.className = "player-row";
        const lbl = document.createElement("label");
        lbl.innerText = "Jogador " + (i + 1) + ": ";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "playerNameInput";
        inp.value = "Jogador " + (i + 1);
        // select the preset name when the user focuses the field so they can overwrite it quickly
        inp.addEventListener("focus", () => {
            try {
                inp.select();
            } catch (e) {}
        });
        // prevent mouseup from deselecting the selected text (common browser behavior)
        inp.addEventListener("mouseup", (ev) => {
            ev.preventDefault();
        });
        row.appendChild(lbl);
        row.appendChild(inp);
        container.appendChild(row);
    }

    const startBtn = document.createElement("button");
    startBtn.innerText = "Iniciar Jogo";
    startBtn.className = "start-game-btn";
    startBtn.onclick = () => iniciarJogo();
    container.appendChild(startBtn);

    // focus first input
    const first = container.querySelector(".playerNameInput");
    if (first) first.focus();
}

function mostrarPergunta() {
    if (perguntaAtual >= perguntasSelecionadas.length) return finalizar();

    const q = perguntasSelecionadas[perguntaAtual];
    // mostrar 'Pergunta N/M' (por exemplo: Pergunta 1/10)
    const total = perguntasSelecionadas.length || 0;
    document.getElementById("jogadorAtualTitulo").innerText = `Pergunta ${
        perguntaAtual + 1
    }/${total}`;
    // esconder o título principal da página enquanto estivermos na tela de pergunta
    const mainTitle = document.querySelector("h1");
    if (mainTitle) mainTitle.style.display = "none";
    document.getElementById("perguntaTexto").innerText = q.p;

    const opcoesDiv = document.getElementById("opcoes");
    opcoesDiv.innerHTML = "";

    // para cada jogador, criar área de resposta com botões A-D (com ordem embaralhada por jogador)
    // resetar ordem de respostas para esta pergunta e preparar estruturas
    playersAnswerOrder = [];
    playersButtons = [];
    playersLocalIndices = [];
    playersScoreBadges = [];

    // build player card elements first, then append in an order that
    // allows special placement when there are 5 players (center second row)
    const playerDivs = [];
    jogadores.forEach((jogador, pjIndex) => {
        const playerDiv = document.createElement("div");
        playerDiv.style.border = "1px solid #eee";
        playerDiv.style.padding = "8px";
        playerDiv.style.margin = "8px 0";
        playerDiv.className = "player-card";
        // deterministic position class to allow palette variations
        playerDiv.classList.add(`player-pos-${(pjIndex % 6) + 1}`);
        // apply explicit odd/even class so players 1,3,5 are cream and 2,4,6 are gray
        // Special case for 4 players: make players 1 & 4 the same color (gray)
        // and players 2 & 3 the beige (cream) to keep visual balance.
        const pos = pjIndex + 1;
        if (jogadores.length === 4) {
            if (pos === 1 || pos === 4) playerDiv.classList.add("player-even");
            else playerDiv.classList.add("player-odd");
        } else {
            if (pos % 2 === 0) playerDiv.classList.add("player-even");
            else playerDiv.classList.add("player-odd");
        }
        const titleWrap = document.createElement("div");
        titleWrap.style.display = "flex";
        titleWrap.style.alignItems = "center";
        const title = document.createElement("div");
        title.innerText = jogador.nome;
        title.style.fontWeight = "bold";
        titleWrap.appendChild(title);
        // badge de pontuação temporária ao lado do nome
        const scoreBadge = document.createElement("span");
        scoreBadge.className = "score-badge";
        scoreBadge.innerText = "";
        titleWrap.appendChild(scoreBadge);
        playersScoreBadges[pjIndex] = scoreBadge;
        playerDiv.appendChild(titleWrap);

        const buttonsWrap = document.createElement("div");
        buttonsWrap.className = "player-options";
        playersButtons[pjIndex] = [];
        // criar uma ordem embaralhada local para este jogador
        const localIndices = [0, 1, 2, 3];
        for (let i = localIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [localIndices[i], localIndices[j]] = [
                localIndices[j],
                localIndices[i],
            ];
        }
        playersLocalIndices[pjIndex] = localIndices;

        localIndices.forEach((origIndex) => {
            const opt = q.o[origIndex];
            const btn = document.createElement("button");
            btn.innerText = opt;
            btn.disabled = playersAnswers[pjIndex] !== null || showingFeedback;
            btn.onclick = () => {
                if (showingFeedback) return;
                playersAnswers[pjIndex] = origIndex;
                if (!playersAnswerOrder.includes(pjIndex))
                    playersAnswerOrder.push(pjIndex);
                Array.from(buttonsWrap.children).forEach((b) => {
                    b.disabled = true;
                    b.classList.remove("selected");
                });
                btn.classList.add("selected");
                accelerateTime(0.2);
                if (!playersAnswers.some((a) => a === null)) {
                    timerWasForced = true;
                    stopQuestionTimer();
                    gradeAndNext();
                    return;
                }
                checkAllAnswered();
            };
            buttonsWrap.appendChild(btn);
            playersButtons[pjIndex].push(btn);
        });
        playerDiv.appendChild(buttonsWrap);
        playerDivs[pjIndex] = playerDiv;
    });

    // append playerDivs in a layout that handles special cases for 5 and 6 players
    if (jogadores.length === 5) {
        // Row 1: three players across
        const row1 = document.createElement("div");
        row1.className = "players-row players-row-1";
        row1.style.display = "grid";
        row1.style.gridTemplateColumns = "repeat(3, 1fr)";
        row1.style.gap = "12px";
        row1.appendChild(playerDivs[0]);
        row1.appendChild(playerDivs[1]);
        row1.appendChild(playerDivs[2]);
        opcoesDiv.appendChild(row1);

        // Row 2: two players centered and close to the center
        const row2 = document.createElement("div");
        row2.className = "players-row players-row-2";
        row2.style.display = "flex";
        row2.style.justifyContent = "center";
        row2.style.gap = "14px";
        // make the bottom players slightly narrower so they cluster near center
        playerDivs[3].style.maxWidth = "320px";
        playerDivs[4].style.maxWidth = "320px";
        playerDivs[3].style.flex = "0 0 auto";
        playerDivs[4].style.flex = "0 0 auto";
        row2.appendChild(playerDivs[3]);
        row2.appendChild(playerDivs[4]);
        opcoesDiv.appendChild(row2);
    } else if (jogadores.length === 6) {
        // Ensure a strict 3x2 grid for six players
        const gridWrap = document.createElement("div");
        gridWrap.className = "players-row players-row-1";
        gridWrap.style.display = "grid";
        gridWrap.style.gridTemplateColumns = "repeat(3, 1fr)";
        gridWrap.style.gap = "12px";
        for (let i = 0; i < 6; i++) gridWrap.appendChild(playerDivs[i]);
        opcoesDiv.appendChild(gridWrap);
        // reduce font / spacing slightly to fit
        opcoesDiv.classList.add("compact-grid");
    } else {
        // default append in sequence
        for (let i = 0; i < playerDivs.length; i++)
            opcoesDiv.appendChild(playerDivs[i]);
        opcoesDiv.classList.add("players-grid");
        // timer UI (num jogadores * 10s)
    }

    const totalSeconds = jogadores.length * 10;
    // when not using the special 5/6 wrappers, ensure the grid columns are set
    if (!opcoesDiv.classList.contains("players-row-2")) {
        let cols = jogadores.length;
        if (jogadores.length <= 3) cols = jogadores.length;
        else if (jogadores.length === 4) cols = 2;
        else cols = 3; // for general 5 or 6 fallback
        opcoesDiv.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    }

    // Atualizar temporizador fixo inferior e barra de progresso
    const bottomTimer = document.getElementById("bottomTimer");
    if (bottomTimer) {
        bottomTimer.innerText = "Tempo restante: " + totalSeconds + "s";
        bottomTimer.style.display = "block"; // ensure visible when question starts
    }
    const bottomBarEl_start = document.getElementById("bottomBar");
    if (bottomBarEl_start) bottomBarEl_start.style.display = "block";
    const progressBar = document.getElementById("progressBar");
    if (progressBar) progressBar.style.width = "100%";

    // iniciar timer
    startQuestionTimer(totalSeconds, () => {
        // quando o timer acabar, mostrar feedback automaticamente
        gradeAndNext();
    });

    function checkAllAnswered() {
        // if any player hasn't answered, nothing to do
        if (playersAnswers.some((a) => a === null) || showingFeedback) return;
        // mark as forced and trigger immediate end
        timerWasForced = true;
        // stop timer and call grade/feedback imediatamente
        stopQuestionTimer();
        gradeAndNext();
    }
}

function startQuestionTimer(seconds, onEnd) {
    stopQuestionTimer();
    remainingTime = seconds;
    const bottomTimer = document.getElementById("bottomTimer");
    const progressBar = document.getElementById("progressBar");

    if (bottomTimer)
        bottomTimer.innerText =
            "Tempo restante: " + Math.ceil(remainingTime) + "s";

    // do NOT start a continuous suspense drone (user requested silence during answer time)

    // track the displayed whole seconds so we can pulse on change
    let prevDisplayed = Math.ceil(remainingTime);

    timerIntervalId = setInterval(() => {
        remainingTime -= 0.2;
        const displayed = Math.max(0, Math.ceil(remainingTime));
        if (bottomTimer)
            bottomTimer.innerText = "Tempo restante: " + displayed + "s";

        // pulse/tick once per displayed second when low time (<=10s)
        if (displayed !== prevDisplayed && displayed <= 10) {
            try {
                playTick();
            } catch (e) {}
        }
        prevDisplayed = displayed;

        // atualizar barra de progresso (largura proporcional)
        if (progressBar) {
            const pct = Math.max(0, Math.min(1, remainingTime / seconds));
            progressBar.style.width = (pct * 100).toFixed(2) + "%";
            // when low time, color progress bar red
            if (remainingTime <= 10) {
                progressBar.style.background =
                    "linear-gradient(90deg,#ff8a65,#e53935)";
            } else {
                progressBar.style.background =
                    "linear-gradient(90deg,var(--overlay-blue-start),var(--overlay-blue-end))";
            }
        }

        // no separate ticking interval — ticks are driven by displayed-second changes
        if (bottomTimer) {
            bottomTimer.style.color =
                remainingTime <= 10 ? "var(--delta-red)" : "var(--text-color)";
        }

        if (remainingTime <= 0) {
            stopQuestionTimer();
            // mostrar overlay SOMENTE se existir pelo menos um jogador que não respondeu
            const anyUnanswered = playersAnswers.some((a) => a === null);
            if (anyUnanswered) {
                showTimeUpOverlay(() => {
                    if (typeof onEnd === "function") onEnd();
                });
            } else {
                if (typeof onEnd === "function") onEnd();
            }
            timerWasForced = false;
        }
    }, 200);
}

function showTimeUpOverlay(cb) {
    const overlay = document.getElementById("timeUpOverlay");
    const card = document.getElementById("timeUpCard");
    if (!overlay || !card) {
        if (typeof cb === "function") cb();
        return;
    }
    // mark body as overlay-active to dim/blur background
    document.body.classList.add("overlay-active");
    overlay.style.display = "flex";
    // trigger animation
    setTimeout(() => {
        card.style.transform = "scale(1)";
        card.style.opacity = "1";
    }, 10);
    // play a buzzer-like short sound (like end-of-time in games)
    if (audioCtx) {
        const o1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        o1.type = "square";
        o1.frequency.value = 1200;
        g1.gain.value = 0.0001;
        o1.connect(g1);
        g1.connect(audioCtx.destination);
        const o2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        o2.type = "sine";
        o2.frequency.value = 400;
        g2.gain.value = 0.0001;
        o2.connect(g2);
        g2.connect(audioCtx.destination);
        o1.start();
        o2.start();
        g1.gain.linearRampToValueAtTime(0.213394, audioCtx.currentTime + 0.02);
        g2.gain.linearRampToValueAtTime(0.106697, audioCtx.currentTime + 0.02);
        g1.gain.linearRampToValueAtTime(0.000178, audioCtx.currentTime + 0.5);
        g2.gain.linearRampToValueAtTime(0.000178, audioCtx.currentTime + 0.45);
        setTimeout(() => {
            try {
                o1.stop();
                o2.stop();
                o1.disconnect();
                o2.disconnect();
                g1.disconnect();
                g2.disconnect();
            } catch (e) {}
        }, 600);
    }
    // keep overlay visible briefly then hide and call callback
    setTimeout(() => {
        card.style.transform = "scale(0.9)";
        card.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
            // remove body overlay-active state
            document.body.classList.remove("overlay-active");
            if (typeof cb === "function") cb();
        }, 260);
    }, 900);
}

function stopQuestionTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    stopTicking();
    stopSuspense();
}

// start a subtle suspense drone while the question timer runs
function startSuspense() {
    try {
        if (!audioCtx) return;
        if (suspenseOsc) return; // already running
        suspenseOsc = audioCtx.createOscillator();
        suspenseGain = audioCtx.createGain();
        suspenseOsc.type = "sawtooth";
        suspenseOsc.frequency.value = 110; // low drone
        suspenseGain.gain.value = 0.0001;
        suspenseOsc.connect(suspenseGain);
        suspenseGain.connect(audioCtx.destination);
        suspenseOsc.start();
        // ramp to a low audible level
        suspenseGain.gain.linearRampToValueAtTime(
            0.017783,
            audioCtx.currentTime + 0.2
        );
    } catch (e) {
        /* ignore audio errors */
    }
}

function stopSuspense() {
    try {
        if (!suspenseOsc || !suspenseGain) return;
        // ramp down then stop
        suspenseGain.gain.linearRampToValueAtTime(
            0.000178,
            audioCtx.currentTime + 0.12
        );
        setTimeout(() => {
            try {
                suspenseOsc.stop();
            } catch (e) {}
            try {
                suspenseOsc.disconnect();
            } catch (e) {}
            try {
                suspenseGain.disconnect();
            } catch (e) {}
            suspenseOsc = null;
            suspenseGain = null;
        }, 180);
    } catch (e) {
        suspenseOsc = null;
        suspenseGain = null;
    }
}

// play a single tick (visual pulse + short click) — called once per displayed second when <=10s
function playTick() {
    const bottomTimer = document.getElementById("bottomTimer");
    if (bottomTimer) {
        bottomTimer.style.transition = "transform 140ms ease";
        bottomTimer.style.transform = "scale(1.06)";
        setTimeout(() => {
            if (bottomTimer) bottomTimer.style.transform = "";
        }, 140);
    }
    if (!audioCtx) return;
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "square";
        o.frequency.value = 880;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.linearRampToValueAtTime(0.035566, audioCtx.currentTime + 0.01);
        g.gain.linearRampToValueAtTime(0.000178, audioCtx.currentTime + 0.12);
        setTimeout(() => {
            try {
                o.stop();
                o.disconnect();
                g.disconnect();
            } catch (e) {}
        }, 160);
    } catch (e) {}
}

// start ticking sound when time is low; also pulse the timer visually
function startTicking() {
    // no longer uses a separate fast interval; ticks are fired once-per-second
    // via the main countdown loop when the displayed second decreases.
}

function accelerateTime(fraction) {
    if (remainingTime <= 0) return;
    const old = remainingTime;
    remainingTime = Math.max(0, remainingTime * (1 - fraction));
    const delta = Math.max(0, Math.round((old - remainingTime) * 10) / 10);
    const bottomTimer = document.getElementById("bottomTimer");
    if (!bottomTimer) return;

    // gentle pulse on the bottom timer
    bottomTimer.style.transition = "transform 300ms ease";
    bottomTimer.style.transform = "scale(1.06)";
    setTimeout(() => (bottomTimer.style.transform = ""), 350);

    // create a new delta element attached to the document body (fixed position)
    const baseTopOffset = -33; // moved 5px closer as requested
    const step = 18;
    const maxStack = 6; // allow more stacked deltas

    const rect = bottomTimer.getBoundingClientRect();
    const deltaEl = document.createElement("div");
    deltaEl.className = "timer-delta global-delta";
    deltaEl.style.position = "fixed";
    // append first so we can measure width, then center above the timer and shift right
    document.body.appendChild(deltaEl);
    // measure width and center the delta above the timer, then move 15px to the right
    const deltaWidth = deltaEl.offsetWidth || 40;
    const centerLeft = rect.left + rect.width / 2 - deltaWidth / 2;
    const leftPos = Math.max(8, centerLeft + 60); // move 60px right (40 -> 60), min 8px from viewport
    deltaEl.style.left = leftPos + "px";
    // compute initial top positioned just above the timer (10px margin)
    const initialTop = rect.top - 10;
    deltaEl.style.top = initialTop + "px";
    // make delta text bold for emphasis
    deltaEl.style.fontWeight = "700";
    deltaEl.style.opacity = "0";
    deltaEl.style.zIndex = "10005";
    deltaEl.style.color = "var(--delta-red)";
    deltaEl.innerText =
        "-" + (typeof delta === "number" ? delta.toFixed(1) : delta) + "s";

    // find existing global deltas and push them upward to make room
    const existing = Array.from(document.querySelectorAll(".global-delta"));
    if (existing.length) {
        for (let i = 0; i < existing.length; i++) {
            const el = existing[i];
            const relIndex = existing.length - 1 - i; // 0 is newest
            const desiredStackPos = Math.min(maxStack - 1, relIndex + 1);
            const newTop = initialTop - desiredStackPos * step;
            el.style.transition = "top 220ms ease, transform 220ms ease";
            el.style.top = newTop + "px";
        }
    }

    // animate into view (CSS has initial translateY(40px))
    requestAnimationFrame(() => {
        deltaEl.style.transition =
            "opacity 600ms ease, transform 600ms ease, left 120ms ease";
        deltaEl.style.transform = "translateY(0px)";
        deltaEl.style.opacity = "1";
    });

    // fade out and remove
    deltaEl._fadeTimer = setTimeout(() => {
        deltaEl.style.transition = "opacity 1200ms ease, transform 1200ms ease";
        deltaEl.style.transform = "translateY(-25px)";
        deltaEl.style.opacity = "0";
        deltaEl._removeTimer = setTimeout(() => {
            try {
                deltaEl.remove();
            } catch (e) {}
        }, 1200);
    }, 900);

    // short feedback sound
    if (audioCtx) {
        try {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = "sine";
            o.frequency.value = 880;
            g.gain.value = 0.0001;
            o.connect(g);
            g.connect(audioCtx.destination);
            o.start();
            g.gain.linearRampToValueAtTime(
                0.035566,
                audioCtx.currentTime + 0.01
            );
            g.gain.linearRampToValueAtTime(
                0.000178,
                audioCtx.currentTime + 0.18
            );
            setTimeout(() => {
                try {
                    o.stop();
                    o.disconnect();
                    g.disconnect();
                } catch (e) {}
            }, 220);
        } catch (e) {}
    }
}

function stopTicking() {
    if (tickIntervalId) {
        clearInterval(tickIntervalId);
        tickIntervalId = null;
    }
}

function gradeAndNext() {
    const q = perguntasSelecionadas[perguntaAtual];
    const confirmBtn = document.getElementById("confirmBtn");
    // stop timer so sounds/end checks stop
    stopQuestionTimer();

    if (!showingFeedback) {
        // aplicar pontuação ponderada pela ordem de resposta
        // primeiro correto = 10 pontos, segundo = 9, terceiro = 8, etc. (mínimo 1)
        const correctOrdered = playersAnswerOrder.filter(
            (idx) => playersAnswers[idx] === q.c
        );
        for (let rank = 0; rank < correctOrdered.length; rank++) {
            const pIdx = correctOrdered[rank];
            const pts = Math.max(1, 10 - rank);
            jogadores[pIdx].pontos += pts;
        }

        // mostrar feedback: por jogador marcar vermelho/verde
        jogadores.forEach((j, idx) => {
            const ans = playersAnswers[idx];
            // se o jogador não respondeu (defensivo), pular
            if (ans === null || typeof ans === "undefined") return;
            // encontrar o botão exibido correspondente à resposta (mapping local)
            const localMap = playersLocalIndices[idx] || [];
            const displayedChosen = localMap.indexOf(ans);
            const displayedCorrect = localMap.indexOf(q.c);
            const chosenBtn =
                (playersButtons[idx] && playersButtons[idx][displayedChosen]) ||
                null;
            const correctBtn =
                (playersButtons[idx] &&
                    playersButtons[idx][displayedCorrect]) ||
                null;
            if (ans === q.c) {
                if (chosenBtn) chosenBtn.classList.add("correct");
            } else {
                if (chosenBtn) chosenBtn.classList.add("incorrect");
                // mark the correct option as a revealed hint (border-only) for this player
                if (correctBtn) correctBtn.classList.add("revealed-correct");
            }
        });

        // também destacar a opção correta para todos (caso alguém não tenha respondido)
        jogadores.forEach((_, idx) => {
            const localMap = playersLocalIndices[idx] || [];
            const displayedCorrect = localMap.indexOf(q.c);
            const correctBtn =
                playersButtons[idx] && playersButtons[idx][displayedCorrect];
            // add the revealed-correct class unless this particular button was already
            // marked as a true correct (player who selected it). This keeps actual
            // correct selections with full green background, while others get border-only.
            if (correctBtn && !correctBtn.classList.contains("correct")) {
                correctBtn.classList.add("revealed-correct");
            }
        });

        // exibir badges de pontuação ganhos (com animação)
        // construir mapa de pontos ganhos por jogador nesta pergunta
        const pointsMap = {};
        for (let rank = 0; rank < correctOrdered.length; rank++) {
            const pIdx = correctOrdered[rank];
            pointsMap[pIdx] = Math.max(1, 10 - rank);
        }

        // mostrar badge para cada jogador que ganhou pontos
        jogadores.forEach((pl, idx) => {
            const badge = playersScoreBadges[idx];
            if (!badge) return;
            const pts = pointsMap[idx] || 0;
            // always show +N (including +0) as green text
            badge.innerText = "+" + pts;
            // animate: add show class then remove after a delay; clear text after fade completes
            setTimeout(() => badge.classList.add("show"), 20);
            // remove the visible class to trigger fade-out
            setTimeout(() => {
                badge.classList.remove("show");
            }, 1600);
            // clear text after fade-out transition (~700ms) has finished
            setTimeout(() => {
                badge.innerText = "";
            }, 1600 + 760);
        });

        // passar para estado de feedback — mostrar botão Próxima pergunta
        showingFeedback = true;
        // hide bottom UI while showing feedback/results for this round
        const bottomBarEl_fb = document.getElementById("bottomBar");
        const bottomTimerEl_fb = document.getElementById("bottomTimer");
        if (bottomBarEl_fb) bottomBarEl_fb.style.display = "none";
        if (bottomTimerEl_fb) bottomTimerEl_fb.style.display = "none";
        // criar botão de avanço (Próxima pergunta ou Resultados finais)
        let nextBtn = document.getElementById("nextBtn");
        const isLast = perguntaAtual >= perguntasSelecionadas.length - 1;
        if (!nextBtn) {
            nextBtn = document.createElement("button");
            nextBtn.id = "nextBtn";
            nextBtn.className = "next-full";
            nextBtn.onclick = () => {
                // limpar e avançar
                showingFeedback = false;
                // resetizar barra e temporizador fixo inferior
                const progressBar = document.getElementById("progressBar");
                const bottomTimer = document.getElementById("bottomTimer");
                if (progressBar) progressBar.style.width = "100%";
                if (bottomTimer) bottomTimer.innerText = "";
                // if this was the last question, go directly to final results without next-overlay
                if (isLast) {
                    nextBtn.remove();
                    // directly finalize (which shows final overlay)
                    finalizar();
                    return;
                }
                // otherwise advance to next question with the next-overlay
                perguntaAtual++;
                playersAnswers = Array(jogadores.length).fill(null);
                playersButtons = [];
                playersLocalIndices = [];
                nextBtn.remove();
                showNextRoundOverlay(mostrarPergunta);
            };
            const opcoesDiv = document.getElementById("opcoes");
            opcoesDiv.appendChild(nextBtn);
        }
        // update label depending on whether this is the last question
        nextBtn.innerText = isLast ? "Resultados finais" : "Próxima pergunta";
        return;
    }

    // se já estávamos mostrando feedback, avançar
    showingFeedback = false;
    perguntaAtual++;
    if (perguntaAtual >= perguntasSelecionadas.length) {
        finalizar();
        return;
    }
    // reset respostas e botões
    playersAnswers = Array(jogadores.length).fill(null);
    playersButtons = [];
    // gerar a próxima pergunta
    mostrarPergunta();
}

function finalizar() {
    // declarar a variável aqui para que a função de animação esteja visível
    // mesmo que seja atribuída dentro do bloco try (evita ReferenceError)
    let runPodiumAnimations = null;
    document.getElementById("perguntaArea").classList.add("hidden");
    document.getElementById("podio").classList.remove("hidden");
    // hide bottom UI elements on final podium
    const bottomBarEl = document.getElementById("bottomBar");
    const bottomTimerEl = document.getElementById("bottomTimer");
    if (bottomBarEl) bottomBarEl.style.display = "none";
    if (bottomTimerEl) bottomTimerEl.style.display = "none";

    // restaurar título principal quando o jogo terminar
    const mainTitle = document.querySelector("h1");
    if (mainTitle) mainTitle.style.display = "block";

    const ranking = [...jogadores]
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 3);
    const podioDiv = document.getElementById("podioLista");
    // construir layout de pódio: 2 - 1 - 3 (1 em centro mais alto)
    const first = ranking[0] || { nome: "-", pontos: 0 };
    const second = ranking[1] || { nome: "-", pontos: 0 };
    const third = ranking[2] || { nome: "-", pontos: 0 };
    podioDiv.innerHTML = `
        <div class="podio-grid">
            <div class="place place2">
                <span class="name">${second.nome}</span>
                <div class="podio-shelf">
                    <div class="label">2º</div>
                    <div class="points">${second.pontos} pontos</div>
                </div>
            </div>
            <div class="place place1">
                <span class="name">${first.nome}</span>
                <div class="podio-shelf">
                    <div class="label">1º</div>
                    <div class="points">${first.pontos} pontos</div>
                </div>
            </div>
            <div class="place place3">
                <span class="name">${third.nome}</span>
                <div class="podio-shelf">
                    <div class="label">3º</div>
                    <div class="points">${third.pontos} pontos</div>
                </div>
            </div>
        </div>
    `;
    // Adjust podio shelf heights proportionally to the points so differences
    // are reflected visually. Heights are applied inline so they only affect
    // the final results screen.
    try {
        const shelf1 = podioDiv.querySelector(".place1 .podio-shelf");
        const shelf2 = podioDiv.querySelector(".place2 .podio-shelf");
        const shelf3 = podioDiv.querySelector(".place3 .podio-shelf");
        const s1 = Number(first.pontos) || 0;
        const s2 = Number(second.pontos) || 0;
        const s3 = Number(third.pontos) || 0;
        const scores = [s1, s2, s3];
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        // Visual height bounds in px (tweakable) — adjusted to match podio-grid 415px
        const maxH = 350;
        const minH = 149; // increased so 0-point shelves still show their text
        function computeH(s) {
            if (maxScore === minScore) return Math.round((maxH + minH) / 2);
            return Math.round(
                minH + ((s - minScore) / (maxScore - minScore)) * (maxH - minH)
            );
        }
        // Prepare elements for sequential animated reveal: third -> second -> first
        const name1 = podioDiv.querySelector(".place1 .name");
        const name2 = podioDiv.querySelector(".place2 .name");
        const name3 = podioDiv.querySelector(".place3 .name");
        const pts1 = podioDiv.querySelector(".place1 .points");
        const pts2 = podioDiv.querySelector(".place2 .points");
        const pts3 = podioDiv.querySelector(".place3 .points");

        const target1 = computeH(s1);
        const target2 = computeH(s2);
        const target3 = computeH(s3);

        // initialize to zero height and hide names until their animation completes
        [shelf1, shelf2, shelf3].forEach((sh) => {
            if (sh) {
                sh.style.height = "0px";
                sh.style.overflow = "hidden";
                sh.style.transition = "none";
            }
        });
        [name1, name2, name3].forEach((n) => {
            if (n) {
                n.style.opacity = "0";
                n.style.transition = "opacity 240ms ease";
            }
        });
        // set points to zero and ensure visible (also reset internal lastPts)
        if (pts1) {
            pts1.innerText = "0 pontos";
            pts1._lastPts = 0;
        }
        if (pts2) {
            pts2.innerText = "0 pontos";
            pts2._lastPts = 0;
        }
        if (pts3) {
            pts3.innerText = "0 pontos";
            pts3._lastPts = 0;
        }

        // animate a shelf's height and point count over duration (ms)
        function animateShelf(
            shelfEl,
            pointsEl,
            nameEl,
            targetPx,
            finalPoints,
            duration
        ) {
            return new Promise((resolve) => {
                if (!shelfEl) return resolve();
                const start = performance.now();
                // stronger ease-out: starts faster and decelerates more sharply
                const easeOut = (t) => 1 - Math.pow(1 - t, 6);
                // scheduling ticks using the shared playSelectionSound helper
                const TICK_SPACING_MS = 60; // spacing between fired ticks to avoid harsh overlap
                const MAX_SCHEDULED_TICKS = 300; // safety cap
                function step(now) {
                    const elapsed = now - start;
                    const t = Math.min(1, elapsed / duration);
                    const eased = easeOut(t);
                    const curH = Math.round(targetPx * eased);
                    shelfEl.style.height = curH + "px";
                    if (pointsEl) {
                        const curPts = Math.round(finalPoints * eased);
                        // play tick sound for each increment in displayed points
                        if (typeof pointsEl._lastPts === "undefined")
                            pointsEl._lastPts = 0;
                        const last = pointsEl._lastPts || 0;
                        if (curPts > last) {
                            // update text progressively and fire ticks for each increment
                            pointsEl.innerText = curPts + " pontos";
                            const count = Math.min(
                                curPts - last,
                                MAX_SCHEDULED_TICKS
                            );
                            for (let i = 0; i < count; i++) {
                                const delay = i * TICK_SPACING_MS;
                                setTimeout(() => playSelectionSound(), delay);
                            }
                            // if there were more increments than we scheduled, just jump to final silently
                            pointsEl._lastPts = curPts;
                        } else {
                            pointsEl.innerText = curPts + " pontos";
                        }
                    }
                    if (t < 1) requestAnimationFrame(step);
                    else {
                        // finalize exact values
                        shelfEl.style.height = targetPx + "px";
                        if (pointsEl)
                            pointsEl.innerText = finalPoints + " pontos";
                        // reveal name after the shelf is done
                        if (nameEl) nameEl.style.opacity = "1";
                        // small delay to let the name appear before resolving
                        setTimeout(resolve, 120);
                    }
                }
                requestAnimationFrame(step);
            });
        }

        // define the sequential runner but DO NOT start it here; it will be
        // invoked after the final overlay is dismissed.
        runPodiumAnimations = async function () {
            // mark that animations started so fallback won't re-run them
            podioAnimationsStarted = true;
            try {
                await animateShelf(shelf3, pts3, name3, target3, s3, 4000);
                await new Promise((r) => setTimeout(r, 1000));
                await animateShelf(shelf2, pts2, name2, target2, s2, 4000);
                await new Promise((r) => setTimeout(r, 1000));
                await animateShelf(shelf1, pts1, name1, target1, s1, 4000);
                // after all animations finished, play the congrats sound
                try {
                    playCongrats();
                } catch (e) {}
            } catch (err) {
                /* ignore animation errors */
            }
        };
    } catch (e) {
        /* ignore any podio sizing errors */
    }
    // show final overlay and after it is dismissed run the podium animations
    showFinalResultsOverlay(runPodiumAnimations);
    // Fallback: em alguns navegadores/ambientes o callback do overlay pode
    // não disparar (por exemplo, se houver erro silencioso). Agendamos um
    // fallback mais longo que só executa se as animações ainda não tiverem
    // começado, assim preservamos o overlay visível antes de iniciar.
    setTimeout(() => {
        try {
            if (
                !podioAnimationsStarted &&
                typeof runPodiumAnimations === "function"
            ) {
                runPodiumAnimations();
            }
        } catch (e) {
            /* ignore */
        }
    }, 2600);
}

// overlay helpers
function showOverlay(text, ms = 800, cb) {
    const overlay = document.getElementById("bigOverlay");
    const title = document.getElementById("bigOverlayTitle");
    const hint = document.getElementById("bigOverlayHint");
    title.innerText = text;
    // clear hint for generic overlays
    if (hint) hint.innerText = "";
    // hide bottom UI while overlay is visible (round results / messages)
    const bottomBarEl = document.getElementById("bottomBar");
    const bottomTimerEl = document.getElementById("bottomTimer");
    const prevBottomBarDisplay = bottomBarEl ? bottomBarEl.style.display : null;
    const prevBottomTimerDisplay = bottomTimerEl
        ? bottomTimerEl.style.display
        : null;
    if (bottomBarEl) bottomBarEl.style.display = "none";
    if (bottomTimerEl) bottomTimerEl.style.display = "none";

    // mark body as overlay-active to dim/blur background
    document.body.classList.add("overlay-active");
    overlay.style.display = "flex";
    const card = document.getElementById("bigOverlayCard");
    setTimeout(() => {
        card.style.transform = "scale(1)";
        card.style.opacity = "1";
    }, 10);
    setTimeout(() => {
        card.style.transform = "scale(0.95)";
        card.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
            // remove overlay-active and restore bottom UI to previous state unless final podium
            document.body.classList.remove("overlay-active");
            if (bottomBarEl)
                bottomBarEl.style.display = prevBottomBarDisplay || "block";
            if (bottomTimerEl)
                bottomTimerEl.style.display = prevBottomTimerDisplay || "block";
            if (cb) cb();
        }, 220);
    }, ms);
}

function showNextRoundOverlay(cb) {
    showOverlay("Próxima pergunta", 700, cb);
}

function playFinalDrum() {
    if (!audioCtx) return;
    stopFinalDrum();
    finalDrumInterval = setInterval(() => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "sawtooth";
        o.frequency.value = 120;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        g.gain.linearRampToValueAtTime(0.106697, audioCtx.currentTime + 0.02);
        g.gain.linearRampToValueAtTime(0.000178, audioCtx.currentTime + 0.28);
        setTimeout(() => {
            try {
                o.stop();
                o.disconnect();
                g.disconnect();
            } catch (e) {}
        }, 350);
    }, 420);
}

// Final overlay audio loop (HTMLAudioElement)
function ensureFinalLoopElement() {
    if (!finalLoopAudioEl)
        finalLoopAudioEl = document.getElementById("finalLoopAudio");
    return finalLoopAudioEl;
}

function playFinalLoop() {
    const el = ensureFinalLoopElement();
    if (!el) return;
    try {
        el.volume = 0.6;
        el.loop = true;
        const p = el.play();
        if (p && p.catch)
            p.catch((e) => {
                // playback may be blocked until a user gesture; warn silently
                console.warn("finalLoop play blocked:", e);
            });
    } catch (e) {
        console.warn("playFinalLoop error", e);
    }
}

function stopFinalLoop() {
    // stop buffer-based source if present
    try {
        // if using scheduler, stop scheduled timers and sources
        if (finalLoopScheduler) {
            finalLoopScheduler.stopped = true;
            if (finalLoopScheduler.timerId) {
                try {
                    clearTimeout(finalLoopScheduler.timerId);
                } catch (e) {}
                finalLoopScheduler.timerId = null;
            }
            try {
                if (
                    finalLoopScheduler.current &&
                    finalLoopScheduler.current.src
                ) {
                    finalLoopScheduler.current.src.stop();
                    finalLoopScheduler.current.src.disconnect();
                }
            } catch (e) {}
            try {
                if (finalLoopScheduler.next && finalLoopScheduler.next.src) {
                    finalLoopScheduler.next.src.stop();
                    finalLoopScheduler.next.src.disconnect();
                }
            } catch (e) {}
            finalLoopScheduler = null;
        }
        if (finalLoopSource) {
            try {
                finalLoopSource.stop();
            } catch (e) {}
            try {
                finalLoopSource.disconnect();
            } catch (e) {}
            finalLoopSource = null;
        }
        if (finalLoopGainNode) {
            try {
                finalLoopGainNode.disconnect();
            } catch (e) {}
            finalLoopGainNode = null;
        }
    } catch (e) {}
    // fallback to HTMLAudioElement if buffer not used
    const el = ensureFinalLoopElement();
    if (el) {
        try {
            el.pause();
            el.currentTime = 0;
        } catch (e) {}
    }
}

// Play the final loop using AudioBufferSourceNode with loop=true for gapless looping.
async function playFinalLoopBuffered(path = "assets/final_loop.mp3") {
    // Use crossfade-scheduled buffer playback for robust gapless looping.
    try {
        if (!audioCtx)
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === "suspended") {
            try {
                await audioCtx.resume();
            } catch (e) {
                /* ignore */
            }
        }
        stopFinalLoop();
        const resp = await fetch(path, { cache: "no-cache" });
        const ab = await resp.arrayBuffer();
        const buf = await audioCtx.decodeAudioData(ab);

        const trim =
            typeof detectTrimPoints === "function"
                ? detectTrimPoints(buf, 0.001, 0.02)
                : null;
        const loopStart = trim && trim.start ? trim.start : 0;
        const loopEnd = trim && trim.end ? trim.end : buf.duration;
        const loopDur = Math.max(0.05, loopEnd - loopStart);
        // increase crossfade per user request to 1000ms (1s), but cap at half the loop duration
        const desiredFade = 1.0; // seconds
        const fadeSec = Math.min(desiredFade, Math.max(0.02, loopDur * 0.5));

        finalLoopScheduler = {
            buffer: buf,
            loopStart,
            loopEnd,
            loopDur,
            fadeSec,
            current: null,
            next: null,
            timerId: null,
            stopped: false,
        };

        // helper to create source+gain and start at scheduled time
        function startSrc(startAt, offset, duration, initialGain = 1) {
            const s = audioCtx.createBufferSource();
            const g = audioCtx.createGain();
            s.buffer = buf;
            s.connect(g);
            g.connect(audioCtx.destination);
            g.gain.setValueAtTime(initialGain, startAt);
            s.start(startAt, offset, duration);
            return { src: s, gain: g };
        }

        const now = audioCtx.currentTime + 0.04;
        const firstStart = now;
        const secondStart = firstStart + loopDur - fadeSec;

        const first = startSrc(
            firstStart,
            loopStart,
            loopDur + fadeSec,
            1.778279
        );
        const second = startSrc(secondStart, loopStart, loopDur + fadeSec, 0);
        // crossfade
        second.gain.linearRampToValueAtTime(1.778279, secondStart + fadeSec);
        first.gain.linearRampToValueAtTime(0, secondStart + fadeSec);

        finalLoopScheduler.current = first;
        finalLoopScheduler.next = {
            src: second.src,
            gain: second.gain,
            start: secondStart,
        };

        // schedule recursive swapping
        function schedule(nextStart) {
            const ms = Math.max(
                0,
                (nextStart - audioCtx.currentTime) * 1000 - 20
            );
            finalLoopScheduler.timerId = setTimeout(() => {
                if (finalLoopScheduler.stopped) return;
                const upcomingStart = nextStart + loopDur - fadeSec;
                const upcoming = startSrc(
                    upcomingStart,
                    loopStart,
                    loopDur + fadeSec,
                    0
                );
                // crossfade upcoming with existing next
                upcoming.gain.linearRampToValueAtTime(
                    1.778279,
                    upcomingStart + fadeSec
                );
                if (finalLoopScheduler.next && finalLoopScheduler.next.gain)
                    finalLoopScheduler.next.gain.linearRampToValueAtTime(
                        0,
                        upcomingStart + fadeSec
                    );

                // stop old current after crossfade
                const stopMs = Math.max(
                    0,
                    (upcomingStart + fadeSec + 0.05 - audioCtx.currentTime) *
                        1000
                );
                setTimeout(() => {
                    try {
                        if (
                            finalLoopScheduler.current &&
                            finalLoopScheduler.current.src
                        ) {
                            finalLoopScheduler.current.src.stop();
                            finalLoopScheduler.current.src.disconnect();
                        }
                    } catch (e) {}
                }, stopMs);

                finalLoopScheduler.current = finalLoopScheduler.next;
                finalLoopScheduler.next = {
                    src: upcoming.src,
                    gain: upcoming.gain,
                    start: upcomingStart,
                };
                schedule(upcomingStart);
            }, ms);
        }

        schedule(secondStart);
        finalLoopSource = finalLoopScheduler.current
            ? finalLoopScheduler.current.src
            : null;
        finalLoopGainNode = finalLoopScheduler.current
            ? finalLoopScheduler.current.gain
            : null;
    } catch (e) {
        console.warn(
            "playFinalLoopBuffered failed, falling back to <audio> element",
            e
        );
        playFinalLoop();
    }
}

// Detect approximate non-silent region inside an AudioBuffer.
// Returns { start: seconds, end: seconds } or null if detection failed.
function detectTrimPoints(audioBuffer, threshold = 0.001, minWindow = 0.02) {
    try {
        const sampleRate = audioBuffer.sampleRate;
        const len = audioBuffer.length;
        const channels = audioBuffer.numberOfChannels;
        const absSamples = new Float32Array(len);
        for (let ch = 0; ch < channels; ch++) {
            const data = audioBuffer.getChannelData(ch);
            for (let i = 0; i < len; i++) {
                const v = Math.abs(data[i]);
                if (v > absSamples[i]) absSamples[i] = v;
            }
        }
        let first = 0;
        while (first < len && absSamples[first] <= threshold) first++;
        let last = len - 1;
        while (last > 0 && absSamples[last] <= threshold) last--;
        const minSamples = Math.floor(minWindow * sampleRate);
        if (last - first < minSamples)
            return { start: 0, end: audioBuffer.duration };
        const startSec = Math.max(0, first / sampleRate + 0.0005);
        const endSec = Math.min(
            audioBuffer.duration,
            (last + 1) / sampleRate - 0.0005
        );
        if (endSec <= startSec) return { start: 0, end: audioBuffer.duration };
        return { start: startSec, end: endSec };
    } catch (e) {
        return null;
    }
}

function stopFinalDrum() {
    if (finalDrumInterval) {
        clearInterval(finalDrumInterval);
        finalDrumInterval = null;
    }
}

function showFinalResultsOverlay(cb) {
    const overlay = document.getElementById("bigOverlay");
    const card = document.getElementById("bigOverlayCard");
    const container = document.querySelector(".container");
    // set message and ensure overlay fully hides background
    const title = document.getElementById("bigOverlayTitle");
    const hint = document.getElementById("bigOverlayHint");
    if (title) title.innerText = "Resultados finais";
    if (hint) {
        // keep hint empty for consistency with other overlays
        hint.innerText = "";
        hint.style.position = "static";
        hint.style.left = "";
        hint.style.right = "";
        hint.style.bottom = "";
        hint.style.textAlign = "";
        hint.style.color = "";
        hint.style.pointerEvents = "none";
    }
    // mark the body so the container blurs/dims while final overlay is visible
    document.body.classList.add("overlay-active");
    // also expand the body vertically so the podium appears lower on the page
    document.body.classList.add("final-results-expanded");
    overlay.classList.add("show");
    overlay.style.background = "rgba(255,255,255,0.9)";
    overlay.style.display = "flex";
    // ensure card text is visible on the lightened backdrop
    if (card) card.style.color = "#000";
    setTimeout(() => {
        card.style.transform = "scale(1)";
        card.style.opacity = "1";
    }, 10);
    // behave like other overlays: show briefly, then hide and call callback
    const hideMs = 1600;
    setTimeout(() => {
        // animate card out then hide overlay
        if (card) {
            card.style.transform = "scale(0.95)";
            card.style.opacity = "0";
        }
        overlay.classList.add("fade-out");
        document.body.classList.remove("overlay-active");
        // remove the expanded final-results spacing
        document.body.classList.remove("final-results-expanded");
        setTimeout(() => {
            overlay.classList.remove("show");
            overlay.classList.remove("fade-out");
            overlay.style.display = "none";
            if (container) container.style.visibility = "";
            // do NOT play congrats here; congrats will be played after
            // the podium animations finish (to avoid sound at animation start)
            if (cb) cb();
        }, 420);
    }, hideMs);
}

// Inicialização: conectar botões que estão no HTML puro (sem atributos onclick)
document.addEventListener("DOMContentLoaded", () => {
    // ensure keyboard activation for the player-count buttons
    const countBtns = Array.from(
        document.querySelectorAll(".player-count-btn")
    );
    countBtns.forEach((btn) => {
        btn.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                configurarJogadores(Number(btn.dataset.count) || 0);
            }
        });
    });
    // legacy: if a numeric input exists, allow Enter to trigger old flow
    const numInp = document.getElementById("numJogadores");
    if (numInp) {
        numInp.addEventListener("keydown", (e) => {
            if (e.key === "Enter") configurarJogadores();
        });
    }
});
