// ===== CONSTANTS =====
const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// ===== DATA =====
function getDefaultData() {
    return {
        imoveis: [
            {
                id: '1',
                casa: '15',
                valor: 630,
                diaPagamento: 14,
                inquilino: 'Luis Felipe da Silva Medeiros',
                cpf: '134.162.744-66',
                inicio: '2025-11-13',
                fim: '2026-11-13',
                finalidade: 'Residencial',
                obs: 'Fizeram uma reforma (troca de pisos quebrados, reboco do teto e colocacao de piso na area de servico; substituicao do piso no quarto de taco); desconto de 50% do aluguel por um ano (ate 30/06/2026); IPTU e agua inclusos no aluguel'
            },
            {
                id: '2',
                casa: '16',
                valor: 720,
                diaPagamento: 10,
                inquilino: 'Pedro Elandro Holanda Granjeiro',
                cpf: '104.295.114-42',
                inicio: '2023-04-04',
                fim: '2026-04-04',
                finalidade: 'Comercial',
                obs: ''
            },
            {
                id: '3',
                casa: '16A',
                valor: 306,
                diaPagamento: 5,
                inquilino: 'Humberto de Oliveira Nunes',
                cpf: '653.396.814-91',
                inicio: '2025-06-30',
                fim: '2027-06-30',
                finalidade: 'Residencial',
                obs: ''
            }
        ],
        pagamentos: {},
        extrato: {
            '2025-02': {
                saldoAnterior: 5081.08,
                lancamentos: [
                    { id: 'e1', dia: 3, historico: 'Reajuste Monetario - BACEN', valor: 0.12 },
                    { id: 'e2', dia: 3, historico: 'Juros', valor: 0.33 },
                    { id: 'e3', dia: 4, historico: 'Pagamento Conta De Agua', valor: -672.81 },
                    { id: 'e4', dia: 4, historico: 'Pix - Recebido 04/02 22:07 - DENIS ULISSE', valor: 312.00 },
                    { id: 'e5', dia: 12, historico: 'Pix - Recebido 12/02 14:25 - DENIS ULISS', valor: 727.00 }
                ]
            }
        },
        nextId: 4
    };
}

function loadData() {
    try {
        const s = localStorage.getItem('alugueisData');
        if (s) return JSON.parse(s);
    } catch(e) {}
    return getDefaultData();
}

function save() {
    localStorage.setItem('alugueisData', JSON.stringify(data));
}

let data = loadData();

// ===== UTILS =====
function fmt(v) {
    return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
    if (!d) return '-';
    const p = d.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
}

function genId() {
    return String(data.nextId++);
}

function extKey(month, year) {
    return year + '-' + String(month + 1).padStart(2, '0');
}

function maskCPF(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d+)/, '$1.$2.$3-$4');
    else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2');
    el.value = v;
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function populateMonthYear(monthId, yearId, selMonth, selYear) {
    const mSel = document.getElementById(monthId);
    const ySel = document.getElementById(yearId);
    if (!mSel || !ySel) return;
    mSel.innerHTML = MESES.map((m, i) => `<option value="${i}" ${i === selMonth ? 'selected' : ''}>${m}</option>`).join('');
    const cy = new Date().getFullYear();
    ySel.innerHTML = '';
    for (let y = cy - 3; y <= cy + 2; y++) {
        ySel.innerHTML += `<option value="${y}" ${y === selYear ? 'selected' : ''}>${y}</option>`;
    }
}

function getSelectedMY(monthId, yearId) {
    return {
        month: parseInt(document.getElementById(monthId).value),
        year: parseInt(document.getElementById(yearId).value)
    };
}

// ===== NAVIGATION =====
function showPage(pageId, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + pageId).classList.add('active');
    if (btn) btn.classList.add('active');
    renderPage(pageId);
}

function renderPage(id) {
    updateHeader();
    switch(id) {
        case 'dashboard': renderDashboard(); break;
        case 'imoveis': renderImoveis(); break;
        case 'pagamentos': renderPagamentos(); break;
        case 'extrato': renderExtrato(); break;
    }
}

function updateHeader() {
    const total = data.imoveis.reduce((s, im) => s + im.valor, 0);
    document.getElementById('totalReceita').textContent = fmt(total);
    document.getElementById('totalImoveis').textContent = data.imoveis.length;
}

// ===== DASHBOARD =====
function renderDashboard() {
    const now = new Date();
    populateMonthYear('dashMonth', 'dashYear', now.getMonth(), now.getFullYear());

    const { month, year } = getSelectedMY('dashMonth', 'dashYear');
    const receitaPrevista = data.imoveis.reduce((s, im) => s + im.valor, 0);
    let recebido = 0, pendente = 0;

    const vencRows = data.imoveis.map(im => {
        const key = `${im.id}_${month}_${year}`;
        const pag = data.pagamentos[key];
        const status = pag ? pag.status : 'pendente';
        const venc = new Date(year, month, im.diaPagamento);
        const isLate = !pag && now > venc;

        if (status === 'pago' || status === 'atrasado') {
            recebido += pag.valor || im.valor;
        } else {
            pendente += im.valor;
        }

        const badgeClass = status === 'pago' ? 'badge-pago' : status === 'atrasado' ? 'badge-atrasado' : (isLate ? 'badge-atrasado' : 'badge-pendente');
        const badgeText = status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Atraso' : (isLate ? 'Vencido' : 'Pendente');

        return `<tr>
            <td><strong>${im.casa}</strong></td>
            <td>${im.inquilino}</td>
            <td class="text-right">${fmt(im.valor)}</td>
            <td class="text-center">${String(im.diaPagamento).padStart(2,'0')}/${String(month+1).padStart(2,'0')}</td>
            <td class="text-center"><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>`;
    }).join('');

    document.getElementById('dashVencimentos').innerHTML = vencRows || '<tr><td colspan="5" class="text-center" style="color:var(--text-light)">Nenhum imovel</td></tr>';

    // Saldo extrato
    const ek = extKey(month, year);
    const ext = data.extrato[ek];
    let saldo = 0;
    if (ext) {
        saldo = ext.saldoAnterior + ext.lancamentos.reduce((s, l) => s + l.valor, 0);
    }

    document.getElementById('dashReceita').textContent = fmt(receitaPrevista);
    document.getElementById('dashRecebido').textContent = fmt(recebido);
    document.getElementById('dashPendente').textContent = fmt(pendente);
    document.getElementById('dashSaldo').textContent = fmt(saldo);

    // Contracts
    const today = new Date();
    document.getElementById('dashContratos').innerHTML = data.imoveis.map(im => {
        const start = new Date(im.inicio + 'T00:00:00');
        const end = new Date(im.fim + 'T00:00:00');
        const total = end - start;
        const elapsed = Math.max(0, Math.min(today - start, total));
        const pct = total > 0 ? (elapsed / total * 100) : 0;
        const remaining = Math.max(0, Math.ceil((end - today) / (1000*60*60*24)));
        const color = remaining < 60 ? 'var(--red)' : remaining < 180 ? 'var(--orange)' : 'var(--green)';

        return `<div class="contract-item">
            <div class="contract-top">
                <strong>Casa ${im.casa}</strong>
                <span style="font-size:0.8rem;color:${color};font-weight:600">${remaining} dias restantes</span>
            </div>
            <div class="contract-bar-bg">
                <div class="contract-bar-fill" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="contract-dates">
                <span>${fmtDate(im.inicio)}</span>
                <span>${fmtDate(im.fim)}</span>
            </div>
        </div>`;
    }).join('') || '<p style="color:var(--text-light);padding:10px 0">Nenhum contrato</p>';

    // Chart - last 12 months
    const chartData = [];
    for (let i = 11; i >= 0; i--) {
        let m = now.getMonth() - i;
        let y = now.getFullYear();
        while (m < 0) { m += 12; y--; }
        let rec = 0, pend = 0;
        data.imoveis.forEach(im => {
            const key = `${im.id}_${m}_${y}`;
            const pag = data.pagamentos[key];
            if (pag && (pag.status === 'pago' || pag.status === 'atrasado')) {
                rec += pag.valor || im.valor;
            } else {
                pend += im.valor;
            }
        });
        chartData.push({ label: MESES_SHORT[m], rec, pend });
    }

    const maxVal = Math.max(...chartData.map(d => Math.max(d.rec, d.pend)), 1);
    document.getElementById('dashChart').innerHTML = chartData.map(d => {
        const rH = d.rec / maxVal * 150;
        const pH = d.pend / maxVal * 150;
        return `<div class="chart-bar-group">
            <div class="chart-bars">
                <div class="chart-bar green-bg" style="height:${rH}px" title="Recebido: ${fmt(d.rec)}"></div>
                <div class="chart-bar orange-bg" style="height:${pH}px" title="Pendente: ${fmt(d.pend)}"></div>
            </div>
            <div class="chart-label">${d.label}</div>
        </div>`;
    }).join('');
}

// ===== IMOVEIS =====
function renderImoveis() {
    const list = document.getElementById('imoveisList');
    if (data.imoveis.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:30px">Nenhum imovel cadastrado</p>';
        return;
    }

    list.innerHTML = data.imoveis.map(im => {
        const finalBadge = im.finalidade === 'Comercial' ? 'badge-comercial' : 'badge-residencial';
        return `<div class="imovel-card">
            <div class="imovel-left">
                <div class="imovel-num">${im.casa}</div>
                <div class="imovel-info">
                    <h3>${im.inquilino}</h3>
                    <p>CPF: ${im.cpf} &nbsp; <span class="badge ${finalBadge}">${im.finalidade}</span></p>
                    <div class="imovel-meta">
                        <span>Vencimento: <strong>dia ${im.diaPagamento}</strong></span>
                        <span>Contrato: <strong>${fmtDate(im.inicio)} - ${fmtDate(im.fim)}</strong></span>
                    </div>
                    ${im.obs ? `<p style="margin-top:6px;font-size:0.8rem;color:var(--orange)">* ${im.obs}</p>` : ''}
                </div>
            </div>
            <div class="imovel-right">
                <div class="imovel-valor">${fmt(im.valor)}<span style="font-size:0.7rem;color:var(--text-light);font-weight:400">/mes</span></div>
                <div class="imovel-actions">
                    <button class="btn-icon" onclick="editImovel('${im.id}')" title="Editar">&#9998;</button>
                    <button class="btn-icon delete" onclick="deleteImovel('${im.id}')" title="Excluir">&#10005;</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openImovelModal() {
    document.getElementById('imovelModalTitle').textContent = 'Novo Imovel';
    document.getElementById('imEditId').value = '';
    document.getElementById('imCasa').value = '';
    document.getElementById('imValor').value = '';
    document.getElementById('imDia').value = '10';
    document.getElementById('imInquilino').value = '';
    document.getElementById('imCPF').value = '';
    document.getElementById('imInicio').value = '';
    document.getElementById('imFim').value = '';
    document.getElementById('imFinalidade').value = 'Residencial';
    document.getElementById('imObs').value = '';
    document.getElementById('imovelModal').classList.add('active');
}

function editImovel(id) {
    const im = data.imoveis.find(i => i.id === id);
    if (!im) return;
    document.getElementById('imovelModalTitle').textContent = 'Editar Imovel';
    document.getElementById('imEditId').value = id;
    document.getElementById('imCasa').value = im.casa;
    document.getElementById('imValor').value = im.valor;
    document.getElementById('imDia').value = im.diaPagamento;
    document.getElementById('imInquilino').value = im.inquilino;
    document.getElementById('imCPF').value = im.cpf;
    document.getElementById('imInicio').value = im.inicio;
    document.getElementById('imFim').value = im.fim;
    document.getElementById('imFinalidade').value = im.finalidade;
    document.getElementById('imObs').value = im.obs || '';
    document.getElementById('imovelModal').classList.add('active');
}

function saveImovel() {
    const editId = document.getElementById('imEditId').value;
    const obj = {
        id: editId || genId(),
        casa: document.getElementById('imCasa').value.trim(),
        valor: parseFloat(document.getElementById('imValor').value) || 0,
        diaPagamento: parseInt(document.getElementById('imDia').value) || 10,
        inquilino: document.getElementById('imInquilino').value.trim(),
        cpf: document.getElementById('imCPF').value.trim(),
        inicio: document.getElementById('imInicio').value,
        fim: document.getElementById('imFim').value,
        finalidade: document.getElementById('imFinalidade').value,
        obs: document.getElementById('imObs').value.trim()
    };

    if (!obj.casa) { alert('Informe a identificacao da casa'); return; }
    if (!obj.inquilino) { alert('Informe o nome do inquilino'); return; }

    if (editId) {
        const idx = data.imoveis.findIndex(i => i.id === editId);
        if (idx >= 0) data.imoveis[idx] = obj;
    } else {
        data.imoveis.push(obj);
    }

    save();
    closeModal('imovelModal');
    renderImoveis();
    updateHeader();
}

function deleteImovel(id) {
    const im = data.imoveis.find(i => i.id === id);
    if (!im) return;
    if (!confirm(`Excluir casa ${im.casa}?`)) return;
    data.imoveis = data.imoveis.filter(i => i.id !== id);
    save();
    renderImoveis();
    updateHeader();
}

// ===== PAGAMENTOS =====
function renderPagamentos() {
    const now = new Date();
    populateMonthYear('pagMonth', 'pagYear', now.getMonth(), now.getFullYear());

    const { month, year } = getSelectedMY('pagMonth', 'pagYear');
    const body = document.getElementById('pagBody');
    const foot = document.getElementById('pagFoot');
    let totalAluguel = 0, totalPago = 0;

    // Filter for historico
    const filterSel = document.getElementById('histFilterCasa');
    filterSel.innerHTML = '<option value="">Todas as casas</option>' + data.imoveis.map(im => `<option value="${im.id}">Casa ${im.casa}</option>`).join('');

    body.innerHTML = data.imoveis.map(im => {
        const key = `${im.id}_${month}_${year}`;
        const pag = data.pagamentos[key];
        const status = pag ? pag.status : 'pendente';
        const venc = new Date(year, month, im.diaPagamento);
        const isLate = !pag && now > venc;

        totalAluguel += im.valor;
        if (pag && (pag.status === 'pago' || pag.status === 'atrasado')) {
            totalPago += pag.valor || im.valor;
        }

        const badgeClass = status === 'pago' ? 'badge-pago' : status === 'atrasado' ? 'badge-atrasado' : (isLate ? 'badge-atrasado' : 'badge-pendente');
        const badgeText = status === 'pago' ? 'Pago' : status === 'atrasado' ? 'Pago c/ Atraso' : (isLate ? 'Vencido' : 'Pendente');

        return `<tr>
            <td><strong>${im.casa}</strong></td>
            <td>${im.inquilino}</td>
            <td class="text-right">${fmt(im.valor)}</td>
            <td class="text-center">${im.diaPagamento}</td>
            <td class="text-center"><span class="badge ${badgeClass}">${badgeText}</span></td>
            <td>${pag && pag.data ? fmtDate(pag.data) : '-'}</td>
            <td class="text-right">${pag && pag.valor ? fmt(pag.valor) : '-'}</td>
            <td style="font-size:0.8rem;max-width:120px;overflow:hidden;text-overflow:ellipsis">${pag && pag.obs ? pag.obs : ''}</td>
            <td><button class="btn btn-sm btn-outline" onclick="openPagModal('${im.id}',${month},${year})">Registrar</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="9" class="text-center" style="color:var(--text-light)">Nenhum imovel</td></tr>';

    foot.innerHTML = `<tr>
        <td colspan="2"><strong>Total</strong></td>
        <td class="text-right"><strong>${fmt(totalAluguel)}</strong></td>
        <td></td><td></td><td></td>
        <td class="text-right"><strong>${fmt(totalPago)}</strong></td>
        <td></td><td></td>
    </tr>`;

    renderHistorico();
}

function openPagModal(imId, month, year) {
    const im = data.imoveis.find(i => i.id === imId);
    if (!im) return;
    const key = `${imId}_${month}_${year}`;
    const pag = data.pagamentos[key];

    document.getElementById('pgCasa').value = imId;
    document.getElementById('pgMonth').value = month;
    document.getElementById('pgYear').value = year;
    document.getElementById('pagModalInfo').textContent = `Casa ${im.casa} - ${im.inquilino} - ${MESES[month]}/${year}`;
    document.getElementById('pgStatus').value = pag ? pag.status : 'pago';
    document.getElementById('pgValor').value = pag ? pag.valor : im.valor;
    document.getElementById('pgData').value = pag ? pag.data || '' : new Date().toISOString().split('T')[0];
    document.getElementById('pgObs').value = pag ? pag.obs || '' : '';
    document.getElementById('pagModal').classList.add('active');
}

function savePagamento() {
    const imId = document.getElementById('pgCasa').value;
    const month = parseInt(document.getElementById('pgMonth').value);
    const year = parseInt(document.getElementById('pgYear').value);
    const status = document.getElementById('pgStatus').value;
    const valor = parseFloat(document.getElementById('pgValor').value) || 0;
    const dt = document.getElementById('pgData').value;
    const obs = document.getElementById('pgObs').value;

    const key = `${imId}_${month}_${year}`;
    if (status === 'pendente') {
        delete data.pagamentos[key];
    } else {
        data.pagamentos[key] = { status, valor, data: dt, obs };
    }

    save();
    closeModal('pagModal');
    renderPagamentos();
}

function renderHistorico() {
    const filter = document.getElementById('histFilterCasa').value;
    const body = document.getElementById('histBody');
    const entries = [];

    Object.entries(data.pagamentos).forEach(([key, pag]) => {
        const [imId, m, y] = key.split('_');
        if (filter && imId !== filter) return;
        const im = data.imoveis.find(i => i.id === imId);
        if (!im) return;
        entries.push({
            sort: `${y}-${String(m).padStart(2,'0')}`,
            month: parseInt(m),
            year: parseInt(y),
            casa: im.casa,
            inquilino: im.inquilino,
            valor: pag.valor,
            data: pag.data,
            status: pag.status
        });
    });

    entries.sort((a, b) => b.sort.localeCompare(a.sort));

    body.innerHTML = entries.slice(0, 50).map(e => {
        const badgeClass = e.status === 'pago' ? 'badge-pago' : 'badge-atrasado';
        const badgeText = e.status === 'pago' ? 'Pago' : 'Atraso';
        return `<tr>
            <td>${MESES_SHORT[e.month]}/${e.year}</td>
            <td><strong>${e.casa}</strong></td>
            <td>${e.inquilino}</td>
            <td class="text-right">${fmt(e.valor)}</td>
            <td>${e.data ? fmtDate(e.data) : '-'}</td>
            <td class="text-center"><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" class="text-center" style="color:var(--text-light)">Nenhum pagamento registrado</td></tr>';
}

// ===== EXTRATO =====
function renderExtrato() {
    const now = new Date();
    populateMonthYear('extMonth', 'extYear', now.getMonth(), now.getFullYear());

    const { month, year } = getSelectedMY('extMonth', 'extYear');
    const ek = extKey(month, year);

    if (!data.extrato[ek]) {
        data.extrato[ek] = { saldoAnterior: 0, lancamentos: [] };
    }

    const ext = data.extrato[ek];
    const lancamentos = ext.lancamentos.sort((a, b) => a.dia - b.dia);
    let totalEntradas = 0, totalSaidas = 0;

    lancamentos.forEach(l => {
        if (l.valor >= 0) totalEntradas += l.valor;
        else totalSaidas += l.valor;
    });

    const saldoDisponivel = ext.saldoAnterior + totalEntradas + totalSaidas;

    document.getElementById('extSaldoAnt').textContent = fmt(ext.saldoAnterior);
    document.getElementById('extDespesas').textContent = fmt(totalSaidas);
    document.getElementById('extSaldo').textContent = fmt(saldoDisponivel);

    const body = document.getElementById('extBody');
    body.innerHTML = lancamentos.map(l => {
        const color = l.valor >= 0 ? 'var(--green)' : 'var(--red)';
        return `<tr>
            <td class="text-center">${String(l.dia).padStart(2, '0')}</td>
            <td>${l.historico}</td>
            <td class="text-right" style="color:${color};font-weight:600">${l.valor >= 0 ? '' : '- '}${fmt(Math.abs(l.valor))}</td>
            <td><button class="btn-icon delete" onclick="deleteLancamento('${ek}','${l.id}')" title="Excluir">&#10005;</button></td>
        </tr>`;
    }).join('') || '<tr><td colspan="4" class="text-center" style="color:var(--text-light)">Nenhum lancamento</td></tr>';

    // Add saldo anterior editable row
    body.innerHTML = `<tr style="background:#f8f9fb">
        <td></td>
        <td><strong>Saldo Anterior</strong></td>
        <td class="text-right" style="font-weight:600">${fmt(ext.saldoAnterior)}</td>
        <td><button class="btn-icon" onclick="editSaldoAnterior('${ek}')" title="Editar">&#9998;</button></td>
    </tr>` + body.innerHTML + `<tr style="background:#f0f7ff;border-top:2px solid var(--primary)">
        <td></td>
        <td><strong>Saldo Disponivel</strong></td>
        <td class="text-right" style="font-weight:700;color:var(--primary);font-size:1rem">${fmt(saldoDisponivel)}</td>
        <td></td>
    </tr>`;
}

function openLancamentoModal() {
    document.getElementById('lcEditId').value = '';
    document.getElementById('lcDia').value = new Date().getDate();
    document.getElementById('lcValor').value = '';
    document.getElementById('lcHist').value = '';
    document.getElementById('lancModal').classList.add('active');
}

function saveLancamento() {
    const { month, year } = getSelectedMY('extMonth', 'extYear');
    const ek = extKey(month, year);
    if (!data.extrato[ek]) {
        data.extrato[ek] = { saldoAnterior: 0, lancamentos: [] };
    }

    const dia = parseInt(document.getElementById('lcDia').value) || 1;
    const valor = parseFloat(document.getElementById('lcValor').value) || 0;
    const historico = document.getElementById('lcHist').value.trim();

    if (!historico) { alert('Informe o historico'); return; }

    data.extrato[ek].lancamentos.push({
        id: 'e' + Date.now(),
        dia, historico, valor
    });

    save();
    closeModal('lancModal');
    renderExtrato();
}

function deleteLancamento(ek, id) {
    if (!confirm('Excluir este lancamento?')) return;
    const ext = data.extrato[ek];
    if (ext) {
        ext.lancamentos = ext.lancamentos.filter(l => l.id !== id);
        save();
        renderExtrato();
    }
}

function editSaldoAnterior(ek) {
    const ext = data.extrato[ek];
    const val = prompt('Saldo anterior:', ext ? ext.saldoAnterior : 0);
    if (val !== null) {
        if (!data.extrato[ek]) data.extrato[ek] = { saldoAnterior: 0, lancamentos: [] };
        data.extrato[ek].saldoAnterior = parseFloat(val) || 0;
        save();
        renderExtrato();
    }
}

// ===== EXPORT / IMPORT =====
function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alugueis_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imp = JSON.parse(e.target.result);
            if (imp.imoveis) {
                data = imp;
                save();
                location.reload();
            } else {
                alert('Arquivo invalido');
            }
        } catch(err) { alert('Erro: ' + err.message); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function resetData() {
    if (!confirm('Apagar TODOS os dados?')) return;
    if (!confirm('Tem certeza? Esta acao nao pode ser desfeita.')) return;
    data = getDefaultData();
    save();
    location.reload();
}

// ===== INIT =====
updateHeader();
renderDashboard();
