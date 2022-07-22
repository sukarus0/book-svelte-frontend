<script>
	import Card from './card.svelte';
</script>

<Card>
	<h2>안녕하세요!</h2>
	<p>이곳은 내용이 들어가는 영역입니다.</p>
</Card>

<Card>
	<h2>Hello Svelte</h2>
	<p>Svelte를 배우는 여러분 환경합니다.</p>
	<p>즐거운 코딩 되세요..</p>
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
