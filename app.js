// ===== DADOS DO EXTRATO (multi-mes) =====
const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const extratos = {
    '2025-02': {
        saldoAnterior: 5081.08,
        lancamentos: [
            { dia: 3, historico: 'Reajuste Monetario - BACEN', valor: 0.12 },
            { dia: 3, historico: 'Juros', valor: 0.33 },
            { dia: 4, historico: 'Pagamento Conta De Agua', valor: -672.81 },
            { dia: 4, historico: 'Pix - Recebido 04/02 22:07 03502352445', detalhe: 'DENIS ULISSE N', valor: 312.00 },
            { dia: 12, historico: 'Pix - Recebido 12/02 14:25 00003502352445', detalhe: 'DENIS ULISS', valor: 727.00 }
        ]
    }
};

let extratoMes = 1; // 0=Jan, 1=Fev
let extratoAno = 2025;

// ===== IMOVEIS (para alertas) =====
const imoveis = [
    { casa: '15', inquilino: 'Luis Felipe da Silva Medeiros', dia: 14, valor: 630, emAtraso: false },
    { casa: '16', inquilino: 'Pedro Elandro Holanda Granjeiro', dia: 10, valor: 720, emAtraso: true },
    { casa: '16A', inquilino: 'Humberto de Oliveira Nunes', dia: 5, valor: 306, emAtraso: false }
];

// ===== DARK MODE =====
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('themeToggle');
    const isDark = document.body.classList.contains('dark');
    btn.innerHTML = isDark ? '&#9788; Modo Claro' : '&#9790; Modo Escuro';
}

function loadTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark');
    }
    updateThemeButton();
}

// ===== CPF MASK =====
function toggleCPF(el) {
    const visible = el.dataset.visible === 'true';
    if (visible) {
        const cpf = el.dataset.cpf;
        el.textContent = cpf.substring(0, 3) + '.***.***-' + cpf.slice(-2);
        el.dataset.visible = 'false';
        el.classList.remove('revealed');
        el.title = 'Clique para revelar';
    } else {
        el.textContent = el.dataset.cpf;
        el.dataset.visible = 'true';
        el.classList.add('revealed');
        el.title = 'Clique para ocultar';
    }
}

// ===== BARRAS DE CONTRATO =====
function calcBarra(inicioStr, fimStr, barraId, diasId) {
    const parse = s => { const p = s.split('/'); return new Date(p[2], p[1]-1, p[0]); };
    const inicio = parse(inicioStr);
    const fim = parse(fimStr);
    const hoje = new Date();
    const total = fim - inicio;
    const elapsed = Math.max(0, Math.min(hoje - inicio, total));
    const pct = total > 0 ? (elapsed / total * 100) : 0;
    const restante = Math.max(0, Math.ceil((fim - hoje) / (1000*60*60*24)));

    const barra = document.getElementById(barraId);
    const dias = document.getElementById(diasId);
    if (barra) barra.style.width = pct.toFixed(1) + '%';
    if (dias) {
        if (restante === 0) {
            dias.textContent = 'Encerrado';
            dias.style.color = '#c0392b';
        } else {
            dias.textContent = restante + ' dias restantes';
            dias.style.color = restante < 90 ? '#c0392b' : restante < 180 ? '#e67e22' : '#7f8c8d';
            dias.style.fontWeight = restante < 90 ? '700' : '500';
        }
    }
}

// ===== ALERTAS DE VENCIMENTO =====
function renderAlertas() {
    const container = document.getElementById('alertasVencimento');
    const alertas = [];

    imoveis.forEach(im => {
        if (!im.emAtraso) return;
        alertas.push({
            urgente: true,
            texto: `<strong>Casa ${im.casa}</strong> - Aluguel de <strong>R$ ${im.valor.toFixed(2).replace('.',',')}</strong> com pagamento <strong>em atraso</strong> (vencimento dia ${im.dia}) - ${im.inquilino}`
        });
    });

    container.innerHTML = alertas.map(a => `
        <div class="alerta alerta-urgente">
            <span class="alerta-icon">&#9888;</span>
            <span class="alerta-text">${a.texto}</span>
        </div>
    `).join('');
}

// ===== CONTAGEM REGRESSIVA DESCONTO =====
function renderDescontoCountdown() {
    const el = document.getElementById('descontoCountdown');
    const fimDesconto = new Date(2026, 5, 30); // 30/06/2026
    const hoje = new Date();
    const diff = fimDesconto - hoje;
    const diasRestantes = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    if (diasRestantes <= 0) {
        el.innerHTML = '<span style="color:var(--red);font-weight:600">Periodo de desconto encerrado.</span>';
        return;
    }

    const meses = Math.floor(diasRestantes / 30);
    const dias = diasRestantes % 30;

    el.innerHTML = `
        <span class="countdown-number">${diasRestantes}</span>
        <div class="countdown-label">
            <strong>dias restantes de desconto</strong>
            (${meses} mes${meses !== 1 ? 'es' : ''} e ${dias} dia${dias !== 1 ? 's' : ''}) - Expira em 30/06/2026
        </div>
    `;
}

// ===== EXTRATO MULTI-MES =====
function fmt(v) {
    return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getExtratoKey() {
    return extratoAno + '-' + String(extratoMes + 1).padStart(2, '0');
}

function changeExtrato(delta) {
    extratoMes += delta;
    if (extratoMes > 11) { extratoMes = 0; extratoAno++; }
    if (extratoMes < 0) { extratoMes = 11; extratoAno--; }
    renderExtrato();
}

function renderExtrato() {
    const key = getExtratoKey();
    const label = document.getElementById('extratoMesLabel');
    label.textContent = MESES[extratoMes] + '/' + extratoAno;

    const ext = extratos[key];
    const body = document.getElementById('extratoBody');
    const saldoAnt = document.getElementById('extSaldoAnt');
    const disponivel = document.getElementById('extDisponivel');

    if (!ext) {
        saldoAnt.textContent = '-';
        disponivel.textContent = '-';
        body.innerHTML = '<tr><td colspan="3" class="extrato-empty">Nenhum lancamento registrado para este mes.</td></tr>';
        return;
    }

    saldoAnt.textContent = 'R$ ' + fmt(ext.saldoAnterior);

    let total = ext.saldoAnterior;
    body.innerHTML = ext.lancamentos.map(l => {
        total += l.valor;
        const color = l.valor >= 0 ? 'valor-positivo' : 'valor-negativo';
        const prefix = l.valor < 0 ? '- ' : '';
        const detalhe = l.detalhe ? `<br><small class="text-muted">${l.detalhe}</small>` : '';
        return `<tr>
            <td class="text-center">${String(l.dia).padStart(2, '0')}</td>
            <td>${l.historico}${detalhe}</td>
            <td class="text-right ${color}">${prefix}${fmt(Math.abs(l.valor))}</td>
        </tr>`;
    }).join('');

    disponivel.textContent = 'R$ ' + fmt(total);
}

// ===== DATA ULTIMA ATUALIZACAO =====
function renderLastUpdate() {
    const el = document.getElementById('lastUpdate');
    // Data do ultimo deploy/atualizacao
    const updateDate = new Date('2026-02-16T12:00:00');
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    el.textContent = updateDate.toLocaleDateString('pt-BR', options);
}

// ===== INIT =====
loadTheme();
calcBarra('13/11/2025', '13/11/2026', 'barra-15', 'dias-15');
calcBarra('04/04/2023', '04/04/2026', 'barra-16', 'dias-16');
calcBarra('30/06/2025', '30/06/2027', 'barra-16a', 'dias-16a');
renderAlertas();
renderDescontoCountdown();
renderExtrato();
renderLastUpdate();
