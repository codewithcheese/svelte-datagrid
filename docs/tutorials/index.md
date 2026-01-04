# Tutorials

Tutorials are **learning-oriented** lessons that take you through a series of steps to complete a project. They focus on learning, not on accomplishing a specific task.

## Who are tutorials for?

Tutorials are for **newcomers** to Svelte DataGrid. If you've never used this library before, start here.

## What makes a good tutorial?

- **Repeatable**: Following the steps produces the same result every time
- **Meaningful**: You build something real, not just copy-paste examples
- **Safe**: The tutorial doesn't require risky decisions from the learner
- **Immediate**: Each step produces a visible result

---

## Available Tutorials

### [Getting Started](./getting-started.md)
**Time: 5 minutes** | **Level: Beginner**

Create your first data grid from scratch. You'll learn:
- How to install the package
- How to define columns
- How to render data
- How to handle basic events

### [Adding Selection](./adding-selection.md)
**Time: 10 minutes** | **Level: Beginner**

Add row selection to your grid. You'll learn:
- Single vs multi-select modes
- How selection events work
- How to get selected rows
- Keyboard selection shortcuts

### [Server-Side Data](./server-side-data.md)
**Time: 15 minutes** | **Level: Intermediate**

Connect your grid to a backend data source. You'll learn:
- The DataSource interface
- Using LocalDataSource for prototyping
- Implementing a custom REST API source
- Handling loading and error states

---

## Tutorial Conventions

Throughout tutorials, you'll see:

**Code blocks** show what to type:

```svelte
<DataGrid {data} {columns} />
```

**Info boxes** provide helpful context:

> **Note**: This is additional information that helps understanding but isn't required to complete the step.

**Warning boxes** prevent common mistakes:

> **Warning**: This is a common pitfall to avoid.

---

## After the tutorials

Once you've completed the tutorials, you're ready to:

1. **Solve specific problems** → [How-to Guides](../how-to/index.md)
2. **Look up API details** → [Reference](../reference/index.md)
3. **Understand the architecture** → [Explanation](../explanation/index.md)
