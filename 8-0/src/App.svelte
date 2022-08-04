<script>
	import Constant from './constant';
	
	import TodoHeader from './components/TodoHeader.svelte';
	import TodoInfo from './components/TodoInfo.svelte';
	import TodoList from './components/TodoList.svelte';

	import { v4 as uuid } from 'uuid';

	let todos = [
		{
			id: uuid(),
			content: '첫 번째 할일',
			done: false
		},
		{
			id: uuid(),
			content: '두 번째 할일',
			done: false
		},
		{
			id: uuid(),
			content: '세 번째 할일',
			done: false
		},
		{
			id: uuid(),
			content: '네 번째 할일',
			done: false
		},
	]

	let todoValue = '';
	let editMode = '';
	let viewMode = '';

	$: todoCount = fetchTodos.length;
	$: fetchTodos = todos;

	$: {
		if(viewMode === Constant.ALL) fetchTodos = todos;
		if(viewMode === Constant.ACTIVE) fetchTodos = todos.filter(todo => todo.done === false);
		if(viewMode === Constant.DONE) fetchTodos = todos.filter(todo => todo.done === true);
	}

	function handleCheckTodo(id) {
		todos = todos.map(todo => {
			if(todo.id === id) {
				todo.done = !todo.done;
			}
			return todo;
		})
	}

	function addTodoItem() {
		if(todoValue) {
			const newTodo = {
				id: uuid(),
				content: todoValue,
				done: false,
			}

			todos = [...todos, newTodo];
			todoValue = '';
		}
	}

	function handleTodoInputKeyup(e) {
		if(e.keyCode == 13) {
			console.log('todoValue: ${e.target.value}')

			addTodoItem();
		}
	}

	function handleRemoveTodo(id) {
		todos = todos.filter(todo => todo.id != id);
	}


	function handleChangeEditMode(id) {
		editMode = id;
	}

	function closeEditMode() {
		editMode = '';
	}

	function handleEditTodoItem(editTodo) {
		todos = todos.map(todo => {
			if(todo.id === editTodo.id) {
				todo.content = editTodo.content;
			}
			return todo;
		})

		closeEditMode();
	}

	function handleEditTodoItemByEnter(e, editTodo) {
		if(e.keyCode === 13) {
			handleEditTodoItem(editTodo);
		}
	}

	function handleChangeViewMode(mode) {
		viewMode = mode;
	}

</script>

<div class='app'>
	<TodoHeader bind:todoValue={todoValue} {handleTodoInputKeyup} />
	<TodoInfo {todoCount} {viewMode} {handleChangeViewMode}/>
	<TodoList 
		{todos} 
		{fetchTodos}
		{handleCheckTodo} 
		{handleRemoveTodo} 
		{editMode} 
		{handleChangeEditMode} 
		{handleEditTodoItem} 
		{handleEditTodoItemByEnter} 
	/>
</div>

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
