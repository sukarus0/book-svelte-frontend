<script>
	import { Route } from 'tinro';
	import About from './pages/About.svelte';
	import Home from './pages/Home.svelte';
	import Contacts from './pages/Contacts.svelte';
</script>

<Route path='/'><Home /></Route>
<Route path='/about'><About /></Route>
<Route path='/contacts'><Contacts /></Route>
