// Nó Code (Run Once for All Items) do Verdi Flows.
// Port do montarDados_/lerAba_ do codigo.gs (Apps Script) + substituição do <?!= dadosJson ?> do index.html.
// Espera os nós do Google Sheets com os nomes abaixo, cada um lendo uma aba.

const NOS = { cp: 'Ler CP', aff: 'Ler AFF', mp: 'Ler MP', acomp: 'Ler Acompanhamento' };

const COLUNAS = {
  cp: ['SELLER_ID', 'MEDIA_INVESTIMENTO_JAN_SET_2026', 'INVESTIMENTO_OUT_NOV_2026',
       'VARIACAO_OUT_NOV_2026_VS_MEDIA_JAN_SET_2026', 'ATINGIMENTO_VS_META', 'FLAG_META_BATIDA',
       'CRESCIMENTO_OUT_NOV_2025_VS_MEDIA_JAN_SET_2025',
       'META_INVESTIMENTO_2026', 'NOME_SELLER', 'CNPJ', 'ASSESSOR'],
  aff: ['SELLER_ID', 'TOTAL_ITENS', 'TOTAL_ITENS_KMIS', 'ITENS_COM_5_COMISSAO', 'ITENS_COM_5_DE_COMISSAO_PCT',
        'ATINGIMENTO_VS_META', 'FLAG_META_BATIDA', 'NOME_SELLER', 'CNPJ', 'ASSESSOR'],
  mp: ['SELLER_ID', 'cupons_validos', 'produtos_relampago',
       'ATINGIMENTO_VS_META_CUPONS', 'ATINGIMENTO_VS_META_RELAMPAGO',
       'NOME_SELLER', 'CNPJ', 'ASSESSOR']
};

// ---------------------------------------------------------------- conversões (iguais ao codigo.gs)

const normalizar = s => String(s === null || s === undefined ? '' : s).normalize('NFC').trim().toLowerCase();

const idSeller = v => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(Math.round(v));
  return String(v).trim();
};

const texto = v => (v === null || v === undefined ? '' : String(v).trim());

const cnpj = v => {
  const s = texto(v);
  if (!s) return '';
  // Reconstitui zeros à esquerda se a planilha guardou o CNPJ como número.
  return /^\d{1,14}$/.test(s) ? s.padStart(14, '0') : s;
};

const numero = v => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const t = v.trim().replace('%', '');
    if (t === '' || t.charAt(0) === '#') return null;
    const n = Number(t.indexOf(',') >= 0 ? t.replace(/\./g, '').replace(',', '.') : t);
    return isFinite(n) ? n : null;
  }
  return null;
};

const arred = (v, casas) => {
  const n = numero(v);
  if (n === null) return null;
  const f = Math.pow(10, casas);
  return Math.round(n * f) / f;
};

const inteiro = v => {
  const n = numero(v);
  return n === null ? null : Math.round(n);
};

const porCento = v => {
  const n = numero(v);
  return n === null ? null : Math.round(n * 100 * 1e4) / 1e4;
};

const paraBool = v => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const t = normalizar(v);
  if (['true', 'verdadeiro', 'sim', '1'].includes(t)) return true;
  if (['false', 'falso', 'nao', 'não', '0'].includes(t)) return false;
  return null;
};

// ---------------------------------------------------------------- leitura

// Lê uma aba pelo nome dos cabeçalhos (cada item do nó do Sheets já é { CABECALHO: valor }).
const lerAba = chave => {
  const linhas = $(NOS[chave]).all().map(i => i.json);
  if (linhas.length === 0) return [];

  const cab = {};
  Object.keys(linhas[0]).forEach(k => {
    const n = normalizar(k);
    if (n && cab[n] === undefined) cab[n] = k;
  });

  const chaves = {};
  COLUNAS[chave].forEach(col => {
    const k = cab[normalizar(col)];
    if (k === undefined) throw new Error(`Coluna "${col}" não encontrada na aba "${NOS[chave]}".`);
    chaves[col] = k;
  });

  const out = [];
  linhas.forEach(r => {
    const id = idSeller(r[chaves.SELLER_ID]);
    if (id === '') return;
    const obj = {};
    COLUNAS[chave].forEach(col => { obj[col] = r[chaves[col]]; });
    obj.SELLER_ID = id;
    out.push(obj);
  });
  return out;
};

// Acompanhamento_Acessores é lido pela POSIÇÃO das colunas (A=0 ... H=7), como no codigo.gs.
// Atenção: depende de o Sheets devolver todas as colunas, inclusive as sem cabeçalho.
const lerAcompanhamento = () => $(NOS.acomp).all()
  .map(i => Object.values(i.json))
  .filter(r => String(r[0] === undefined || r[0] === null ? '' : r[0]).trim() !== '')
  .map(r => [
    String(r[0]).trim(), // A: Nome do assessor
    inteiro(r[1]),       // B: Sellers na carteira
    inteiro(r[2]),       // C: Quantidade já acessada
    numero(r[6]),        // G: Meta (%) — 0,60 = 60%
    inteiro(r[5]),       // F: Sellers que concluíram
    numero(r[7])         // H: Atingimento (%) — 0,40 = 40%
  ]);

// ---------------------------------------------------------------- montagem dos dados

const cp = lerAba('cp').map(r => [
  r.SELLER_ID,
  arred(r.MEDIA_INVESTIMENTO_JAN_SET_2026, 6),
  arred(r.INVESTIMENTO_OUT_NOV_2026, 6),
  porCento(r.VARIACAO_OUT_NOV_2026_VS_MEDIA_JAN_SET_2026),
  arred(r.ATINGIMENTO_VS_META, 6),
  paraBool(r.FLAG_META_BATIDA) === true,
  porCento(r.CRESCIMENTO_OUT_NOV_2025_VS_MEDIA_JAN_SET_2025),
  // Campos novos ao final: preservam os índices dos indicadores existentes.
  arred(r.META_INVESTIMENTO_2026, 6),
  texto(r.NOME_SELLER),
  cnpj(r.CNPJ),
  texto(r.ASSESSOR)
]);

const aff = lerAba('aff').map(r => [
  r.SELLER_ID,
  inteiro(r.TOTAL_ITENS),
  inteiro(r.ITENS_COM_5_COMISSAO),
  arred(r.ITENS_COM_5_DE_COMISSAO_PCT, 6),
  arred(r.ATINGIMENTO_VS_META, 6),
  paraBool(r.FLAG_META_BATIDA),
  texto(r.NOME_SELLER),
  cnpj(r.CNPJ),
  texto(r.ASSESSOR),
  inteiro(r.TOTAL_ITENS_KMIS)
]);

const mp = lerAba('mp').map(r => {
  const aCup = arred(r.ATINGIMENTO_VS_META_CUPONS, 6);
  const aRel = arred(r.ATINGIMENTO_VS_META_RELAMPAGO, 6);
  return [
    r.SELLER_ID,
    inteiro(r.cupons_validos),
    inteiro(r.produtos_relampago),
    aCup,
    aRel,
    aCup !== null && aRel !== null && aCup >= 1 && aRel >= 1,
    texto(r.NOME_SELLER),
    cnpj(r.CNPJ),
    texto(r.ASSESSOR)
  ];
});

const acomp = lerAcompanhamento();

if (!cp.length && !aff.length && !mp.length) {
  throw new Error('Nenhuma linha lida das abas. Verifique o ID da planilha e as permissões do credencial do Sheets.');
}

const gerado = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const dados = { fonte: 'Google Sheets', gerado, cp, aff, mp, acomp };

// Mesmo escape do serializar_ do codigo.gs: impede que </script> ou separadores de linha quebrem o HTML.
const json = JSON.stringify(dados)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029');

const template = $('Set Config').first().json.template;
if (!template.includes('<?!= dadosJson ?>')) {
  throw new Error('Placeholder <?!= dadosJson ?> não encontrado no template.');
}
const html = template.replace('<?!= dadosJson ?>', () => json);

return [{
  json: {
    final_html: html,
    gerado,
    linhas: { cp: cp.length, aff: aff.length, mp: mp.length, acomp: acomp.length }
  }
}];
