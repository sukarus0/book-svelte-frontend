<script>
	let a = 1;
	let b = 2;

	import Increment from './increment.svelte'
	let value = 0;
</script>

<main>
	<label>
		<input type=number bind:value={a} min=0 max=10>
		<input type=range bind:value={a} min=0 max=10>
	</label>

	<label>
		<input type=number bind:value={b} min=0 max=10>
		<input type=range bind:value={b} min=0 max=10>
	</label>

	<p> {a} + {b} = {a + b} </p>
	<hr>

	<input type="Number" bind:value={value}>

	<h2>{value}</h2>

	<Increment bind:count={value} />
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
