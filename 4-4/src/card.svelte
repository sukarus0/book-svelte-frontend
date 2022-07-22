<style>
	.card {
		width: 300px;
		border: 1px solid #aaa;
		border-radius: 2px;
		box-shadow: 2px 2px 8px rgba(0,0,0,0.1);
		padding: 1em;
		margin: 0 0 1em 0;
	}

	h2 {
		padding: 0 0 0.2em 0;
		margin: 0 0 1em 0;
		border-bottom: 1px solid #ff3e00;
	}

	.address, .email {
		padding: 0 0 0 1.5em;
		background: 0 50% no-repeat;
		background-size: 1em 1em;
		margin: 0 0 0.5em 0;
		line-height: 1.2;
	}

	.missing { color: #999 }

	.hovering {
		background-color: #ffed99;
	}

</style>

<script>
	let hovering;
	const enter = () => hovering = true;
	const leave = () => hovering = false;
</script>

<article class="contact-card" class:hovering on:mouseenter={enter} on:mouseleave={leave}>
	<h2>
		<slot name="name">
			<span class="missing"> 이름 미입력 </span>
		</slot>
	</h2>

	<div class="address">
		<slot name="address">
			<span class="missing"> 주소 미입력 </span>
		</slot>
	</div>

	{#if $$slots.email}
		<div class="email">
			<hr />
			<slot {hovering} name="email"> </slot>
		</div>
	{/if}
</article>
