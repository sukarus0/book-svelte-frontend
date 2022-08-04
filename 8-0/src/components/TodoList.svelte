<script>
	import TodoItem from './TodoItem.svelte'

	export let todos;
	export let handleCheckTodo;
	export let handleRemoveTodo;

	export let editMode;
	export let handleEditTodoItem;
	export let handleEditTodoItemByEnter;
	export let handleChangeEditMode;

	export let fetchTodos;
</script>

<div class='main'>
	<ul>
		{#each fetchTodos as todo, index(todo)}
			<li>
				<TodoItem 
					{todo} 
					{handleCheckTodo} 
					{handleRemoveTodo} 
					{editMode}
					{handleEditTodoItem}
					{handleEditTodoItemByEnter}
					{handleChangeEditMode}
				/>
			</li>
		{/each}
	</ul>
	
	<hr>
	
	<ul>
		{#each todos as todo, index(todo)}
			<li>
				<TodoItem 
					{todo} 
					{handleCheckTodo} 
					{handleRemoveTodo} 
					{editMode}
					{handleEditTodoItem}
					{handleEditTodoItemByEnter}
					{handleChangeEditMode}
				/>
			</li>
		{/each}
	</ul>
</div>
