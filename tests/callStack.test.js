module('callStack');

test('wrap', function (){
	var log = [];
	var obj = {
		_bar: 'bar',
		_baz: 'baz',

		bar: function (){ log.push(this._bar); },
		baz: function (){ log.push(this._baz); }
	};

	var foo = callStack.wrap(function (){ log.push('foo'); });
	var bar = callStack.wrap(obj, obj.bar);
	callStack.wrap(obj, 'baz');

	stop();
	callStack.tick.one(function (){
		equal(log.join(','), 'foo,bar,baz');

		start();
	});

	foo();
	bar();
	obj.baz();
});


test('add', function (){
	var log = [];

	callStack.add(function (){ log.push('bar') });
	callStack.add(function (){ log.push('foo') }, { weight: 10 });

	stop();
	callStack.tick.one(function (){
		start();
		equal(log.join(','), 'foo,bar');
	});
});


test('weight', function (){
	var log = [];

	var foo = callStack.wrap(function (){
		log.push('foo');
	}, { weight: 100 });


	var bar = callStack.wrap(function (){
		log.push('bar');
	});


	stop();
	callStack.tick.one(function (){
		equal(log.join(','), 'foo,foo,bar,bar,bar');

		start();
	});


	bar();
	bar();
	foo();
	foo();
	bar();
});



test('uniq', function (){
	var log = [];

	var foo = callStack.wrap(function (){
		log.push('foo:'+[].join.call(arguments, ':'));
	}, { uniq: true });


	var bar = callStack.wrap(function (){
		log.push('bar');
	}, { weight: 300 });


	var baz = callStack.wrap(function (){
		log.push('baz:'+[].join.call(arguments, ':'));
	}, { weight: 600, uniq: 'once' });


	stop();
	callStack.tick.one(function (){
		equal(log.join(','), 'baz:BAZ,bar,bar,foo:true,foo:false,foo:false:true,foo:2');
		start();
	});


	foo(true);
	bar();
	foo(true);

	baz();
	bar();

	foo(false);
	baz(12, 34);

	foo(false, true);

	baz('BAZ');

	foo(false, true);
	foo(2);
});



test('flows', function (){
	var log = [];

	var baz = callStack('yyy').wrap(function (){ log.push('baz') });
	var qux = callStack('yyy').wrap(function (){ log.push('qux') }, { weight: 100 });

	var foo = callStack('xxx').wrap(function (){ log.push('foo'); });
	var bar = callStack('xxx').wrap(function (){ log.push('bar') });


	callStack.order('xxx', 'yyy');


	stop();
	callStack.tick.one(function (){
		start();
		equal(log.join(','), 'foo,bar,bar,foo,qux,qux,baz');

		log.splice(0, 1e5);
		callStack.order('yyy', 'xxx');

		// xxx
		bar();
		foo();

		// yyy
		baz();
		qux();

		stop();
		callStack.tick.one(function (){
			start();
			equal(log.join(','), 'qux,baz,bar,foo');
		});
	});


	// yyyy
	qux();
	baz();
	qux();


	// xxx
	foo();
	bar();
	bar();
	foo();
});



test('pause/unpause', function (){
	callStack.clear();

	var log = [];
	var foo = callStack.wrap(function (x){ log.push(x); });

	stop();
	callStack.tick.one(function (){
		start();
		equal(log.join('-'), '1-2-3');
	});

	foo(1);
	callStack.pause();
	foo(2);

	setTimeout(function (){
		callStack.unpause();
		foo(3);
	}, 100);
});

