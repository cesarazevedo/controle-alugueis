// Calcula progresso das barras de contrato
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

calcBarra('13/11/2025', '13/11/2026', 'barra-15', 'dias-15');
calcBarra('04/04/2023', '04/04/2026', 'barra-16', 'dias-16');
calcBarra('30/06/2025', '30/06/2027', 'barra-16a', 'dias-16a');
