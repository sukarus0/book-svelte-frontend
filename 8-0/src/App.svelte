<script>
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

	function handleCheckTodo(id) {
		todos = todos.map(todo => {
			if(todo.id === id) {
				todo.done = !todo.done;
			}
			return todo;
		})
	}
</script>

<div class='app'>
	<TodoHeader />
	<TodoInfo />
	<TodoList {todos} {handleCheckTodo} />
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
