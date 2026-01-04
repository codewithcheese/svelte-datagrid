<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value: number | null | undefined;
		oncommit: (value: number | null) => void;
		oncancel: () => void;
		onchange: (value: number | null) => void;
		min?: number;
		max?: number;
		step?: number;
	}

	let { value, oncommit, oncancel, onchange, min, max, step = 1 }: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let inputValue = $state(value?.toString() ?? '');

	onMount(() => {
		// Auto-focus and select all text when editor opens
		if (inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	function parseValue(str: string): number | null {
		if (str.trim() === '') return null;
		const num = parseFloat(str);
		return isNaN(num) ? null : num;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			oncommit(parseValue(inputValue));
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			oncancel();
		} else if (event.key === 'Tab') {
			// Allow Tab to commit and move to next cell
			oncommit(parseValue(inputValue));
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			const current = parseValue(inputValue) ?? 0;
			const newValue = current + step;
			if (max === undefined || newValue <= max) {
				inputValue = newValue.toString();
				onchange(newValue);
			}
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			const current = parseValue(inputValue) ?? 0;
			const newValue = current - step;
			if (min === undefined || newValue >= min) {
				inputValue = newValue.toString();
				onchange(newValue);
			}
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		onchange(parseValue(inputValue));
	}

	function handleBlur() {
		// Commit on blur (clicking outside)
		oncommit(parseValue(inputValue));
	}
</script>

<input
	bind:this={inputEl}
	type="text"
	inputmode="decimal"
	class="number-editor"
	value={inputValue}
	oninput={handleInput}
	onkeydown={handleKeyDown}
	onblur={handleBlur}
/>

<style>
	.number-editor {
		width: 100%;
		height: calc(100% - 4px);
		padding: 2px 6px;
		border: 2px solid var(--datagrid-edit-border-color, #3b82f6);
		border-radius: 2px;
		font-size: inherit;
		font-family: inherit;
		font-variant-numeric: tabular-nums;
		background: var(--datagrid-edit-bg, #fff);
		color: inherit;
		outline: none;
		box-sizing: border-box;
		text-align: right;
	}

	.number-editor:focus {
		border-color: var(--datagrid-edit-focus-color, #2563eb);
		box-shadow: 0 0 0 2px var(--datagrid-edit-focus-ring, rgba(59, 130, 246, 0.3));
	}
</style>
