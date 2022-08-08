<script>
	import { meta } from 'tinro';
	const route = meta();
	let param = route.params._id;
</script>

<b> Sub Content </b>
<p> param: {param} </p>

<p> Current URL: {route.url} </p>
<p> Previous URL: {route.from} </p>
