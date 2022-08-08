<script>
	import { Route } from 'tinro';
	import About from './pages/About.svelte';
	import Home from './pages/Home.svelte';
	import Contacts from './pages/Contacts.svelte';
</script>

<Route path='/' redirect='/home'></Route>
<Route path='/home'><Home /></Route>
<Route path='/about'><About /></Route>
<Route path='/contacts'><Contacts /></Route>

<Route fallback> 404 페이지 </Route>
