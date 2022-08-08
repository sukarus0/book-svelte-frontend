<script>
	import { fade, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	import TodoItem from './TodoItem.svelte'

	import { fetchTodos } from '../store'

</script>

<div class='main'>
	<ul>
		{#each $fetchTodos as todo, index(todo)}
			<li
				in:fade
				out:slide={{duration:100}}
				animate:flip={{duration:300}}
			>
				<TodoItem { todo } />
			</li>
		{/each}
	</ul>
</div>
