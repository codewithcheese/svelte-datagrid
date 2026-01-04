# Documentation Maintenance Methodology

This document defines the methodology for maintaining Svelte DataGrid documentation. It is intended for Claude (AI assistant) and human contributors to follow consistently.

## Diátaxis Framework

All documentation follows the [Diátaxis](https://diataxis.fr/) framework, which organizes documentation into four quadrants:

```
                    PRACTICAL                      THEORETICAL
               ┌─────────────────────────────────────────────────┐
               │                                                 │
   LEARNING    │   TUTORIALS          │     EXPLANATION          │
   (acquiring) │   (learning-oriented)│     (understanding)      │
               │                      │                          │
               │   Step-by-step       │     Why things work      │
               │   lessons            │     the way they do      │
               │                      │                          │
               ├──────────────────────┼──────────────────────────┤
               │                      │                          │
   WORKING     │   HOW-TO GUIDES      │     REFERENCE            │
   (applying)  │   (task-oriented)    │     (information)        │
               │                      │                          │
               │   Solve specific     │     Technical specs      │
               │   problems           │     and API docs         │
               │                      │                          │
               └─────────────────────────────────────────────────┘
```

### When to Use Each Type

| Type | User Need | Question They're Asking |
|------|-----------|------------------------|
| Tutorial | Learn a skill | "Teach me how to..." |
| How-to | Accomplish a task | "How do I..." |
| Reference | Find information | "What is the API for..." |
| Explanation | Understand concepts | "Why does it work like..." |

---

## Directory Structure

```
docs/
├── index.md                    # Main entry, links to all sections
├── DOCS_MAINTENANCE.md         # This file
├── tutorials/
│   ├── index.md               # Tutorial overview
│   ├── getting-started.md     # First grid tutorial
│   ├── adding-selection.md    # Selection tutorial
│   └── server-side-data.md    # DataSource tutorial
├── how-to/
│   ├── index.md               # How-to overview
│   ├── filtering.md           # Enable filtering
│   ├── keyboard-navigation.md # Keyboard nav
│   ├── theming.md             # Customize appearance
│   └── column-resizing.md     # Resize columns
├── reference/
│   ├── index.md               # Reference overview
│   ├── datagrid.md            # DataGrid component
│   ├── column-definition.md   # Column config
│   ├── grid-state.md          # State API
│   └── data-sources.md        # DataSource interface
└── explanation/
    ├── index.md               # Explanation overview
    ├── architecture.md        # How grid is structured
    ├── state-management.md    # Svelte 5 runes usage
    └── virtualization.md      # Row virtualization
```

---

## Maintenance Workflow

### When Code Changes

Follow this checklist when modifying code:

#### 1. Identify Affected Documentation

```
Code Change                    → Documentation Impact
─────────────────────────────────────────────────────────
New prop added                 → reference/datagrid.md
New method on gridState        → reference/grid-state.md
New column option              → reference/column-definition.md
New feature (filterable, etc.) → how-to guide + reference
API behavior change            → reference + affected tutorials
New DataSource                 → reference/data-sources.md
Architecture change            → explanation docs
```

#### 2. Update Reference First

Reference docs must always match the implementation. When adding a new prop:

```markdown
<!-- In reference/datagrid.md -->
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| newProp | `boolean` | `false` | Description of what it does |
```

#### 3. Update How-To If Applicable

If the change enables a user task, add or update a how-to:

```markdown
<!-- In how-to/new-feature.md -->
# How to Enable New Feature

Add the `newProp` to enable this feature:

\`\`\`svelte
<DataGrid {data} {columns} newProp />
\`\`\`
```

#### 4. Update Tutorials If User Journey Changes

If the change affects the beginner experience, update relevant tutorials.

#### 5. Update Explanation If Architecture Changes

If underlying concepts change, update explanation docs.

---

## Writing Standards

### Tutorials

Tutorials are **learning-oriented**. They should:

- Take the learner through steps to build something
- Be repeatable (same steps → same result)
- Focus on learning, not the final product
- Explain just enough, not everything
- Never assume prior knowledge

**Template:**

```markdown
# Tutorial Title

Brief intro and what you'll learn.

**Time**: X minutes
**Prerequisites**: List any prior tutorials

## Step 1: First Action

Explain what they'll do and why.

\`\`\`svelte
<!-- Code they should write -->
\`\`\`

## Step 2: Next Action

Continue building...

## Complete code

Full working example.

## What you learned

- Point 1
- Point 2

## Next steps

- Link to next tutorial
- Link to relevant how-to
```

### How-To Guides

How-tos are **task-oriented**. They should:

- Solve a specific problem
- Assume the reader knows the basics
- Be concise and direct
- Offer variations and options
- Link to reference for details

**Template:**

```markdown
# How to [Task]

Brief description of the task.

## Basic Usage

Minimal example to accomplish the task.

\`\`\`svelte
<DataGrid ... />
\`\`\`

## Options

### Variation 1

...

### Variation 2

...

## Complete Example

Full working code.

## See also

- Link to reference
- Link to related how-tos
```

### Reference

Reference is **information-oriented**. It should:

- Be accurate and complete
- Match the actual implementation
- Use consistent structure
- Be terse (descriptions, not explanations)
- Include types and defaults

**Template:**

```markdown
# Component/API Name

One-line description.

## Type Definition

\`\`\`typescript
interface Foo { ... }
\`\`\`

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| prop1 | `string` | `''` | Brief description |

## Methods

### methodName(params)

Brief description.

\`\`\`typescript
gridState.methodName(param: Type): ReturnType
\`\`\`

## See also

- Related reference pages
```

### Explanation

Explanation is **understanding-oriented**. It should:

- Provide context and background
- Discuss alternatives and trade-offs
- Explain "why" not just "what"
- Connect concepts together
- Use diagrams when helpful

**Template:**

```markdown
# Topic Name

Why this topic matters.

## The Problem

What problem this solves.

## The Solution

How we solve it.

## How It Works

Detailed explanation.

## Trade-offs

What we gained and gave up.

## See also

- Related explanations
- Relevant reference pages
```

---

## Cross-Linking Guidelines

Each documentation type should link to related docs:

| From | Link To |
|------|---------|
| Tutorial | Next tutorial, relevant how-to, reference |
| How-to | Reference for details, related how-tos |
| Reference | How-to for usage, explanation for concepts |
| Explanation | Reference for specifics, other explanations |

Always use relative links:

```markdown
See [DataGrid Reference](../reference/datagrid.md)
```

---

## Documentation Checklist

Before committing documentation changes:

- [ ] Follows correct documentation type (tutorial/how-to/reference/explanation)
- [ ] Uses proper template structure
- [ ] All code examples are tested and work
- [ ] Cross-links to related documentation
- [ ] Updated index.md if adding new pages
- [ ] No duplicate information across docs
- [ ] Types and defaults match actual implementation

---

## Common Patterns

### Feature Documentation Pattern

When adding a new feature, create/update:

1. **Reference**: Add prop/method documentation
2. **How-to**: Create "How to Enable X" guide
3. **Tutorial**: Update if affects beginner journey
4. **Index**: Add to relevant index.md

### API Change Pattern

When changing an API:

1. **Reference**: Update signature, types, description
2. **How-to**: Update affected examples
3. **Tutorial**: Update if examples are affected
4. **Changelog**: Document breaking changes (if any)

### Bug Fix Pattern

When fixing a bug:

1. **Reference**: Clarify behavior if misunderstood
2. **How-to**: Add example if common mistake
3. **No change** if documentation was already correct

---

## Claude-Specific Instructions

When Claude is asked to maintain documentation:

### Identify Documentation Type First

Before writing, determine which quadrant:

```
User asks "how do I filter?"        → How-to guide
User asks "what props are there?"   → Reference
User asks "teach me the basics"     → Tutorial
User asks "why use runes?"          → Explanation
```

### Check for Existing Documentation

1. Search `docs/` for related files
2. Update existing docs rather than creating duplicates
3. Cross-link between related docs

### Verify Code Examples

Before including code examples:

1. Ensure syntax is correct
2. Verify props/methods exist in implementation
3. Test the example mentally or by reading source

### Maintain Consistency

- Match existing file naming conventions
- Use same markdown formatting
- Follow established template structures
- Keep similar documents at similar depth

### Update Indexes

When adding new documentation:

1. Add entry to the section's index.md
2. Add entry to the main docs/index.md if top-level
3. Update cross-references in related docs

---

## Version Compatibility

When documentation relates to specific versions:

- Document current behavior (latest version)
- Note breaking changes with version numbers
- Don't maintain legacy documentation unless actively supported

---

## Quality Standards

### Accuracy

Documentation must match implementation. When in doubt:

1. Read the source code
2. Run the example
3. Ask for clarification

### Completeness

Reference docs should cover every:
- Prop and its type
- Method and its signature
- Event and its payload
- CSS variable and its default

### Clarity

- Use simple language
- Avoid jargon unless defined
- One idea per paragraph
- Active voice preferred

### Maintainability

- DRY: Don't repeat explanations across docs
- Link instead of duplicate
- Keep examples minimal but complete
