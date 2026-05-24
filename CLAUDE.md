# ConnexFrame Designer — Project Context

## Visão Geral
Aplicação React de sizing, simulação térmica e ROI para o sistema ConnexFrame (conector composto multi-zona para PCSPs). Companion ao site principal — funciona como ferramenta de venda + spec.

**Projeto irmão:** [ConnexFrame Landing Page](../ConnexFrame/CLAUDE.md) — landing page em https://connexframe.com

## Objetivos do App
1. **Cliente (precaster, GC):** dimensionar projeto + ver ROI + ver economia energética + comparar com concorrentes
2. **Investidor:** ver tração técnica e visão de produto/sistema (não só peça)
3. **EB-2 NIW:** evidência de obra de produto/sistema construído pelo fundador

## Estado Atual

**Origem:** Desenvolvido no Claude chat (web) como single-file React component.
**Última versão recebida:** V7 (arquivo `V8/ConnexFrame_Designer_V7_with_Connectors.jsx`, 1.512 linhas).
**Status:** Rodando localmente (segundo o usuário). Pronto para iteração de melhorias.

## Estrutura do App (V7)

### Layout
- **Header sticky:** logo + breadcrumb + badge ASHRAE compliant
- **Sidebar 284px:** Panel Geometry + Insulation + Variant + Climate Zone
- **Main:** TabBar com 5 abas + footer disclaimer

### Tabs
1. **Sizing** — quantidade de conectores, layout SVG, R-value bar charts, BOM table
2. **Heat Map** — visualização SVG de thermal bridging vs competidor selecionado
3. **Energy Savings** — calculadora anual de energia por cidade/tipo de prédio
4. **Connectors** — comparação de densidade (NU-Tie, IconX, Thermomass CC, Delta Tie) com KPIs + winner card
5. **ROI** — projeção 20–50 anos, matriz 11 métricas, curva cumulativa NPV

### Engine
- `calculate(inp)` — sizing core (connectors, spacing, R-eff, bridge loss, composite action)
- `calcEnergy(rEff, city, btype)` — energia anual via HDD/CDD
- `calcROI(R, roiInp)` — payback NPV multi-sistema com replacement

### Datasets Embarcados
- 8 ASHRAE Climate Zones (com cidade-referência e R-mínimo)
- 12 cidades US com HDD/CDD/elec/gas rates
- 6 building types com área default
- 3 ConnexFrame variants (V1/V2/V3 com composite/bridge factor)
- 4 competidores no Heat Map (Thermomass, HK, THiN-Wall, Steel)
- 5 sistemas no Connectors tab (ConnexFrame, NU-Tie, IconX, Thermomass CC, Delta Tie)
- 4 sistemas no ROI tab (ConnexFrame, Thermomass, Steel, Carbon Fiber)

## Tech Stack
- **Framework:** React 18+ (apenas hooks: useState/useMemo/useEffect/useRef)
- **Bundler:** Vite (a configurar)
- **Sem libs adicionais:** zero dependencies além de React e React-DOM
- **Estilo:** Inline styles via design tokens (`T` constant)
- **Fonts:** DM Sans + DM Mono (Google Fonts CDN inline via `@import`)
- **Gráficos:** SVG nativo (sem D3, Chart.js, Recharts)
- **Animações:** requestAnimationFrame puro

## Design Tokens
```javascript
T = {
  cu100–cu700: copper palette (#F5E6D3 → #4A2810)
  ca50–ca800:  carbon palette (#E8EAF0 → #050709)
  green: #2ECC71  (compliance ok)
  red:   #E74C3C  (non-compliance)
  blue:  #3B82F6  (heating accent)
}
```

## Estrutura de Pastas Esperada (após setup Vite)
```
ConnexFrame-Designer/
├── V8/                           (versão recebida do usuário — referência)
│   ├── ConnexFrame_Designer_V7_with_Connectors.jsx
│   ├── V7_Connectors_Tab_Preview.png
│   └── V7_Sizing_Tab_Preview.png
├── src/
│   ├── App.jsx                   (componente principal — adaptado do V7)
│   ├── main.jsx                  (entry point Vite)
│   └── index.css                 (reset global)
├── public/
├── index.html
├── package.json
├── vite.config.js
└── CLAUDE.md                     (este arquivo)
```

## Comandos Padrão
```bash
npm install          # instalar dependências
npm run dev          # rodar dev server (localhost:5173)
npm run build        # build de produção (gera dist/)
npm run preview      # preview do build
```

## Workflow Estabelecido com Usuário
1. **Preview local primeiro** — usuário visualiza em localhost antes de qualquer deploy
2. **Versionamento** — git tags para milestones (V8, V9, V10...)
3. **Backup do JSX original** preservado em `V8/`
4. **Iteração com hot reload** — Vite faz reload automático ao salvar
5. **Comunicação em português** com o usuário

## Próximas Melhorias (Backlog)

### Melhorias técnicas
- [ ] Setup Vite + React project structure
- [ ] Configurar fonts localmente (não depender de CDN)
- [ ] Adicionar TypeScript (opcional — aumenta robustez)
- [ ] Lazy load das tabs (performance)
- [ ] Extrair design tokens para arquivo separado
- [ ] Quebrar JSX gigante em arquivos por tab

### Melhorias de UX/UI
- [ ] Mobile responsive (atualmente desktop-only)
- [ ] Persistir inputs no localStorage
- [ ] Botão "Export PDF" do relatório
- [ ] Botão "Share project link" (com URL query params)
- [ ] Dark/Light mode toggle
- [ ] Tooltip explicando cada métrica
- [ ] Animações de transição entre tabs
- [ ] Sidebar collapsável

### Melhorias de Funcionalidade
- [ ] Importar/Exportar config JSON
- [ ] Comparação side-by-side (dois projetos)
- [ ] Sensibilidade de inputs (sliders interativos com resultado live)
- [ ] Histórico de cálculos
- [ ] Salvar projetos (precisa backend ou Supabase)
- [ ] Login (para precasters retornarem)
- [ ] Mais cidades / climate zones internacionais

### Deploy
- [ ] Configurar build de produção
- [ ] Hospedar em subdomínio: `designer.connexframe.com` ou `app.connexframe.com`
- [ ] Repositório GitHub separado
- [ ] CI/CD com Vercel/Netlify

## Disclaimer Importante
O app contém o disclaimer: *"Preliminary estimates only. Final design requires certified analysis per ACI 318 and ICC-ES AC422 by a licensed engineer of record."*

Manter esse disclaimer em qualquer modificação — proteção legal essencial.

## Referências Externas
- ASHRAE 90.1-2022 (climate zones, U-factors)
- ICC-ES AC422 (composite action validation)
- ACI 318 (structural design)
- ASTM C518 (R-value testing)
- Concrete Industries THiN-Wall Benchmarking (April 2026) — fonte da tabela de competitor counts
