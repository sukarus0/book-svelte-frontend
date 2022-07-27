<script>
	import TodoItem from './TodoItem.svelte'

	export let todos;
	export let handleCheckTodo;
</script>

<div class='main'>
	<ul>
		{#each todos as todo, index(todo)}
			<li>
				<TodoItem {todo} {handleCheckTodo} />
			</li>
		{/each}
	</ul>
</div>
