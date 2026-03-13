---
name: tdd
description: >
  Test-Driven Development workflow for building features. Use when the user asks to
  build a feature using TDD, write tests first, red-green-refactor, or says
  "test first", "failing test", "TDD", or wants to develop with a test-driven approach.
  Guides Claude through the red-green-refactor cycle: write a failing test, make it pass
  with minimal code, then refactor.
---

# TDD Workflow

Implement features using the Red-Green-Refactor cycle. Every piece of functionality
starts with a failing test.

## Cycle

### 1. Red — Write a Failing Test

- Identify the smallest unit of behavior to implement next.
- Write ONE test that describes that behavior. Keep it focused and descriptive.
- Run the test and confirm it **fails**. Show the failure output to the user.
- If it passes unexpectedly, the behavior already exists — pick a different behavior or
  refine the test to be more specific.

### 2. Green — Make It Pass

- Write the **minimum** code required to make the failing test pass. No more.
- Resist the urge to implement ahead of the test. Only satisfy the current test.
- Run the test and confirm it **passes**. Show the output.
- If other tests broke, fix the implementation (not the tests) until all tests pass.

### 3. Refactor — Clean Up

- With all tests green, improve code quality: remove duplication, rename for clarity,
  extract helpers if warranted.
- Run all related tests after each refactor to confirm nothing broke.
- Do NOT add new behavior during refactor — that requires a new Red step.

### 4. Repeat

- Pick the next smallest behavior and return to step 1.
- After completing a logical group of behaviors, run the full test suite.

## Rules

- **Never skip Red.** Every new behavior starts with a failing test.
- **One behavior per cycle.** Don't test multiple things at once.
- **Run tests constantly.** After every change — test write, implementation, or refactor.
- **Show test output.** Always show the user the test run results (pass or fail).
- **Minimal Green.** Write only enough code to pass. Hardcoding is acceptable in Green
  if a subsequent test will force generalization.
- **Tests are first-class.** Apply the same code quality standards to test code.

## Project-Specific Details

This project uses **Vitest** as the test framework across a pnpm monorepo:

- Run all tests: `pnpm test`
- Run web tests: `pnpm --filter @ledgr/web test`
- Run API tests: `pnpm --filter @ledgr/api test`
- Run a single test file: `pnpm --filter <package> exec vitest run <path>`
- Test file convention: `*.test.ts` / `*.test.tsx` colocated with source

**Web tests** use `@testing-library/react`, `jsdom`, and `vitest`.
**API tests** use `vitest` with `Effect.runPromise()` for Effect-based code and `vi.mock()`.

## Getting Started Prompt

When the user describes a feature, begin by:

1. Breaking the feature into a list of discrete behaviors (ordered simple → complex).
2. Presenting the list to the user for confirmation before starting.
3. Starting the first Red-Green-Refactor cycle with the simplest behavior.
