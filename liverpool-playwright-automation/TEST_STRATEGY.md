# Test Strategy — Liverpool E-commerce Automation

## 1. What I would not automate

I would not automate CAPTCHA solving, payment authorization, real purchases, third-party identity flows, or highly visual/subjective UX checks as part of the main regression suite. These areas are either intentionally hostile to automation, create security/compliance risk, or have a poor maintenance/ROI profile. I would keep a small set of manual/exploratory checks around them.

## 2. CAPTCHA

The automated suite would not attempt to bypass CAPTCHA. In CI, CAPTCHA should be disabled in a controlled test environment or replaced by a test hook/allow-list agreed with the product team. If the real production site is the only environment available, the test would detect the CAPTCHA and fail with a clear diagnostic rather than trying to circumvent it. A manual smoke check can cover the real CAPTCHA integration.

## 3. Flakiness risks and mitigations

Main risks are dynamic rendering, asynchronous API responses, changing DOM structure, filters/sort controls changing implementation, network latency, A/B experiments and changing catalog data.

Mitigations:
- Prefer user-facing locators over CSS/XPath tied to implementation.
- Use condition-based Playwright waits instead of fixed sleeps where possible.
- Keep timeouts centralized in Playwright config.
- Capture trace/video/screenshots on failure.
- Intercept and parse service responses instead of depending only on rendered text.
- Validate at least 3/5 UI products against the network because the catalog is dynamic.
- Avoid asserting hard-coded product names/prices that can legitimately change.
- Use retries only in CI as a last line of defense; do not use retries to hide product defects.

## 4. Scaling to 50+ suites in CI

I would split the suite into smoke, critical regression and full regression projects/tags, run independent tests in parallel, and shard across CI runners. I would publish HTML/Allure reports and traces only when useful to control artifact size. I would also introduce API-level setup/data preparation where possible, reserve UI automation for critical user journeys, and quarantine flaky tests with an owner and expiry date rather than allowing them to silently reduce pipeline confidence.
