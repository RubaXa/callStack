# callStack
JavaScript call stack controller.


## API

* callStack.add(ctx`:Object`, fn`:String`, options`:Object`)`
* callStack.wrap(fn`:Function`)`:Function`
* callStack.wrap(ctx`:Object`, fn`:String`)`:Function`
* callStack.wrap(ctx`:Object`, fn`:Function`)`:Function`
* callStack.wrap(ctx`:Object`, fn`:String`, options`:Object`)`:Function`
* callStack(name`:String`)`:Stack` — get call stack by name
* callStack.order(firstName`:String`, secondName`:String`[, etc])
* callStack.pause()
* callStack.unpause()
* callStack.clear(name`:String`)


---


## Use case
```js
var MyView = framework.View.extend({
    initialize: function (){
		callStack('vis').wrap(this, 'visibility');
		callStack('render').wrap(this, 'render', { uniq: 'once' });
	},

	visibility: function (state){
		console.log(this.id+'.vis:', state);
		this.$el.css('display', state ? '' : 'none');
	},

	render: function (){
		console.log(this.id+'.render');
		this.$el.empty().html( ... );
	}
})


callStack.order('render', 'vis');

var viewHeader = new MyView({ id: 'header' });
var viewContent = new MyView({ id: 'content' });
var viewFooter = new MyView({ id: 'footer' });


// (1) Somewhere in the code.
viewHeader.visibility(true);
viewContent.visibility(true);
viewFooter.visibility(true);

// (2)
viewFooter.render(); // (!)
viewHeader.render();
viewContent.render();

// (3)
viewFooter.visibility(false);
viewFooter.render(); // (!!)
```

Next tick: console
```
header.render
content.render
footer.render

header.vis: true
content.vis: true
footer.vis: true
footer.vis: false
```


---


## Options

### Option:wieght (default = 0)
```js
var foo = callStack.wrap(function (){ console.log("foo:", arguments) }, { weight: 100 });
var bar = callStack.wrap(function (){ console.log("bar:", arguments) }, { weight: 10 });

bar(1);
foo(1);
bar(2);
foo(2);
```

Console:
```
foo: 1
foo: 2
bar: 1
bar: 2
```

---

### Option:uniq
```js
var foo = callStack.wrap(function (){ console.log("foo:", arguments) }, { uniq: true, weight: 100 });
var bar = callStack.wrap(function (){ console.log("bar:", arguments) }, { uniq: "once" });

foo(1);
bar(1);
foo(2);
foo(2);
bar(1)

bar(1);
foo(3);
foo(3);
foo(1);
bar(5);
```

Console:
```
foo: 1
foo: 2
foo: 3
foo: 1
bar: 5
```


