<script>
	let user = { loggedIn: false };

	function toggle() {
		user.loggedIn = !user.loggedIn;
	}
</script>

<main>
	{#if user.loggedIn}
		<button on:click={toggle}>
			Log out
		</button>
		<p>로그인 상태입니다.</p>
	{:else}
		<button on:click={toggle}>
			Log in
		</button>
		<p>로그아웃 상태입니다.</p>
	{/if}
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
