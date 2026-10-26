// Gera o JSON do workflow do Verdi Flows (importável no n8n) a partir do template e do nó Code.
// Uso: node build_workflow.js
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const template = fs.readFileSync(path.join(dir, 'dashboard_template.html'), 'utf8');
const codigo = fs.readFileSync(path.join(dir, 'montar_dashboard.js'), 'utf8');

const SHEET_ID = '18ugC3BEaHnQ5DaAeTPN8J3kCG5l3mnANGiu6ZKJfg_4';

const sheetsNode = (id, nome, aba, x) => ({
  parameters: {
    operation: 'read',
    documentId: { __rl: true, value: SHEET_ID, mode: 'id' },
    sheetName: { __rl: true, value: aba, mode: 'name' },
    options: { valueRenderOption: 'UNFORMATTED_VALUE' }
  },
  id,
  name: nome,
  type: 'n8n-nodes-base.googleSheets',
  typeVersion: 4.5,
  position: [x, -48],
  executeOnce: true
});

const workflow = {
  name: 'Dashboard Gamification BF 2026 (Sheets → Grid)',
  nodes: [
    {
      parameters: { rule: { interval: [{ triggerAtHour: 11 }] } },
      id: '321c5063-dcfc-4f04-82cb-92a3fae84754',
      name: 'Every Day 11AM São Paulo',
      type: 'n8n-nodes-base.scheduleTrigger',
      typeVersion: 1.2,
      position: [1776, -48]
    },
    {
      parameters: {
        assignments: {
          assignments: [
            { id: 'a1', name: 'today', value: "={{ $now.setZone('America/Sao_Paulo').toFormat('yyyy-MM-dd') }}", type: 'string' },
            // ID do documento no Grid (grid.adminml.com/d/<id>/view) onde o dashboard é publicado.
            { id: 'a2', name: 'grid_doc_id', value: '01M4HAZ0Z9PVYWDG2XBEWJPEYY', type: 'string' },
            { id: 'a3', name: 'grid_title', value: 'Dashboard Gamification Black Friday 2026', type: 'string' },
            { id: 'a4', name: 'template', value: template, type: 'string' }
          ]
        },
        options: {}
      },
      id: '9f123a90-2c27-4d78-b75d-74fcefc5392a',
      name: 'Set Config',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [2000, -48]
    },
    sheetsNode('c1a0a001-0000-4000-8000-000000000001', 'Ler CP', 'Extracao CP', 2208),
    sheetsNode('c1a0a001-0000-4000-8000-000000000002', 'Ler AFF', 'Extração AFF', 2416),
    sheetsNode('c1a0a001-0000-4000-8000-000000000003', 'Ler MP', 'Extração Minha Página', 2624),
    sheetsNode('c1a0a001-0000-4000-8000-000000000004', 'Ler Acompanhamento', 'Acompanhamento_Acessores', 2832),
    {
      parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: codigo },
      id: 'c1a0a001-0000-4000-8000-000000000005',
      name: 'Montar Dashboard',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [3040, -48]
    },
    {
      parameters: {
        method: 'PUT',
        url: "=http://grid.melisystems.com/d/{{ $('Set Config').first().json.grid_doc_id }}/content",
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBearerAuth',
        sendBody: true,
        contentType: 'raw',
        rawContentType: 'text/html',
        body: '={{ $json.final_html }}',
        options: {}
      },
      id: 'ab57a1bc-86c7-43d3-9a89-1cc81dcdf168',
      name: 'Upload to Grid',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.2,
      position: [3248, -48],
      executeOnce: true,
      credentials: {
        httpBearerAuth: { id: 'UKatcAmVOB0QE3nz', name: 'Grid Token' }
      }
    }
  ],
  pinData: {},
  connections: {
    'Every Day 11AM São Paulo': { main: [[{ node: 'Set Config', type: 'main', index: 0 }]] },
    'Set Config': { main: [[{ node: 'Ler CP', type: 'main', index: 0 }]] },
    'Ler CP': { main: [[{ node: 'Ler AFF', type: 'main', index: 0 }]] },
    'Ler AFF': { main: [[{ node: 'Ler MP', type: 'main', index: 0 }]] },
    'Ler MP': { main: [[{ node: 'Ler Acompanhamento', type: 'main', index: 0 }]] },
    'Ler Acompanhamento': { main: [[{ node: 'Montar Dashboard', type: 'main', index: 0 }]] },
    'Montar Dashboard': { main: [[{ node: 'Upload to Grid', type: 'main', index: 0 }]] }
  },
  settings: { executionOrder: 'v1' },
  tags: [
    { id: 'IwEgQU9q3OL7UdRN', name: '#VERDI/reporting' },
    { id: '8G7GGxAcFzIYXTx5', name: '#VERDI/automation' }
  ]
};

fs.writeFileSync(path.join(dir, 'Dashboard_Gamification_BF2026_Sheets_Grid.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log('workflow gerado com', workflow.nodes.length, 'nós');
