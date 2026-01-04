<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		value: string;
		oncommit: (value: string) => void;
		oncancel: () => void;
		onchange: (value: string) => void;
	}

	let { value, oncommit, oncancel, onchange }: Props = $props();

	let inputEl: HTMLInputElement | undefined = $state();
	let inputValue = $state(value);

	onMount(() => {
		// Auto-focus and select all text when editor opens
		if (inputEl) {
			inputEl.focus();
			inputEl.select();
		}
	});

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			oncommit(inputValue);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			oncancel();
		} else if (event.key === 'Tab') {
			// Allow Tab to commit and move to next cell
			oncommit(inputValue);
		}
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		onchange(inputValue);
	}

	function handleBlur() {
		// Commit on blur (clicking outside)
		oncommit(inputValue);
	}
</script>

<input
	bind:this={inputEl}
	type="text"
	class="text-editor"
	value={inputValue}
	oninput={handleInput}
	onkeydown={handleKeyDown}
	onblur={handleBlur}
/>

<style>
	.text-editor {
		width: 100%;
		height: calc(100% - 4px);
		padding: 2px 6px;
		border: 2px solid var(--datagrid-edit-border-color, #3b82f6);
		border-radius: 2px;
		font-size: inherit;
		font-family: inherit;
		background: var(--datagrid-edit-bg, #fff);
		color: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.text-editor:focus {
		border-color: var(--datagrid-edit-focus-color, #2563eb);
		box-shadow: 0 0 0 2px var(--datagrid-edit-focus-ring, rgba(59, 130, 246, 0.3));
	}
</style>
