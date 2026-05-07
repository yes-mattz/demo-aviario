// =========================================================
// MODO SIMULAÇÃO (mock.js) - ARQUITETURA MULTIZONA
// NÃO GRAVAR NO ESP32
// =========================================================

let mockData = {
    zonas: [
        { temp: 24.5, setpoint: 28.0, histerese: 1.0, ativo: true, releEstado: false },
        { temp: 26.2, setpoint: 28.0, histerese: 1.0, ativo: true, releEstado: false },
        { temp: 29.1, setpoint: 28.0, histerese: 1.0, ativo: true, releEstado: true },
        { temp: 27.8, setpoint: 28.0, histerese: 1.0, ativo: true, releEstado: false }
    ],
    umidade: 65.0,
    sdOk: true,
    uptime: 0
};

let uiInitialized = false;

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.className = "show";
    setTimeout(() => { t.className = t.className.replace("show", ""); }, 3000);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// Constrói os 4 Cards no DOM
function buildUI() {
    const container = document.getElementById('zones-container');
    container.innerHTML = '';
    
    for (let i = 0; i < 4; i++) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="zone-title">Zona ${i + 1}</div>
                <div class="temp-value" id="temp-${i}">-- °C</div>
            </div>
            <div class="control-group">
                <label>Modo de Operação</label>
                <select id="mode-${i}" onchange="applyControl(${i})">
                    <option value="auto">Automático (Exaustão)</option>
                    <option value="manual">Manual (Direto)</option>
                </select>
            </div>
            <div class="row">
                <div class="control-group" style="flex: 1;">
                    <label>Setpoint (°C)</label>
                    <input type="number" id="setpoint-${i}" step="0.5" onchange="applyControl(${i})">
                </div>
                <div class="control-group" style="flex: 1;">
                    <label>Histerese (°C)</label>
                    <input type="number" id="hist-${i}" step="0.1" onchange="applyControl(${i})">
                </div>
            </div>
            <div class="switch-container">
                <label style="margin:0; font-weight: bold;">Acionamento Relé ${i + 1}</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="relay-${i}" onchange="applyControl(${i})">
                    <span class="slider"></span>
                </label>
            </div>
            <button style="margin-top: 15px; width: 100%; background: #6c757d; color: white;" 
                    onclick="window.location.href='detalhes.html?zona=${i}'">
                Gráfico e Detalhes
            </button>
        `;
        container.appendChild(card);
    }
    uiInitialized = true;
}

function updateUIState(idx, isAuto) {
    const setpoint = document.getElementById(`setpoint-${idx}`);
    const hist = document.getElementById(`hist-${idx}`);
    const relay = document.getElementById(`relay-${idx}`);

    if (isAuto) {
        setpoint.disabled = false; hist.disabled = false; relay.disabled = true;
    } else {
        setpoint.disabled = true; hist.disabled = true; relay.disabled = false;
    }
}

// Sinalizador Visual de Teste Local
document.getElementById('net-status').innerText = "Simulação Local";
document.getElementById('net-status').style.color = "#ffc107";
document.getElementById('net-dot').style.background = "#ffc107";
document.getElementById('net-dot').style.boxShadow = "none";

// Motor Físico Multizona (Polling Simulado)
setInterval(() => {
    if (!uiInitialized) buildUI();

    mockData.uptime += 2;
    mockData.umidade += (Math.random() * 2 - 1); 

    // Atualiza Informações Globais
    document.getElementById('global-hum').innerText = `${mockData.umidade.toFixed(1)}%`;
    document.getElementById('sd-status').innerText = mockData.sdOk ? "OK" : "FALHA";
    document.getElementById('sd-status').style.color = "var(--success)";
    document.getElementById('uptime').innerText = formatTime(mockData.uptime);

    // Processa Física e Termostato de cada Zona
    mockData.zonas.forEach((zona, i) => {
        // Dinâmica de Arrefecimento
        if (zona.releEstado) zona.temp -= (Math.random() * 0.4 + 0.1); 
        else zona.temp += (Math.random() * 0.4 + 0.1);

        // Termostato Automático com Histerese Superior/Inferior
        if (zona.ativo) {
            const inf = zona.setpoint - zona.histerese;
            const sup = zona.setpoint + zona.histerese;
            if (!zona.releEstado && zona.temp >= sup) zona.releEstado = true;
            else if (zona.releEstado && zona.temp <= inf) zona.releEstado = false;
        }

        // Renderiza na Tela
        document.getElementById(`temp-${i}`).innerText = `${zona.temp.toFixed(1)} °C`;
        
        if(document.activeElement !== document.getElementById(`mode-${i}`)) 
            document.getElementById(`mode-${i}`).value = zona.ativo ? "auto" : "manual";
        if(document.activeElement !== document.getElementById(`setpoint-${i}`)) 
            document.getElementById(`setpoint-${i}`).value = zona.setpoint.toFixed(1);
        if(document.activeElement !== document.getElementById(`hist-${i}`)) 
            document.getElementById(`hist-${i}`).value = zona.histerese.toFixed(1);
        
        const relayElement = document.getElementById(`relay-${i}`);
        if(document.activeElement !== relayElement) 
            relayElement.checked = zona.releEstado;

        updateUIState(i, zona.ativo);
    });
}, 2000);

// Interceptador de Comandos (Substitui o POST para o ESP32)
function applyControl(idx) {
    const isAuto = document.getElementById(`mode-${idx}`).value === 'auto';
    updateUIState(idx, isAuto);

    // Atualiza a memória local da simulação
    mockData.zonas[idx].ativo = isAuto;
    mockData.zonas[idx].setpoint = parseFloat(document.getElementById(`setpoint-${idx}`).value);
    mockData.zonas[idx].histerese = parseFloat(document.getElementById(`hist-${idx}`).value);
    
    if (!isAuto) {
        mockData.zonas[idx].releEstado = document.getElementById(`relay-${idx}`).checked;
    }

    showToast(`Simulação: Parâmetros da Zona ${idx + 1} salvos`);
}