T2 verification

- Package tests exit 0 (24 before moving browser-global assertion into web jsdom).
- Package build and web typecheck exit 0; web full suite 289/289 before assertion move.
- Browser tests cover production gate, disabled env gate, no bridge, forced success/failure, failure precedence, untargeted dice unaffected.
- No consumers in Foundry or e2e; only documented shell scripts/charters relied on globals.
- Browser assertion lives in web jsdom rather than package tests to enforce zero banned global references anywhere in packages/mgt2e.
- Wizard uses compile-time production guard around dynamic bridge import; bridge also gates installation. Package interceptor is inert by default and environment-agnostic.
- LSP: new files clean except import-order information; existing dice seed assignment and wizard scroll-effect dependency lint findings unchanged.
- No services or final-wave tasks run.
