<script>
	import TodoItem from './TodoItem.svelte'

	export let todos;
	export let handleCheckTodo;
	export let handleRemoveTodo;
</script>

<div class='main'>
	<ul>
		{#each todos as todo, index(todo)}
			<li>
				<TodoItem {todo} {handleCheckTodo} {handleRemoveTodo} />
			</li>
		{/each}
	</ul>
</div>
