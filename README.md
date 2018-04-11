# About

Proxymity is a 2 way data binding library with the aim to keep everything as simple and close to vanilla javascript and html as possiable.

# Basic Usage

```javascript
var controller = {}
proximity(document.querySelector("body"), {}, "controller")
controller.fibanachi = function(n){
	if (n < 0){
		return 0;
	}
	if (n === 0 || n === 1){
		return n
	}
	return controller.fibanachi(n - 2) + controller.fibanachi(n  - 1)
}

// jquery to get stuff from endpoint our immaginary end point (useo session maybe?). the view will (re)render automagically
$.ajax("/api/endpoint", function(text){
	controller.user = JSON.parse(text)
}
```

```html
<html>
	<head>
		<title>your age in fibbanachi</title>
		<script src="path/to/proxymity.min.js"></script>
		<script src="path/to/jquery.min.js"></script>
		<style>
			body {
				opacity: 0;
			}
			body.ready {
				opacity: 1;
			}
		</style>
	</head>
	<body class="{{this.controller.user.toString() && 'ready'}}">
		<h1>Welcome {{this.controller.user.name}}</h1>
		<div>
			age: <input type="number" name="user.age">
		</div>
		<div>
			name: <input type="text" name="user.name">
		</div>
		<p>
			The fibanachi number associated with your age is {{this.controller.fibanachi(this.controller.user.age)}}
		</p>
	</body>
</html>
```
