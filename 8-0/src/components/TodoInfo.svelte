<script>
	import Constant from '../constant';

	import { todos, countTodo } from '../store'

	const handleFetchTodoALL = () => todos.changeTodoView(Constant.ALL)
	const handleFetchTodoActive = () => todos.changeTodoView(Constant.ACTIVE)
	const handleFetchTodoDone = () => todos.changeTodoView(Constant.DONE)
</script>

<div class='info'>
	<span>COUNT: {$countTodo} </span>
	<div>
		<button class='btn'
			class:selected={$todos.viewMode === Constant.ALL}
			on:click={ handleFetchTodoALL }
		> ALL </button>
		<button class='btn'
			class:selected={$todos.viewMode === Constant.ACTIVE}
			on:click={ handleFetchTodoActive }
		> ACTIVE </button>
		<button class='btn'
			class:selected={$todos.viewMode === Constant.DONE}
			on:click={ handleFetchTodoDone }
		> DONE </button>
	</div>
</div>
