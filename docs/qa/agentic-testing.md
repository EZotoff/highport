# Agentic Manual Testing Protocol

Agentic testing means an AI agent interactively explores the application through browser automation. It executes scenarios that go beyond hardcoded assertions and checks the application as a user experiences it.

## Why Agentic Testing Is Required

1. **Hardcoded tests have blind spots.** They only test what developers anticipated.
2. **Visual bugs escape assertions.** An assertion that a button is visible can pass even when the button is clipped.
3. **Integration behavior emerges across systems.** Frontend, backend, sync, and database interactions can produce unexpected results.
4. **Edge cases multiply.** Five features with ten states each create fifty combinations to explore.

## Agentic Testing Execution

1. Read the acceptance scenarios and edge cases from the task definition.
2. For each scenario, set up the required preconditions from its `GIVEN` clauses.
3. Execute each action from the `WHEN` clauses through browser automation, waiting for the application to settle after each action.
4. Verify every expectation from the `THEN` clauses.
5. If an expectation fails, capture a `FAIL-{scenario-name}.png` screenshot, collect console errors, and report the failed expectation with its error.
6. If the scenario passes, capture a `PASS-{scenario-name}.png` screenshot.
7. Explore every listed edge case and document the observed behavior.

For the task template and examples, see the [Acceptance Scenario Format](file:///home/ezotoff/AI_projects/traveller/docs/qa/acceptance-scenarios.md).

## Evidence Requirements

All agentic testing MUST produce evidence:

```
.sisyphus/evidence/{task-id}/
├── PASS-scenario-1.png      # Screenshot after successful scenario
├── PASS-scenario-2.png
├── interaction-log.md       # Actions taken, outcomes observed
├── console-errors.txt       # Any console errors (should be empty)
└── report.md                # Summary: scenarios passed/failed, edge cases found
```
