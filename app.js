// ===== CONFIG =====
const SPREADSHEET_ID = '14JDU49MVYXus9zmrwNWj_YZ2Ze0LjLAkq_GUBC7V168';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;

const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ===== DADOS FALLBACK (caso a planilha nao carregue) =====
const FALLBACK_IMOVEIS = [
    { casa: '15', valor: 630, dia: 14, inquilino: 'Luis Felipe da Silva Medeiros', cpf: '134.162.744-66', inicio: '13/11/2025', fim: '13/11/2026', finalidade: 'Residencial', status: 'Em dia', observacao: '' },
    { casa: '16', valor: 720, dia: 10, inquilino: 'Pedro Elandro Holanda Granjeiro', cpf: '104.295.114-42', inicio: '04/04/2023', fim: '04/04/2026', finalidade: 'Comercial', status: 'Em atraso', observacao: '' },
    { casa: '16A', valor: 306, dia: 5, inquilino: 'Humberto de Oliveira Nunes', cpf: '653.396.814-91', inicio: '30/06/2025', fim: '30/06/2027', finalidade: 'Residencial', status: 'Com desconto', observacao: '' }
];

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

let extratoMes = 1;
let extratoAno = 2025;
let imoveisData = [];

// ===== CSV PARSER =====
function parseCSV(text) {
    const rows = [];
    let current = '';
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(current.trim());
                current = '';
            } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
                row.push(current.trim());
                current = '';
                if (ch === '\r') i++;
                rows.push(row);
                row = [];
            } else {
                current += ch;
            }
        }
    }
    if (current || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
    }
    return rows;
}

function parseValor(str) {
    if (!str) return 0;
    return parseFloat(str.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
}

function parseImoveis(rows) {
    const imoveis = [];
    // Pula header (row 0), observacao esta na row 0 col 9+
    const obsGeral = (rows[0] && rows[0][9]) ? rows[0][9] : '';

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0] || r[0].toLowerCase() === 'total' || r[0] === '') continue;

        const casa = r[0].trim();
        const valor = parseValor(r[1]);
        const dia = parseInt(r[2]) || 0;
        let inquilino = (r[3] || '').trim();
        const cpf = (r[4] || '').trim();
        const inicio = (r[5] || '').trim();
        const fim = (r[6] || '').trim();
        const finalidade = (r[7] || '').trim();
        const status = (r[8] || '').trim();
        const observacao = (r[9] || '').trim();

        // Remove * do nome do inquilino (indicador de observacao)
        const temNota = inquilino.endsWith('*');
        if (temNota) inquilino = inquilino.slice(0, -1).trim();

        imoveis.push({ casa, valor, dia, inquilino, cpf, inicio, fim, finalidade, status, observacao, temNota, obsGeral });
    }
    return imoveis;
}

// ===== FETCH PLANILHA =====
async function fetchPlanilha() {
    const loading = document.getElementById('loadingOverlay');
    try {
        if (loading) loading.style.display = 'flex';

        const resp = await fetch(CSV_URL);
        if (!resp.ok) throw new Error('Erro ao buscar planilha');

        const text = await resp.text();
        const rows = parseCSV(text);
        imoveisData = parseImoveis(rows);

        if (imoveisData.length === 0) throw new Error('Planilha vazia');

        renderAll();
        showDataSource(true);
    } catch (err) {
        console.warn('Erro ao carregar planilha, usando dados locais:', err);
        imoveisData = FALLBACK_IMOVEIS;
        renderAll();
        showDataSource(false);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function showDataSource(online) {
    const el = document.getElementById('dataSource');
    if (!el) return;
    if (online) {
        el.innerHTML = '<span class="source-dot source-online"></span> Dados carregados da planilha Google Sheets';
        el.className = 'data-source data-source-online';
    } else {
        el.innerHTML = '<span class="source-dot source-offline"></span> Usando dados locais (planilha indisponivel)';
        el.className = 'data-source data-source-offline';
    }
}

// ===== RENDER ALL =====
function renderAll() {
    renderSummary();
    renderMainTable();
    renderObservacoes();
    renderContratos();
    renderAlertas();
    renderDescontoCountdown();
    renderExtrato();
    renderLastUpdate();
}

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
    if (saved === 'dark') document.body.classList.add('dark');
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

function cpfMasked(cpf) {
    if (!cpf || cpf.length < 5) return cpf;
    return cpf.substring(0, 3) + '.***.***-' + cpf.slice(-2);
}

// ===== SUMMARY =====
function renderSummary() {
    const totalReceita = imoveisData.reduce((s, im) => s + im.valor, 0);
    const totalImoveis = imoveisData.length;
    const totalAtraso = imoveisData.filter(im => isAtrasado(im)).length;

    document.getElementById('summaryReceita').textContent = 'R$ ' + fmt(totalReceita);
    document.getElementById('summaryImoveis').textContent = totalImoveis;
    document.getElementById('summaryAtraso').textContent = totalAtraso;
}

function isAtrasado(im) {
    return im.status && im.status.toLowerCase().includes('atraso');
}

function isDesconto(im) {
    return im.status && im.status.toLowerCase().includes('desconto');
}

// ===== MAIN TABLE =====
function renderMainTable() {
    const tbody = document.getElementById('mainTableBody');
    const tfoot = document.getElementById('mainTableFoot');
    const total = imoveisData.reduce((s, im) => s + im.valor, 0);

    tbody.innerHTML = imoveisData.map(im => {
        const rowClass = isAtrasado(im) ? 'row-atrasado' : '';
        const notaRef = im.temNota ? ' <span class="nota-ref">*</span>' : '';
        let statusBadge = '<span class="badge badge-ok">Em dia</span>';
        if (isAtrasado(im)) statusBadge = '<span class="badge badge-atrasado">Em atraso</span>';
        else if (isDesconto(im)) statusBadge = '<span class="badge badge-desconto">Com desconto</span>';

        const finalBadge = im.finalidade.toLowerCase() === 'comercial'
            ? '<span class="badge badge-comercial">Comercial</span>'
            : '<span class="badge badge-residencial">Residencial</span>';

        return `<tr class="${rowClass}">
            <td class="cell-casa"><strong>${im.casa}</strong></td>
            <td class="cell-valor">R$ ${fmt(im.valor)}</td>
            <td class="text-center">${im.dia}</td>
            <td>${im.inquilino}${notaRef}</td>
            <td class="cell-cpf"><span class="cpf-mask" onclick="toggleCPF(this)" data-cpf="${im.cpf}" data-visible="false" title="Clique para revelar">${cpfMasked(im.cpf)}</span></td>
            <td>${im.inicio}</td>
            <td>${im.fim}</td>
            <td>${finalBadge}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');

    tfoot.innerHTML = `<tr>
        <td><strong>Total</strong></td>
        <td class="cell-valor"><strong>R$ ${fmt(total)}</strong></td>
        <td colspan="7"></td>
    </tr>`;
}

// ===== OBSERVACOES =====
function renderObservacoes() {
    const container = document.getElementById('obsContainer');
    const items = [];

    // Busca imovel com desconto que tenha observacao
    imoveisData.forEach(im => {
        if (im.temNota && im.obsGeral) {
            items.push(`<div class="obs-item obs-desconto">
                <span class="obs-icon">*</span>
                <div>
                    <strong>Casa ${im.casa} - ${im.inquilino}</strong>
                    <p>${im.obsGeral}</p>
                    <div class="desconto-countdown" id="descontoCountdown"></div>
                </div>
            </div>`);
        }
    });

    // Imoveis em atraso
    imoveisData.forEach(im => {
        if (isAtrasado(im)) {
            items.push(`<div class="obs-item obs-atraso">
                <span class="obs-icon">!</span>
                <div>
                    <strong>Casa ${im.casa} - ${im.inquilino}</strong>
                    <p>Aluguel com pagamento em atraso.</p>
                </div>
            </div>`);
        }
    });

    container.innerHTML = items.join('');
}

// ===== CONTRATOS =====
function renderContratos() {
    const container = document.getElementById('contratosContainer');

    container.innerHTML = imoveisData.map(im => {
        let cardClass = 'contrato-card';
        let casaClass = 'contrato-casa';
        let extraBadge = '';

        if (isAtrasado(im)) {
            cardClass += ' contrato-atrasado';
            casaClass += ' atrasado';
            extraBadge = '<span class="badge badge-atrasado" style="margin-left:6px">Em atraso</span>';
        } else if (isDesconto(im)) {
            cardClass += ' contrato-desconto';
            casaClass += ' desconto';
            extraBadge = '<span class="badge badge-desconto" style="margin-left:6px">50% desconto</span>';
        }

        const finalBadge = im.finalidade.toLowerCase() === 'comercial'
            ? '<span class="contrato-tipo badge badge-comercial">Comercial</span>'
            : '<span class="contrato-tipo badge badge-residencial">Residencial</span>';

        const barraId = 'barra-' + im.casa.toLowerCase();
        const diasId = 'dias-' + im.casa.toLowerCase();

        let descontoDetalhe = '';
        if (isDesconto(im)) {
            descontoDetalhe = `<div class="detalhe"><span class="detalhe-label">Desconto ate</span><span>30/06/2026</span></div>`;
        }

        return `<div class="${cardClass}">
            <div class="contrato-header">
                <div class="${casaClass}">${im.casa}</div>
                <div class="contrato-info">
                    <strong>${im.inquilino}</strong>
                    ${finalBadge}${extraBadge}
                </div>
                <div class="contrato-valor">R$ ${fmt(im.valor)}<small>/mes</small></div>
            </div>
            <div class="contrato-detalhes">
                <div class="detalhe"><span class="detalhe-label">Vencimento</span><span>Dia ${im.dia}</span></div>
                <div class="detalhe"><span class="detalhe-label">Contrato</span><span>${im.inicio} a ${im.fim}</span></div>
                <div class="detalhe"><span class="detalhe-label">CPF</span><span class="cpf-mask" onclick="toggleCPF(this)" data-cpf="${im.cpf}" data-visible="false" title="Clique para revelar">${cpfMasked(im.cpf)}</span></div>
                ${descontoDetalhe}
            </div>
            <div class="contrato-barra">
                <div class="barra-bg"><div class="barra-fill" id="${barraId}"></div></div>
                <div class="barra-labels">
                    <span>${im.inicio}</span>
                    <span id="${diasId}"></span>
                    <span>${im.fim}</span>
                </div>
            </div>
        </div>`;
    }).join('');

    // Calcula barras apos renderizar
    imoveisData.forEach(im => {
        const barraId = 'barra-' + im.casa.toLowerCase();
        const diasId = 'dias-' + im.casa.toLowerCase();
        calcBarra(im.inicio, im.fim, barraId, diasId);
    });
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

    imoveisData.forEach(im => {
        if (!isAtrasado(im)) return;
        alertas.push({
            urgente: true,
            texto: `<strong>Casa ${im.casa}</strong> - Aluguel de <strong>R$ ${fmt(im.valor)}</strong> com pagamento <strong>em atraso</strong> (vencimento dia ${im.dia}) - ${im.inquilino}`
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
    if (!el) return;

    const fimDesconto = new Date(2026, 5, 30);
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
    const now = new Date();
    const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    el.textContent = now.toLocaleDateString('pt-BR', options);
}

// ===== INIT =====
loadTheme();
fetchPlanilha();
