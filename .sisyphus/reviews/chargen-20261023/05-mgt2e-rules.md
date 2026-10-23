# Lane 05-mgt2e-rules (deep, openai/gpt-6.1-sol, bg_4394f309, 3m6s)

lane: 05-mgt2e-rules
resolved_model: "openai/gpt-6.1-sol"
findings:

- id: F05-1
  severity: MAJOR
  claim: "Aging is inverted: nonpositive totals cause no loss, positive totals cause loss; an unsupported END DM is added"
  receipt: "packages/mgt2e/src/tables/aging.ts:25-74"
  verification_status: INSPECTED
  impact: "Older characters become immune while younger characters lose stats; severe aging outcomes absent"
  confidence: HIGH
  fix_sketch: "Implement CRB nonpositive-result table and term-only penalty"
- id: F05-2
  severity: MAJOR
  claim: "Career events stored but effects/choices never resolved; confirmEvent only advances phase"
  receipt: "apps/web/components/chargen/steps/TermResolutionStep.tsx:300-324; packages/mgt2e/src/data/srd/careers/navy.ts:239-244"
  verification_status: INSPECTED
  impact: "Guaranteed promotions, event skills, benefit bonuses and Life Events silently disappear"
  confidence: HIGH
  fix_sketch: "Resolve typed effects and choices before allowing continuation"
- id: F05-3
  severity: MAJOR
  claim: "Entering a career grants no basic training; successful advancement grants no additional training-table roll"
  receipt: "apps/web/components/chargen/steps/CareerSelectionStep.tsx:75-103; apps/web/components/chargen/steps/TermResolutionStep.tsx:454-482"
  verification_status: INSPECTED
  impact: "Characters systematically lack mandatory service skills and advancement training"
  confidence: HIGH
  fix_sketch: "Grant first-career level-0 training and advancement training separately from rank awards"
- id: F05-4
  severity: MAJOR
  claim: "Training ignores specialty and treats choice expressions as literal skill IDs"
  receipt: "apps/web/components/chargen/steps/TermResolutionStep.tsx:381-405; packages/mgt2e/src/data/srd/careers/army.ts:25; navy.ts:58"
  verification_status: INSPECTED
  impact: "Produces invalid skills such as drive|flyer; loses Pilot (small craft)"
  confidence: HIGH
  fix_sketch: "Resolve alternatives, preserve entry.specialty, validate against public skill definitions"
- id: F05-5
  severity: MAJOR
  claim: "Benefit-roll allocation adds rank directly and counts failed-survival terms"
  receipt: "apps/web/lib/chargen/mustering.ts:11-20"
  verification_status: INSPECTED
  impact: "Rank 6 receives seven bonus rolls instead of three; mishap terms receive unearned benefits"
  confidence: HIGH
  fix_sketch: "Use rank bands and eligible completed terms with explicit mishap exceptions"
- id: F05-6
  severity: MAJOR
  claim: "Benefit rolls always use modifier zero, even at rank 5+"
  receipt: "apps/web/lib/chargen/mustering.ts:57-58; packages/mgt2e/src/tables/benefits.ts:28-34"
  verification_status: INSPECTED
  impact: "High-rank material-benefit DM missing; seventh-row benefits unreachable"
  confidence: HIGH
  fix_sketch: "Apply the rank-based benefit DM rather than only alternate text"
- id: F05-7
  severity: MAJOR
  claim: "Characteristic mustering benefits stored as strings without changing characteristics"
  receipt: "apps/web/components/chargen/steps/MusteringOutStep.tsx:123-127; apps/web/lib/chargen/finalize.ts:43-51"
  verification_status: INSPECTED
  impact: "+1 INT benefit leaves finalized INT unchanged"
  confidence: HIGH
  fix_sketch: "Resolve benefit mechanics atomically while retaining an award record"
- id: F05-8
  severity: MAJOR
  claim: "Ungated browser QA globals rewrite targeted dice totals without changing recorded individual dice"
  receipt: "packages/mgt2e/src/tables/dice.ts:47-61"
  verification_status: INSPECTED
  impact: "Production rolls can be forced and internally inconsistent; dice records not trustworthy audit evidence"
  confidence: HIGH
  fix_sketch: "Remove production overrides; inject deterministic RNG only through test infrastructure"
