# 20 — Data & Sources

## A. Données externes (marché) — sourcées et datées

| Donnée | Valeur | Source | Date | URL | Utilisation |
|---|---|---|---|---|---|
| Particuliers actifs actions (FR) | 1,9 M (+21 % vs 2024) | AMF, Tableau de bord investisseurs particuliers n°21 | Mars 2026 | https://www.amf-france.org/en/news-publications/publications/household-savings-observatory/active-retail-investors-dashboard/active-retail-investor-dashboard-no21-march-2026 | Marché FR (`04`), TAM |
| Investisseurs ETF (FR) | >1,1 M (+83 % vs 607 k) | AMF (idem) | Mars 2026 | idem | ETF-first (`04`/`09`) |
| Nouveaux investisseurs 2025 (FR) | 780 k (1,6 M sur 3 ans) | AMF (idem) | Mars 2026 | idem | TAM (`04`) |
| Transactions actions 2025 (FR) | 56 M (vs 41 M) | AMF (idem) | Mars 2026 | idem | Dynamique retail |
| AUM UE Article 8/9 SFDR | ~50 % des AUM UE ; Europe = 84 % des actifs durables mondiaux | Morningstar, SFDR Article 8/9 Q3 2025 | T3 2025 | https://www.morningstar.com/en-gb/business/insights/research/sfdr-article8-article9 | Marché durable (`04`) |
| Flux nets Article 8 | +75 Md€ (T3 2025) ; +52 Md€ (T1 2025) | Morningstar (idem) | 2025 | idem | Dynamique ESG |
| Révision SFDR 2.0 (labels) | Proposition Commission UE | European Commission, COM(2025) 841 | 20 nov. 2025 | https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A52025PC0841 | Risque réglementaire (`11`/`19`) |
| Robo-advisory Europe | ~2,77 Md$ (2025), ~28 % mondial | Market.us / Fortune Business Insights (analystes privés) | 2025 | https://market.us/report/robo-advisory-market/ | Wealthtech (`04`) — **ordre de grandeur, méthodo privée** |
| Leader wealthtech UE | Scalable Capital > 20 Md€ AUM | Mandalore Partners, European WealthTech Map 2026 | 2026 | https://www.mandalorepartners.com/research/european-wealthtech-map-2026 | Concurrence (`05`) |

> Note qualité : AMF, Morningstar, Commission UE = sources primaires/institutionnelles (haute confiance). Les tailles de marché robo (analystes privés) ont des méthodologies non uniformes → traitées comme ordres de grandeur, jamais comme faits précis.

## B. Données internes (repo) — vérifiables

| Donnée | Valeur | Emplacement |
|---|---|---|
| Tables Postgres | 39 | `supabase/migrations/*` |
| Migrations | 68 | `supabase/migrations/` |
| Fichiers de test | 51 | `src/**/__tests__` |
| Univers investissable | ~58 tickers distincts | migrations `*universe*`, `*investable*` |
| Méthodologie portefeuille | v1.2 | `src/lib/portfolio/engine.ts` |
| Plancher ESG portefeuille | 70 (souple) | `types.ts` `MIN_PORTFOLIO_ESG` |
| Poids max / ligne | 25 % | `types.ts` `MAX_SINGLE_WEIGHT` |
| Benchmark carbone ACWI | 115 tCO₂e/M$ (MSCI, as of 2026-06-30) | `esg/benchmark.ts` |
| Capture d'intention réelle | `real_investment_intents` (amount, frequency, email) | migration `20260612…` |
| Prix produit | 0 € (bêta) ; futur non défini | `routes/tarifs.tsx` |

## C. Données manquantes (UNKNOWN — à confirmer par le fondateur)

Utilisateurs & waitlist · activation/rétention/NPS · revenu · CAC/LTV réels · taille & composition de l'équipe · entité légale & statut réglementaire · financement levé & valorisation · coûts réels (IA, data, infra) · sources ESG contractées (MSCI/Sustainalytics premium ?) · métriques de la boucle certificat.
