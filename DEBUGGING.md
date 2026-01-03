# Debugging Guide

## How to Use This Document

This document provides debugging strategies for working with Svelte 5, Vitest, and TypeScript. When encountering issues:

1. **Identify the error category** - Use the table of contents below to find relevant sections
2. **Follow the diagnostic steps** - Each section provides systematic approaches to isolate the problem
3. **Check the common causes** - Most issues fall into predictable patterns
4. **Consult official docs** - Links to relevant documentation are provided

---

## Table of Contents

1. [Svelte 5 Runes Issues](#svelte-5-runes-issues)
2. [TypeScript Type Errors](#typescript-type-errors)
3. [Testing Issues](#testing-issues)
4. [Performance Issues](#performance-issues)
5. [Build and Configuration Issues](#build-and-configuration-issues)
6. [State Management Issues](#state-management-issues)

---

## Svelte 5 Runes Issues

### Infinite Loop / Maximum Update Depth Exceeded

**Symptoms:**
- Error: `effect_update_depth_exceeded`
- Browser freezes or crashes
- Console shows repeated state updates

**Diagnostic Steps:**
1. Check for `$effect` blocks that both read and write the same state
2. Look for circular dependencies between `$derived` values
3. Search for effects that modify props or parent state

**Strategy:**
- Track previous values to skip unnecessary updates
- Use guards to prevent re-entry
- Consider if the effect is the right tool (maybe use `$derived` instead)

**Docs:** https://svelte.dev/docs/svelte/$effect

### "state_referenced_locally" Warning

**Symptoms:**
- Warning: "This reference only captures the initial value"

**Diagnostic Steps:**
1. Check where reactive values are passed to non-reactive contexts
2. Identify if the warning is expected behavior vs a bug

**When to Ignore:**
- When intentionally capturing initial values for one-time setup

**When to Fix:**
- When the value should update reactively but doesn't

**Strategy:**
- Use getters for reactive object properties
- Move setup code to the appropriate lifecycle point

**Docs:** https://svelte.dev/e/state_referenced_locally

---

## TypeScript Type Errors

### Generic Type Inference Issues

**Symptoms:**
- Type parameter not inferred correctly
- "Type X is not assignable to type Y"

**Diagnostic Steps:**
1. Check if generics are being passed through multiple layers
2. Verify the type parameter is correctly constrained
3. Look for `any` leaking into type inference

**Strategy:**
- Provide explicit type parameters when inference fails
- Use `as const` for literal types
- Create type guards for complex conditionals

### Third-Party Library Type Mismatches

**Symptoms:**
- Types work at runtime but fail type checking
- Error mentions properties that should be optional

**Diagnostic Steps:**
1. Check the library's version and its type definitions
2. Verify tsconfig settings match library expectations
3. Look for known issues in the library's GitHub

**Strategy:**
- Create separate tsconfig for different contexts (main vs tests)
- Use module augmentation to extend/override types
- Add `@ts-expect-error` with explanation as last resort

---

## Testing Issues

### Svelte 5 Components Not Rendering in jsdom

**Symptoms:**
- Tests fail with cryptic errors about effects or state
- Component renders in browser but not in tests

**Diagnosis:**
- jsdom doesn't fully support Svelte 5 runes

**Strategy:**
- Use Vitest browser mode for component tests
- Keep unit tests (non-component) in node environment
- Name files differently for different test environments

**Docs:** https://vitest.dev/guide/browser/

### Browser Tests Need Headless Mode

**Symptoms:**
- Error: "Missing X server or $DISPLAY"
- Tests fail in CI but pass locally

**Strategy:**
- Enable headless mode in browser configuration
- Ensure CI environment has required dependencies
- Use `xvfb-run` if headless mode isn't sufficient

### Test Isolation Issues

**Symptoms:**
- Tests pass individually but fail together
- State leaks between tests

**Strategy:**
- Use `afterEach` to cleanup components
- Avoid global state in modules
- Reset singletons between tests

---

## Performance Issues

### Slow Renders with Large Data

**Diagnostic Steps:**
1. Run benchmarks to establish baseline
2. Profile with browser DevTools Performance tab
3. Check if virtualization is working (only visible items should render)

**Strategy:**
- Implement virtual scrolling for large lists
- Use `$derived.by` for expensive computations
- Debounce rapid updates

**Docs:** https://svelte.dev/docs/svelte/$derived

### Memory Leaks

**Diagnostic Steps:**
1. Check Chrome DevTools Memory tab
2. Look for growing object counts over time
3. Verify cleanup functions in effects

**Strategy:**
- Return cleanup functions from `$effect`
- Disconnect observers and remove event listeners
- Use WeakMap/WeakSet for caches

---

## Build and Configuration Issues

### Version Mismatches

**Symptoms:**
- npm install fails with peer dependency errors
- Runtime errors about missing functions

**Diagnostic Steps:**
1. Check package.json for version constraints
2. Run `npm ls <package>` to see installed versions
3. Verify related packages have matching major versions

**Strategy:**
- Keep @vitest/* packages at same version
- Check changelogs when upgrading major versions
- Use `npm outdated` to identify stale dependencies

### Vite/Vitest Configuration Conflicts

**Symptoms:**
- Build works but tests fail
- Type errors in config files

**Strategy:**
- Understand how configs are merged/extended
- Use `projects` for different test environments
- Keep plugin configurations consistent

---

## State Management Issues

### Context Not Available

**Symptoms:**
- Context returns undefined
- Works in one component but not another

**Diagnostic Steps:**
1. Verify `setContext` is called before child components render
2. Check context key matches between set and get
3. Ensure context is set in parent, not sibling

**Strategy:**
- setContext must be synchronous (not in $effect)
- Use typed context keys for consistency
- Add validation when getting context

**Docs:** https://svelte.dev/docs/svelte/context

### Props Not Updating

**Symptoms:**
- Parent changes props but child doesn't re-render
- Initial value works but updates don't

**Diagnostic Steps:**
1. Check if prop was captured as initial value
2. Verify parent is actually changing (add console.log)
3. Check for reference equality issues with objects/arrays

**Strategy:**
- Use `$effect` to react to prop changes when needed
- Avoid capturing props in closures
- Consider using `$derived` instead of manual sync

---

## Quick Reference

| Issue | First Check | Likely Cause |
|-------|------------|--------------|
| Infinite loop | `$effect` dependencies | Reading + writing same state |
| Type error in tests | Separate tsconfigs | Different type contexts |
| Component not rendering | Environment | jsdom limitations |
| Context undefined | Parent hierarchy | Timing or component tree |
| Props not updating | Prop capture | Initial value captured |
| Performance slow | Virtualization | Too many DOM nodes |

---

## Resources

- [Svelte 5 Docs](https://svelte.dev/docs)
- [Vitest Docs](https://vitest.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [vitest-browser-svelte](https://github.com/vitest-community/vitest-browser-svelte)
