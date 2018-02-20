QUnit.module('callStack');

QUnit.test('wrap', function (assert) {
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

	var done = assert.async();

	callStack.tick.one(function (){
		assert.equal(log.join(','), 'foo,bar,baz');

		done();
	});

	foo();
	bar();
	obj.baz();
});


QUnit.test('add', function (assert) {
	var log = [];

	callStack.add(function (){ log.push('bar') });
	callStack.add(function (){ log.push('foo') }, { weight: 10 });

	var done = assert.async();
	callStack.tick.one(function (){
		assert.equal(log.join(','), 'foo,bar');
		done();
	});
});


QUnit.test('weight', function (assert) {
	var log = [];

	var foo = callStack.wrap(function (){
		log.push('foo');
	}, { weight: 100 });


	var bar = callStack.wrap(function (){
		log.push('bar');
	});


	var done = assert.async();

	callStack.tick.one(function (){
		assert.equal(log.join(','), 'foo,foo,bar,bar,bar');

		done();
	});


	bar();
	bar();
	foo();
	foo();
	bar();
});



QUnit.test('uniq', function (assert) {
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


	var done = assert.async();

	callStack.tick.one(function (){
		assert.equal(log.join(','), 'baz:BAZ,bar,bar,foo:true,foo:false,foo:false:true,foo:2');
		done();
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



QUnit.test('flows', function (assert) {
	var log = [];

	var baz = callStack('yyy').wrap(function (){ log.push('baz') });
	var qux = callStack('yyy').wrap(function (){ log.push('qux') }, { weight: 100 });

	var foo = callStack('xxx').wrap(function (){ log.push('foo'); });
	var bar = callStack('xxx').wrap(function (){ log.push('bar') });


	callStack.order('xxx', 'yyy');


	var done = assert.async();

	callStack.tick.one(function (){
		assert.equal(log.join(','), 'foo,bar,bar,foo,qux,qux,baz');

		log.splice(0, 1e5);
		callStack.order('yyy', 'xxx');

		// xxx
		bar();
		foo();

		// yyy
		baz();
		qux();

		callStack.tick.one(function (){
			assert.equal(log.join(','), 'qux,baz,bar,foo');
			done();
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



QUnit.test('pause/unpause', function (assert) {
	callStack.clear();

	var log = [];
	var foo = callStack.wrap(function (x){ log.push(x); });

	var done = assert.async();
	callStack.tick.one(function (){
		assert.equal(log.join('-'), '1-2-3');
		done();
	});

	foo(1);
	callStack.pause();
	foo(2);

	setTimeout(function (){
		callStack.unpause();
		foo(3);
	}, 100);
});



QUnit.test('override', function (assert) {
	var log = [];
	var foo = function (a){ log.push(a) };
	var obj = { bar: function (a){ log.push(a) } };

	var ofoo = callStack.override(foo, function (fn){
		return function (a){
			fn(a+1);
		};
	});

	callStack.override(obj, 'bar', function (fn){
		return function (a){
			fn(a*2);
		};
	});

	// test
	foo(1);
	ofoo(1);
	obj.bar(2);

	assert.equal(log.join('->'), '1->2->4');
});


QUnit.test('disabled', function (assert) {
	callStack.disabled = true;

	var log = [];
	var obj = {
		baz: function (a, b, c){
			log.push('baz'+(a + b + c));
		}
	};

	var bar = callStack.wrap(function (){ log.push('bar'); });
	var baz = callStack('bbb').wrap(obj, 'baz');

	callStack('aaa').add(function (){ log.push('foo'); });
	bar();
	obj.baz(1, 2, 3);

	assert.equal(log.join('->'), 'foo->bar->baz6');
	callStack.disabled = false;
});


/*
test('batch', function (){
	var log = [], state = [];

	callStack('foo').add(function (){ log.push(4); });

	callStack.add(function (){ log.push(2); });
	callStack.add(function (){ log.push(1); }, { weight: 100 });

	callStack('foo').add(function (){ log.push(3); });


	// @test
	stop();
	callStack.on('default', function (){
		state.push(2);
		assert.equal(log.join('->'), '1->2->4->3');
	});

	callStack.on('default', function (){
		state.push(1);
		assert.equal(log.join('->'), '1->2');
	});

	callStack.tick.one(function (){
		start();
		assert.equal(state.join('->'), '1->2');
	});
});
*/
