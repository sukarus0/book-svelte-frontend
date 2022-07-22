<script>
	import Card from './card.svelte';
</script>

<Card>
	<span slot="name">
		홍길동
	</span>

	<span slot="address">
		서울특별시<br>
		여의도동
	</span>
</Card>

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
