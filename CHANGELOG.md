# Changelog — ConnexFrame Designer App

Todas as alterações notáveis deste projeto são documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/) · Versionamento [SemVer](https://semver.org/).

---

## [v8.0] — 2026-05-24

Primeiro deploy público do ConnexFrame Designer App.

### Added — Funcionalidades core (5 tabs)
- **Sizing** — calculadora de quantidade de conectores, layout SVG, R-value vs competidores, BOM table
- **Heat Map** — visualização SVG de thermal bridging comparado a Steel / Thermomass / HK / THiN-Wall
- **Energy Savings** — calculadora anual de energia por cidade (12 cidades US) e tipo de prédio (6 tipos)
- **Connectors** — comparação de densidade (NU-Tie, IconX, Thermomass CC, Delta Tie) com KPIs + winner card
- **ROI** — projeção 20–50 anos, matriz de 11 métricas, curva cumulativa NPV

### Added — Refinamentos visuais e de credibilidade (V8 improvements)
- **Header refinado**: USPTO Patent badge, ASHRAE compliance pill com dot pulsante, botão Methodology, CTA "Talk to Engineer"
- **Project Metadata Bar** abaixo do header com 5 campos (Project Name, Client, Job #, Engineer of Record, Date) persistidos no localStorage
- **Methodology Modal** com transparência total: fórmulas, constantes, datasets, e citações de normas (ASHRAE 90.1-2022 §5.5.5, IECC 2024 §C402.7, ICC-ES AC422, ASTM C518/E488, ACI 318, Sorensen UNL 2019, ORNL Kosny 2006, Concrete Industries THiN-Wall Apr 2026)
- **Branded Footer** com Penz Innovative Engineering LLC, USPTO notice, link para connexframe.com
- **Ícones SVG coloridos por tab** (semantic visual cues): Sizing azul, Heat Map laranja, Energy verde, Connectors ciano, ROI amarelo
- **KPI Cards refinados**: letter-spacing 1.8, padding 20px, inner shadow sutil

### Added — Engenharia
- **Algoritmo de grid balanceado**: respeita edge clearance de 150mm em todas as 4 bordas e centraliza distribuição de conectores
- **Spacing responde à espessura do painel**: aproximação √(thickness ratio) — painéis mais espessos demandam mais conectores
- **Disclaimer integrado**: link "View methodology & sources →" no rodapé

### Added — DevExp
- **V7 preservada** em `src/App.v7.jsx` para comparação side-by-side
- **Version switcher** via URL: `localhost:5173/?v=7` mostra V7, default carrega V8
- **Version badge visual** no canto superior direito (verde V8 / marrom V7)

### Technical
- Stack: React 18 + Vite 5 (sem libs adicionais)
- Fonts: DM Sans + DM Mono (Google Fonts CDN)
- Estilo: inline styles via design tokens
- Gráficos: SVG nativo (sem D3/Chart.js)
- Animações: requestAnimationFrame puro

### Infrastructure
- Repositório GitHub: `guipenz/connexframe-designer`
- Auto-deploy: Vercel (qualquer push para `main` triggers deploy)
- URL pública: [designer.connexframe.com](https://designer.connexframe.com)
- URL backup: [connexframe-designer.vercel.app](https://connexframe-designer.vercel.app)
- SSL: automático via Vercel
- DNS: CNAME no Porkbun → cname.vercel-dns.com

---

## Tipos de mudança usados

- **Added** — funcionalidade nova
- **Changed** — mudança em funcionalidade existente
- **Deprecated** — funcionalidade marcada para remoção futura
- **Removed** — funcionalidade removida
- **Fixed** — correção de bug
- **Security** — correção relacionada à segurança
- **Technical** — refatoração ou mudanças sem impacto visual
- **Infrastructure** — mudanças de deploy/hosting/DNS

## Links

- [Releases no GitHub](https://github.com/guipenz/connexframe-designer/releases)
- [App no ar](https://designer.connexframe.com)
- [Landing page](https://connexframe.com)
