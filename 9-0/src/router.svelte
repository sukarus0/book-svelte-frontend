<script>
	import { Route } from 'tinro';

	import About from './pages/About.svelte';
	import Home from './pages/Home.svelte';
	import Contacts from './pages/Contacts.svelte';
	import SubContent from './pages/SubContent.svelte';
</script>

<Route path='/' redirect='/home'></Route>
<Route path='/home'><Home /></Route>
<Route path='/about/*'>
	<About />
	<Route path='/sub'>
		<SubContent />
	</Route>
</Route>
<Route path='/contacts'><Contacts /></Route>

<Route fallback> No page found </Route>
