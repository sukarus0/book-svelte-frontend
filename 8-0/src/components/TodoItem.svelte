<script>
	export let todo;
	export let handleCheckTodo;
	export let handleRemoveTodo;

	export let editMode;
	export let handleEditTodoItem;
	export let handleEditTodoItemByEnter;
	export let handleChangeEditMode;
</script>

<input 
	type='checkbox'
	bind:checked={todo.done}
	on:click={() => handleCheckTodo(todo.id)}
>
{#if editMode === todo.id}
	<input 
		type='text' 
		bind:value={todo.content}
		on:focusout={() => handleEditTodoItem(todo)} 
		on:keyup={(e) => handleEditTodoItemByEnter(e, todo)}
	/>
{:else}
	<span on:dblclick={() => handleChangeEditMode(todo.id)}>{todo.content}</span>
{/if}
<a href='#null' on:click={() => handleRemoveTodo(todo.id)}>X</a>
