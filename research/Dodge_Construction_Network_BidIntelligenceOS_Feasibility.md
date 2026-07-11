# Dodge Construction Network / Construction.com as a Data Source for BidIntelligenceOS

**Research Date:** July 11, 2026
**Depth:** Deep (5 focus areas + direct follow-up)
**Prepared for:** CCA / BidIntelligenceOS product evaluation
**Sources Consulted:** 30+ (Dodge's own binding legal contracts, first-party product pages, GSA/SAM.gov official docs, competitor sites, and independent review/comparison sources)

> **How to read this report.** Statements labeled **[FACT]** are grounded in primary or authoritative sources (Dodge's signed contract templates, official GSA API docs, first-party product pages). Statements labeled **[ASSUMPTION]** or **[INFERENCE]** are our interpretation and must be confirmed with Dodge and legal counsel before you rely on them. Vendor coverage numbers (project counts, firm counts) are **self-reported and unaudited**. Nothing here is legal advice.

---

## Executive Summary

Dodge Construction Network (DCN) is the deepest, most mature commercial-construction intelligence dataset in North America, and on paper it maps almost perfectly to what BidIntelligenceOS wants to do: full project lifecycle tracking (pre-planning → design → bidding → construction), bid dates, valuations, specs, plans, verified contacts, and owner↔architect↔GC↔bidder relationship intelligence [FACT: construction.com/dodge-one, /buildshare]. If the only question were "does Dodge have the data BidIntelligenceOS needs," the answer would be an emphatic yes.

The problem is not the data — it is the **license.** We read Dodge's actual, current, binding contract templates (API License Addendum eff. Aug 12 2025, Data Services Addendum, SaaS Addendum, Master Services Agreement, and Terms of Use). Every one of DCN's off-the-shelf licenses is **strictly internal-use-only** and explicitly prohibits the exact business model BidIntelligenceOS contemplates. In Dodge's own words, clients may **not** "offer DCN Data for sale to, or use by, third parties," may **not** "market, advertise, promote, distribute, or sell … DCN Data, **or derivative works including DCN Data**, to third parties," and may **not** use the information "in any manner which competes with any products or services of DCN" or "to provide data or competitive information to any provider of any Competitive Product or Service" [FACT: Data Services Addendum §2; Terms of Use §3]. Scraping and automated collection are separately and explicitly banned [FACT: Terms of Use §3]. The API exists "**solely to allow Client to more efficiently download DCN Data for Client's internal use**" [FACT: API License Addendum].

The plain reading is that **BidIntelligenceOS cannot embed, resell, or re-expose Dodge data to its own contractor customers under any standard Dodge license.** Doing so would require a **custom-negotiated redistribution / OEM / partnership agreement** directly with Dodge — and Dodge's public materials give no indication such a tier is offered off the shelf. Because BidIntelligenceOS is arguably a "Competitive Product" to Dodge One (which itself now does AI search, bid-fit alerts, and relationship intelligence), Dodge may be structurally reluctant to grant redistribution rights to a would-be competitor.

**Recommendation: Cautiously evaluate — do not build against Dodge data yet.** Architect BidIntelligenceOS around (a) genuinely public/public-domain data (SAM.gov federal + state/local portals — the safest ingest) and (b) a **user-authorized "bring-your-own-subscription" import** model where the contractor, who holds their own Dodge license, works their own data inside the tool. Treat a direct licensed/OEM Dodge feed as a **partnership to be negotiated, not a technical integration to be built** — and only after Dodge's sales/partnership team confirms redistribution rights in writing. The detailed 30/60/90 plan and the exact questions to ask Dodge are in the Recommendations section.

---

## Background

BidIntelligenceOS is a proposed contractor-facing product to help owners, estimators, business-development leads, and operations leaders decide whether to bid, understand project risk, organize scope and cost assumptions, generate stronger bid packages, track follow-up, and learn from win/loss history. That workflow is data-hungry: it needs a feed of upcoming/active projects with stages and bid dates, the players involved (owner, architect, GC, subs), scope/spec detail, valuations, and market signal. There are essentially three ways to source that data: (1) license it from a commercial aggregator like Dodge or ConstructConnect, (2) pull it from public/government procurement systems, or (3) have each contractor bring data they already have rights to.

Dodge is the incumbent 800-pound gorilla — a ~100-year-old franchise (formerly F.W. Dodge / McGraw-Hill Construction / Dodge Data & Analytics) whose data has been the U.S. Census Bureau's official construction data source for 55+ years and feeds federal nonresidential construction-spend and GDP figures [FACT: construction.com/dodge-one]. Understanding what Dodge sells, what it will and won't let you do with the data, how competitors compare, and what's freely available is the core of the go/no-go decision this report supports.

---

## Key Findings

### Finding 1: Dodge's product suite covers the entire BidIntelligenceOS data wishlist

Dodge Construction Network operates **five branded solutions** — Dodge One, The Blue Book Network, Sweets, IMS, and Principia — plus an analytics/forecasting layer [FACT: construction.com/about, /all-products].

**Dodge One** is the flagship project-intelligence platform and the piece most relevant to BidIntelligenceOS. It tracks the **full lifecycle — pre-planning → design → bidding → construction/award** — often surfacing projects "months before any bid board" from first public filing or planning permit [FACT: construction.com/dodge-one]. Per-project data points include stage, valuation, project size, specifications, key contacts, bid dates, plan/bid documents, GC and sub activity, and awards. Vendor-reported coverage: 636,000+ projects tracked annually, 10M+ historical projects, 7,000+ "Dodge Reports" published daily, 500+ field specialists verifying data, 677,000+ firms, and 650,000+ contractors in the Blue Book network, drawn from 19,000+ web sources, 3,000 municipalities, and 25,000 news publications monitored daily [FACT, self-reported: construction.com/dodge-one]. It offers **AI Search Assist** (plain-language search), role-based **push alerts**, and **"buildSpec" alerts** that fire when your brand or a competitor appears in a spec — functionally a bid-fit / opportunity-discovery engine that overlaps heavily with what BidIntelligenceOS proposes.

**The Dodge Report** is the individual project record ("who, what, where, when, how much") containing address, Action Stage, Bid Date, Valuation, Target Start Date, owner type, and the companies involved (GC, architect, subs, PM) [FACT: construction.com help/glossary].

**BuildShare** (part of Dodge One) is the relationship-intelligence layer: most-active firms by building type/region, firm specialization, and explicit **owner↔architect↔contractor relationship mapping** with interaction frequency and change monitoring [FACT: construction.com/buildshare]. This directly addresses BidIntelligenceOS's "relationship intelligence" and "prospecting" use cases.

**The Blue Book Network** (now a Dodge property, not an independent competitor) provides contractor discovery + bid management via **OneTeam** (private invitations to bid across 560+ trade categories, plan room, Concierge distribution), **BidScope** (opportunity search), and **ProView** (company profiles) [FACT: construction.com/the-blue-book/oneteam]. **Sweets** is the product-specification database (CAD/BIM/spec files, CSI MasterFormat) [FACT: construction.com/sweets]. **IMS** provides public-sector project research with advance notice on RFPs/RFQs/SOQs across 35,000+ agencies [FACT: construction.com/ims]. **Principia** is building-materials market research/consulting (DemandBuilder®/SupplyBuilder®) [FACT: principiaconsulting.com].

The **analytics/forecasting layer** (Dodge Analytics / Advisory Services) offers a construction-starts database back to 1967, national→state→metro→county activity forecasts across 22+ building types with 5-year projections, MarketShare, product-demand forecasts, Building Stock Inventory, and the monthly **Dodge Momentum Index** leading indicator [FACT: construction.com/all-products]. This is the "market signal analysis" and "project valuation" fuel BidIntelligenceOS's risk/scoring features would want.

**Bottom line for Finding 1:** the data fit is excellent — arguably too good, in that Dodge One already ships several of BidIntelligenceOS's headline features (AI opportunity search, spec-fit alerts, relationship intel). Two important caveats: (1) all coverage numbers are vendor self-reported and unaudited, and some conflict across pages (e.g., 500+ vs 400+ field specialists; 636K vs 700K projects) [INFERENCE, flagged]; and (2) whether Dodge exposes actual **per-project bidder lists with bid amounts** (vs. firm-level activity) was not confirmable publicly [GAP].

### Finding 2: Dodge's standard licenses prohibit exactly what BidIntelligenceOS wants to do

This is the decisive finding, and it rests on Dodge's **own binding contract templates**, which we read directly.

**An API exists, but it is internal-use-only.** The DCN API (REST/HTTP2, OAuth 2.0, JSON) exposes Projects, Companies/Contacts, and Project Documents endpoints [FACT: construction.com/apis]. But the **API License Addendum (eff. Aug 12, 2025)** grants only a "non-exclusive, non-transferable, non-sublicenseable license … for the sole purpose of enabling Client's System to download DCN Data … solely for Client's internal purposes," and states the API exists "solely to allow Client to more efficiently download DCN Data for Client's internal use" [FACT]. All API rights "cease immediately upon the termination of the Client's SaaS License" [FACT]. The API License sits at the **bottom of the agreement hierarchy** (MSA → SaaS Addendum → Data Services Addendum → API License) and grants no data rights beyond the underlying license [FACT].

**Redistribution, resale, and derivative products for third parties are expressly banned.** The **Data Services Addendum §2** licenses data "solely for Your internal research, analytical, and business purposes" and states: "**Under no circumstances shall You offer DCN Data for sale to, or use by, third parties**"; "under no circumstances shall You market, advertise, promote, distribute, or sell … DCN Data, **or derivative works including DCN Data**, to third parties during or after the Term"; and "all derivative work created by Client from the Data shall be destroyed by You at the end of the Term" [FACT].

**Competitive use and third-party disclosure are separately banned.** **Terms of Use §3**: users "expressly agree not to … (i) disclose, publish, transfer, distribute or disseminate Proprietary Information to any third party; (ii) use Proprietary Information in any manner which competes with any products or services of DCN or its affiliates; or (iii) use Proprietary Information to provide data or competitive information to any provider of any Competitive Product or Service" [FACT].

**Scraping and automated access are explicitly prohibited.** Terms of Use §3 bars any "deep-link, scraper, robot, bot, spider, data mining, computer code or any other automated device … to access, acquire, copy, or monitor any portion of the Sites without prior express written consent of DCN," plus manual bulk collection and imposing disproportionate load [FACT].

**AI training is not named verbatim, but is functionally constrained.** No fetched clause explicitly says "AI training." The marketing page even invites building "internal AI agents and custom models" — but only **on the client's own systems** [FACT: construction.com/apis]. The bans on redistribution, third-party derivative works, and competitive use would, on their face, prohibit using DCN data to train a model that powers a competing or third-party-facing product [INFERENCE — confirm with counsel].

**Exports and CRM integrations exist — but only into the client's own internal systems.** Dodge markets connectors to Salesforce, Dynamics 365, SAP, and "any REST-compatible system," plus a managed "Dodge PipeLine" CRM product [FACT: construction.com/apis]. Dodge One also allows export of up to 10,000 records at a time and pushing verified contacts into a CRM [FACT: construction.com/dodge-one]. Crucially, all of this is framed as moving data **into the licensee's own internal stack**, not into a product the licensee then sells to others. The batch Data Services product is delivered as **Excel pivot tables** — clearly designed for internal analysis, not real-time platform embedding [FACT: Data Services Addendum].

**What this means for BidIntelligenceOS.** A SaaS that ingests Dodge data and re-exposes it to its own contractor customers collides with all three pillars at once: internal-use-only, no sale/distribution of data or derivative works to third parties, and no competitive/third-party-supply use. **Standard API/SaaS/Data licenses do not permit this.** It would require, at minimum, a **custom-negotiated redistribution / OEM / partnership agreement** with DCN. The public documents give **no indication** such a tier exists off the shelf; obtaining it (if possible at all) requires a direct partnership conversation [FACT + INFERENCE]. **Open items:** the precise contractual definition of "Competitive Product or Service" (Appendix A to the MSA was not public) and confirmation of whether any redistribution/OEM tier is even offered [GAP].

### Finding 3: Competitors have the same data-rights posture — no one offers off-the-shelf redistribution

If Dodge's terms are the blocker, the natural question is whether a competitor is more permissive. The short answer: **no competitor publishes redistribution-friendly terms either** — all treat project data as proprietary licensed content sold on a contact-sales basis [FACT + INFERENCE across vendor sites].

**ConstructConnect** (Cincinnati; consolidated iSqFt, CMD, BidClerk, SmartBid, On-Screen Takeoff, PlanSwift) is Dodge's closest rival, with ~500K–1.4M active US/Canada projects, 400+ researchers, bidder/planholder lists, addenda, specs, plus integrated AI takeoff and bid management [FACT: constructconnect.com]. Pricing is more transparent than Dodge — Starter ~$129/mo, Professional ~$179–$199/mo, bid management ~$3,600/yr, higher tiers into five figures [FACT, secondary: constructionbids.ai]. It offers Salesforce/Excel/SmartBid integrations but **no public REST API**; enterprise data feeds are negotiated directly [FACT]. One independent (though ConstructConnect-adjacent) source estimates only ~62% listing overlap with Dodge — implying each platform carries ~38% unique projects, so no single source is complete [ASSUMPTION — unverified secondary claim].

**Autodesk BuildingConnected** (1.5M+ network) is best-in-class for the GC→sub bid *workflow* (Bid Board Pro, ITB management, bid leveling, prequalification) and is the only competitor that explicitly cites **webhooks/API access** in a paid tier — but it is **not a project-discovery/lead tool**: projects appear only when a GC uploads them [FACT: construction.com buyer's guide; Autodesk]. **PlanHub** (500K+ network, ~3,000 new commercial projects/month) is a cheaper option for small–mid firms (free for GCs; subs ~$1,999–$4,369/yr) with no public API [FACT: planhub.com]. **BidClerk** is now a ConstructConnect property [FACT]. **The Blue Book** is now a Dodge property, so it is not an independent alternative [FACT].

**Cross-cutting takeaways:** (1) None of the majors systematically cover public/government bids across the ~3,800 procurement portals, and sub-$500K municipal work is thinly covered — a genuine white-space [ASSUMPTION, secondary]. (2) None publish redistribution/OEM terms; anyone building a downstream product must negotiate directly and should expect the same internal-use posture as Dodge [INFERENCE]. (3) ConstructConnect is the most credible **alternative or secondary licensed source** if a partnership with Dodge fails, and its published pricing makes it easier to model unit economics.

### Finding 4: Public/government data is the only genuinely license-safe ingest — but it misses private/commercial work

The safest data BidIntelligenceOS can build on is **public-domain government procurement data**, anchored by **SAM.gov**. Browsing federal opportunities and registering are free; the **Get Opportunities Public API** (v2) is free with an API key, subject to role-based rate limits (~10/day with no role, 1,000/day for non-federal accounts with a role, 10,000/day for federal), with mandatory date ranges capped at one year per query [FACT: open.gsa.gov/api]. It returns structured fields (title, solicitation/notice ID, procurement type, NAICS, PSC, set-aside, place of performance, posted date, response deadline, agency hierarchy, award, POC), though it lacks full-text search [FACT]. A **daily bulk CSV** extract is also available without a key or rate limits [FACT, with one unverified endpoint detail — GAP]. Companion free federal APIs (USASpending.gov, FPDS, Entity/Exclusions, PSC/NAICS) round out the federal picture [FACT: open.gsa.gov/api]. Because these are U.S. federal government works, the opportunity data is **public-domain factual data** — the single most defensible thing to ingest [FACT/INFERENCE].

**State and local** procurement is also free but **highly fragmented** across hundreds of portals (state DOT "lettings," city/county bid boards, school districts, utilities), some on shared platforms like BidExpress, OpenGov Procurement, and BidNet Direct [FACT]. Many let you view but require agency registration to bid or download documents. There is **no single free federated source**, so covering even two states means monitoring many portals — a real ingestion-engineering cost [FACT].

**Legality:** aggregating government procurement data is one of the most defensible aggregation use cases — the data is government-generated, factual, largely non-personal, and often exposed via official APIs (which removes scraping risk entirely). U.S. case law (*hiQ v. LinkedIn*, 9th Cir.) holds that scraping publicly accessible data without bypassing auth barriers doesn't automatically violate the CFAA; risk rises when you bypass logins/CAPTCHAs, ignore robots.txt/ToS, scrape PII, hammer servers, or **resell raw scraped data without transformation** (the biggest litigation driver, per OECD). The EU is stricter (Database Directive) but that's less relevant for U.S.-focused work [INFERENCE/synthesis — not legal advice].

**The catch:** public sources cover **government projects only.** The private/commercial project leads that are BidIntelligenceOS's core market — the Dodge/ConstructConnect space — have **no free or public source** and require licensed data. This is precisely why Dodge has pricing power, and why a public-only product would address a different (government-bidding) segment than the private/commercial one implied by the product brief [FACT + INFERENCE].

### Finding 5: The value-add is the workflow, not the raw data — which points to a data-light or BYO-data model

The bid/no-bid decision is a structured evaluation of whether a project is worth an estimator's time, weighing profitability, fit, risk, and win probability across six factors: client/owner quality, project fit, resource capacity, competitive position, profit potential, and market/economy [FACT: industry go/no-go guides]. The economics are real: a trade contractor running ~15 bids/month can spend $50,000+/month on bid prep, and healthy bid-to-win ratios sit around 5:1 (hard-bid) to 3:1 (negotiated) [FACT, secondary]. Owner financial capability, project risk, profit potential, and number of competitors are repeatedly cited as the top signals — which is exactly the intelligence Dodge/BuildShare and BidIntelligenceOS both aim to provide.

The AI tooling landscape is crowded and maturing fast: AI adoption among top-100 GCs passed 60% in 2025, with estimating accuracy benchmarks crossing ~95% [ASSUMPTION, secondary market figures]. The stack now spans plan/scope parsing (Togal.AI, Kreo, STACK AI Assist, Beam AI), takeoff/cost modeling, bid-strategy/win-loss intelligence, and contractor-specific AI CRM/pipeline tools [FACT/ASSUMPTION, secondary]. Notably, **SME adoption remains low (8–12% for estimating)** — a genuine runway [ASSUMPTION, secondary].

The strategic implication is important: **BidIntelligenceOS's defensible value is the decision workflow — scoring, risk analysis, scope organization, bid-package generation, follow-up, and win/loss learning — not the raw project feed.** That is good news, because it means the product does not have to *own* Dodge's data to be valuable. It can (a) run on the contractor's *own* pipeline and history, (b) enrich with public data, and (c) let the contractor pull in projects from their *own* Dodge/ConstructConnect subscription. This reframes the Dodge relationship from "critical dependency" to "optional enrichment," which materially de-risks the whole product [INFERENCE].

---

## Analysis

Three patterns emerge when the findings are read together.

**First, the data-rights wall is industry-wide, not Dodge-specific.** Dodge's internal-use-only, no-redistribution, no-competitive-use posture is echoed (implicitly) by ConstructConnect, PlanHub, and BuildingConnected — none publish redistribution-friendly terms, and all sell via contact-sales. So "just switch to a competitor" does not solve the licensing problem; it reproduces it. The only structurally different sources are (a) public/government data (license-safe but government-only) and (b) the contractor's own data. Any BidIntelligenceOS architecture that assumes it can license a commercial feed and re-serve it to customers is, absent a bespoke partnership, building on sand.

**Second, Dodge is simultaneously the best partner and the most dangerous one.** Dodge One has spent the last two years absorbing AI search, spec-fit alerts, and relationship intelligence — the very features BidIntelligenceOS lists. That makes BidIntelligenceOS a plausible "Competitive Product or Service" under Dodge's Terms of Use, which is exactly the category Dodge's contracts are written to exclude. A contractor-facing bid-intelligence layer that sits *on top of* Dodge risks being seen by Dodge not as a channel but as a threat. This raises the odds that a redistribution/OEM request is declined or priced punitively, and it argues for approaching Dodge as a potential *partner/reseller* (aligned incentives — Dodge sells more seats) rather than a *raw-data supplier* (misaligned — you become a competitor with their data).

**Third, the safest and fastest path decouples the product from the data-rights problem entirely.** If the wedge is the *workflow* (bid/no-bid scoring, risk, scope, follow-up, win/loss), then the v1 can launch on public data + the contractor's own data + manual/user-authorized import — none of which requires a Dodge license. This lets CCA validate demand, build the scoring IP, and accumulate proprietary win/loss data *before* committing to an expensive, legally-fraught data relationship. A licensed Dodge/ConstructConnect feed then becomes a premium enrichment tier you add once (and if) a partnership is signed — not a launch blocker. The BYO-subscription model is especially elegant: the contractor already holds the Dodge license and its internal-use rights, and BidIntelligenceOS acts as a tool the contractor uses on their *own* licensed data. Whether that arrangement is clean under Dodge's terms (does a third-party tool processing the client's licensed data count as "disclosure to a third party"?) still needs Dodge/legal confirmation — but it is far more defensible than embedding a shared Dodge feed [INFERENCE — confirm].

---

## Limitations

Several important items could not be confirmed from public sources and must be verified before any commitment: (1) whether Dodge offers **any** redistribution/OEM/reseller license tier at all — the public templates cover only internal use; (2) the exact contractual **definition of "Competitive Product or Service"** (MSA Appendix A was not retrievable), which determines whether BidIntelligenceOS is even eligible to license; (3) all **pricing** (Dodge, ConstructConnect enterprise, data feeds) lives in non-public order forms/SOWs; (4) whether a **user-authorized BYO-subscription** tool violates Dodge's third-party-disclosure clause; (5) the exact **SAM.gov bulk-CSV endpoint** and SAM.gov's formal Terms of Use/data-rights statement; and (6) **state/local coverage** — how many jurisdictions offer machine-readable feeds vs. HTML-only. All vendor coverage metrics are self-reported and unaudited, and some conflict across pages. The legal framing here is a synthesis, **not legal advice** — a construction-tech/IP attorney must review Dodge's actual signed terms and any scraping/aggregation plan for public data.

---

## Recommendations

**Overall verdict: Cautiously evaluate. Do not build BidIntelligenceOS on top of embedded Dodge data under standard terms — treat a Dodge feed as a partnership to negotiate, and architect v1 to not depend on it.**

**Architecture recommendation (safest → most valuable):**
1. **Build the workflow layer first** (bid/no-bid scoring, risk, scope organization, bid-package generation, follow-up, win/loss) on the **contractor's own pipeline + history**. This is your defensible IP and needs no external license.
2. **Enrich with public data** — SAM.gov (federal, public-domain, free API/CSV) plus a phased set of state/local portals, preferring official APIs/OCDS feeds over scraping. This covers government bidding cleanly.
3. **Offer user-authorized "bring-your-own-subscription" import** — let contractors who already hold a Dodge/ConstructConnect license bring their own project data into the tool (pending confirmation this is clean under Dodge's terms).
4. **Pursue a licensed/OEM Dodge (or ConstructConnect) feed only as a premium tier**, and only after written confirmation of redistribution rights. Do **not** scrape Dodge, and do **not** assume internal-use licenses permit re-serving data.

**30/60/90-day validation plan for CCA:**

- **Days 0–30 (validate + de-risk legally):** Interview 8–12 target contractors to confirm the bid/no-bid workflow is the pain worth paying for (not the raw feed). Stand up a working prototype on **SAM.gov public data + a manual/CSV import of a contractor's own Dodge report**. Engage a construction-tech/IP attorney to read Dodge's MSA/Addenda/Terms of Use (especially the "Competitive Product or Service" definition) and opine on the BYO-import model. **Do not** ingest any Dodge data programmatically yet.
- **Days 31–60 (probe the partnership):** Request a Dodge sales/partnership demo and ask the pointed questions below. In parallel, get a ConstructConnect quote and data-feed terms as a comparison/fallback. Test the **first real use case** — bid/no-bid scoring on public + BYO data — with 2–3 pilot contractors. Keep anything touching licensed Dodge data **manual/user-authorized** until rights are confirmed in writing.
- **Days 61–90 (decide):** Based on Dodge's/ConstructConnect's answers on redistribution rights and pricing, choose one of three paths: (a) **public + BYO only** (ship it — lowest risk), (b) **licensed enrichment tier** (only if a partnership/OEM agreement is offered and priced viably), or (c) **reseller/channel partnership** with Dodge (aligned-incentive model where BidIntelligenceOS drives Dodge seats). Do **not** build any feature that embeds or redistributes licensed data until a signed agreement explicitly permits it.

**Exact questions to ask Dodge's sales/partnership team:**
- Do you offer any **redistribution, OEM, "powered-by-Dodge," or reseller license** — or is all data strictly internal-use-only?
- Would a **contractor-facing bid-intelligence SaaS** be classified as a "Competitive Product or Service" under your Terms of Use? Can you share the definition?
- Can a licensed customer use a **third-party tool** (BidIntelligenceOS) to work their own licensed data, or does that count as third-party disclosure?
- What are the **API rate limits, refresh cadence, schema, and historical vs. real-time** access, and the **pricing** for API/data-feed access?
- Do you offer a **partnership/channel program** where an external tool drives Dodge subscriptions?
- Are there any **AI/ML training** rights or restrictions in current SOW language?

**What must stay manual / must not be built until rights are confirmed:** any programmatic ingest of Dodge data; any feature that displays Dodge-sourced projects to a BidIntelligenceOS customer other than the licensee; any model trained on Dodge data that powers customer-facing output; and any scraping of construction.com. Keep these manual/user-authorized (contractor pastes/uploads their own report) until a signed agreement says otherwise.

**Why "cautiously evaluate" and not "avoid":** the underlying opportunity is real (bid-prep is expensive, SME AI adoption is low, the workflow is defensible), and Dodge *could* be a strong channel partner if incentives align. But the standard licenses flatly prohibit the obvious integration, so the responsible path is to build value without Dodge first, confirm rights through a real partnership conversation, and add licensed data only as a negotiated premium layer.

---

## Sources

1. DCN API License Addendum (eff. Aug 12, 2025) — https://www.construction.com/wp-content/uploads/2026/06/DCN_API-License_Addendum_20250812-FINAL.pdf (Primary/binding contract, Tier 1)
2. DCN Data Services Addendum (2023-07-25) — https://www.construction.com/wp-content/uploads/2026/06/Data-_Services_Addendum_20230725.pdf (Primary/binding, Tier 1)
3. DCN Software-as-a-Service (SaaS) Addendum (2023-07-25) — https://www.construction.com/wp-content/uploads/2026/06/SaaS_Addendum_20230725.pdf (Primary/binding, Tier 1)
4. DCN Master Services Agreement / Terms & Conditions (eff. Nov 1, 2023) — https://www.construction.com/terms-conditions/ (Primary/binding, Tier 1)
5. DCN Terms of Use (updated May 24, 2023) — https://www.construction.com/terms-of-use/ (Primary/binding, Tier 1)
6. Dodge API product/capabilities page — https://www.construction.com/apis/ (First-party marketing, Tier 2)
7. Dodge One product page — https://www.construction.com/dodge-one/ (First-party, Tier 2)
8. Dodge All Products — https://www.construction.com/all-products/ (First-party, Tier 2)
9. About Dodge Construction Network — https://www.construction.com/about/ (First-party, Tier 2)
10. OneTeam (The Blue Book Network) — https://www.construction.com/the-blue-book/oneteam/ (First-party, Tier 2)
11. BuildShare — https://www.construction.com/buildshare/ (First-party, Tier 2)
12. Sweets — https://www.construction.com/sweets/ (First-party, Tier 2)
13. IMS — https://www.construction.com/ims/ (First-party, Tier 2)
14. The Dodge Report (help/glossary) — https://www.construction.com/help/dcc/thedodgereport.aspx (First-party, Tier 2)
15. Principia Consulting — https://www.principiaconsulting.com/about-us/ (First-party, Tier 2)
16. Dodge acquires IMS (press release, Oct 2018) — https://www.construction.com/reports/dodge-data-analytics-acquires-integrated-marketing-systems-ims-oct-2018/ (Tier 2)
17. SAM.gov Get Opportunities Public API — https://open.gsa.gov/api/get-opportunities-public-api/ (Official govt docs, Tier 1)
18. GSA API Directory — https://open.gsa.gov/api/ (Official govt docs, Tier 1)
19. USASpending.gov API — https://api.usaspending.gov (Official govt, Tier 1)
20. SAM.gov CSV/API guide — GovTrove — https://govtrove.com/blog/sam-gov-data-services-csv-api-explained.html (Third-party, Tier 3)
21. SAM.gov API Complete Guide (2026) — GovCon API — https://govconapi.com/sam-gov-api-complete-guide (Third-party, Tier 3)
22. GovBidPortals directory of state/federal portals — https://www.govbidportals.com/ (Third-party, Tier 3)
23. Mass.gov Bidding Opportunities (COMMBUYS) — https://www.mass.gov/info-details/bidding-opportunities (Official state, Tier 1)
24. PA DGS eMarketplace — https://www.pa.gov/agencies/dgs/submit-proposals-and-bids-for-commonwealth-projects (Official state, Tier 1)
25. ConstructConnect Project Intelligence & Pricing — https://www.constructconnect.com/products/project-intelligence , https://www.constructconnect.com/pricing (First-party, Tier 2)
26. Dodge vs ConstructConnect comparison (pricing, 62% overlap) — https://constructionbids.ai/blog/dodge-vs-constructconnect-comparison (Competitor blog, Tier 3)
27. Dodge "7 Best Construction Bid Platforms in 2026" (updated Mar 2026) — https://www.construction.com/the-7-best-construction-bid-platforms-in-2026/ (Vendor-biased, Tier 3)
28. PlanHub subcontractor pricing/features — https://planhub.com/subcontractors/ , https://planhub.com/pricing-subcontractors/ (First-party, Tier 2)
29. BidClerk pricing & data-provider profile — https://constructionbids.ai/blog/bidclerk-pricing-reviews-2026 , https://datarade.ai/data-providers/bidclerk/profile (Tier 3)
30. The Blue Book Network BidScope — https://www.thebluebook.com/products/bidscope/ (First-party, Tier 2)
