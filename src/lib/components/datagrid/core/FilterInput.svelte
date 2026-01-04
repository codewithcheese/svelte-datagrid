<script lang="ts">
	import type { ColumnDef, FilterOperator } from '../../../types/index.js';

	interface Props {
		column: ColumnDef<Record<string, unknown>>;
		value: unknown;
		operator: FilterOperator;
		onchange: (value: unknown, operator: FilterOperator) => void;
	}

	let { column, value, operator, onchange }: Props = $props();

	// Determine filter type from column definition
	const filterType = $derived(column.filterType ?? 'text');

	// Local state for debouncing
	let inputValue = $state(String(value ?? ''));
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync external value changes
	$effect(() => {
		inputValue = String(value ?? '');
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;

		// Debounce the filter update
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			emitChange(inputValue);
		}, 300);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			// Immediate filter on Enter
			if (debounceTimer) clearTimeout(debounceTimer);
			emitChange(inputValue);
		} else if (event.key === 'Escape') {
			// Clear filter on Escape
			inputValue = '';
			emitChange('');
		}
	}

	function handleSelectChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		emitChange(target.value);
	}

	function handleNumberChange(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const num = parseFloat(inputValue);
			emitChange(isNaN(num) ? '' : num);
		}, 300);
	}

	function handleBooleanChange(event: Event) {
		const target = event.target as HTMLSelectElement;
		const val = target.value;
		if (val === '') {
			emitChange('');
		} else {
			emitChange(val === 'true');
		}
	}

	function handleDateChange(event: Event) {
		const target = event.target as HTMLInputElement;
		emitChange(target.value || '');
	}

	function emitChange(val: unknown) {
		// Choose default operator based on filter type
		let op = operator;
		if (filterType === 'text' && operator === 'contains') {
			op = 'contains';
		} else if (filterType === 'number' && !['eq', 'neq', 'gt', 'lt', 'gte', 'lte'].includes(operator)) {
			op = 'eq';
		}
		onchange(val, op);
	}

	function handleClear() {
		inputValue = '';
		emitChange('');
	}

	const hasValue = $derived(inputValue !== '' && inputValue !== null && inputValue !== undefined);
</script>

<div class="filter-input-wrapper">
	{#if filterType === 'text'}
		<input
			type="text"
			class="filter-input"
			placeholder="Filter..."
			value={inputValue}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			aria-label="Filter {column.header}"
		/>
	{:else if filterType === 'number'}
		<input
			type="number"
			class="filter-input"
			placeholder="Filter..."
			value={inputValue}
			oninput={handleNumberChange}
			onkeydown={handleKeyDown}
			aria-label="Filter {column.header}"
		/>
	{:else if filterType === 'date'}
		<input
			type="date"
			class="filter-input"
			value={String(value ?? '')}
			onchange={handleDateChange}
			aria-label="Filter {column.header}"
		/>
	{:else if filterType === 'boolean'}
		<select
			class="filter-input filter-select"
			onchange={handleBooleanChange}
			aria-label="Filter {column.header}"
		>
			<option value="">All</option>
			<option value="true" selected={value === true}>Yes</option>
			<option value="false" selected={value === false}>No</option>
		</select>
	{:else if filterType === 'select'}
		<select
			class="filter-input filter-select"
			onchange={handleSelectChange}
			aria-label="Filter {column.header}"
		>
			<option value="">All</option>
			<!-- Options would be provided by column.filterOptions if we add that -->
		</select>
	{/if}

	{#if hasValue}
		<button
			class="filter-clear"
			onclick={handleClear}
			aria-label="Clear filter"
			type="button"
		>
			×
		</button>
	{/if}
</div>

<style>
	.filter-input-wrapper {
		display: flex;
		align-items: center;
		width: 100%;
		position: relative;
	}

	.filter-input {
		width: 100%;
		padding: 4px 24px 4px 8px;
		border: 1px solid var(--datagrid-border-color, #e0e0e0);
		border-radius: 4px;
		font-size: 13px;
		background: var(--datagrid-input-bg, #fff);
		color: var(--datagrid-color, #333);
		outline: none;
		transition: border-color 0.15s;
	}

	.filter-input:focus {
		border-color: var(--datagrid-primary-color, #1976d2);
	}

	.filter-input::placeholder {
		color: var(--datagrid-muted-color, #999);
	}

	.filter-select {
		padding-right: 8px;
		cursor: pointer;
	}

	.filter-clear {
		position: absolute;
		right: 4px;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--datagrid-muted-color, #999);
		cursor: pointer;
		font-size: 16px;
		line-height: 1;
		padding: 2px 4px;
		border-radius: 2px;
	}

	.filter-clear:hover {
		color: var(--datagrid-color, #333);
		background: var(--datagrid-hover-bg, #f0f0f0);
	}
</style>
