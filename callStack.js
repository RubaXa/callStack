"use strict";

/**!
 * Call stack controller
 * @author	RubaXa	<ibnRubaXa@gmail.com>
 */


/*global define, module, window*/
(function (factory){
  if( typeof define === "function" && define.amd ){
    define("callStack", [], factory);
  }
  else if( typeof module != "undefined" && typeof module.exports != "undefined" ){
    module.exports = factory();
  }
  else {
    window["callStack"] = factory();
  }
})(function (){
	var _pid;
	var _order = ['default'];
	var _pause = false;
	var _stacks = {};
	var _tickFns = [];
	var _mathMax = Math.max;

	var _simpleSort = function (arr){
		var n = arr.length, swap;
		if( n > 1 ){
			while( n-- > 1 ){
				if( arr[n].weight > arr[n-1].weight ){
					swap = arr[n];
					arr[n] = arr[n-1];
					arr[n-1] = swap;
				}
				else {
					break;
				}
			}
		}
	};

	var _setImmediate = (function (){
		return (
			   window.setImmediate
			|| window.requestAnimationFrame
			|| window.webkitRequestAnimationFrame
			|| window.mozRequestAnimationFrame
			|| function (fn){ window.setTimeout(fn, 0); }
		);
	})();

	var _clearImmediate = (function (){
		return (
			   window.clearImmediate
			|| window.cancelAnimationFrame
			|| window.webkitCancelAnimationFrame
			|| window.mozCancelAnimationFrame
			|| window.clearInterval
		);
	})();


	/**
	 * Checking the call in stack[, and filtering by uniq].
	 * @private
	 * @returns {boolean}
	 */
	function _ifNotInStack(stack, fn, args, uniq){
		var i = stack.length, callee;

		while( i-- ){
			callee = stack[i];
			if( callee.fn === fn ){
				if( uniq === 'once' ){
					stack.splice(i, 1);
					return	true;
				}
				else {
					return	_argsNotEqual(callee.args, args);
				}
			}
		}

		return	true;
	}


	/**
	 * Check arguments
	 * @private
	 * @returns {boolean}
	 */
	function _argsNotEqual(left, right){
		if( left.length !== right.length ){
			return	true;
		}
		else {
			var i = _mathMax(left.length, right.length);

			while( i-- ){
				if( left[i] !== right[i] ){
					return	true;
				}
			}

			return	false;
		}
	}


	/**
	 * Debounce walk
	 * @private
	 */
	function _walkStackTick(){
		_clearImmediate(_pid);
		_pid = _setImmediate(_walkStack);
	}


	/**
	 * Walking through the stack and execution of pending calls.
	 * @private
	 */
	function _walkStack(){
		if( _pause === false ){
			var name, stack, i, n, callee, s = 0, sn = _order.length, ctx, fn, args;

			for( ; s < sn; s++ ){
				name = _order[s];

				if( _stacks[name] !== void 0 ){
					stack = _stacks[name].calls;

					i = 0;
					n = stack.length;

					_stacks[name].calls = [];

					for( ; i < n; i++ ){
						callee	= stack[i];
						ctx		= callee.ctx;
						fn		= callee.fn;
						args	= callee.args;

						switch( args.length ){
							case 0: fn.call(ctx); break;
							case 1: fn.call(ctx, args[0]); break;
							case 2: fn.call(ctx, args[0], args[1]); break;
							case 3: fn.call(ctx, args[0], args[1], args[2]); break;
							case 4: fn.call(ctx, args[0], args[1], args[2], args[3]); break;
							default: fn.apply(ctx, args); break;
						}
					}
				}
			}

			i = _tickFns.length;
			while( i-- ){
				_tickFns[i]();
			}
		}
	}



	/**
	 * Wrap call
	 * @private
	 * @returns {Function}
	 */
	function _wrapCall(ctx, fn, opts){
		 /*jshint validthis:true*/
		var stack = this;

		if( typeof fn === 'string' ){
			return ctx[fn] = this.wrap(ctx, ctx[fn], opts);
		}
		else if( (fn === void 0) || !(fn instanceof Function) ){
			opts	= fn;
			fn		= ctx;
			ctx		= null;
		}

		// Default options
		opts = opts || {
			uniq: false,
			weight: 0
		};

		if( opts.weight !== 0 ){
			stack.sortable = true;
		}

		return function (){
			if( !opts.uniq || _ifNotInStack(stack.calls, fn, arguments, opts.uniq) ){
				var calls = stack.calls;

				// Add to call stack
				calls.push({
					  fn: fn
					, ctx: ctx
					, args: arguments
					, weight: opts.weight || 0
				});

				if( stack.sortable === true ){
					// Sort call stack
					_simpleSort(calls);
				}

				_walkStackTick();
			}
		};
	}


	/**
	 * Create call stack
	 * @param   {String}  name
	 * @returns {Object}
	 */
	function callStack(name){
		if( _stacks[name] == void 0 ){
			_stacks[name] = {
				calls: [],

				wrap: _wrapCall,

				add: function (ctx, fn, opts){
					this.wrap(ctx, fn, opts)();
				},

				clear: function (){
					this.calls = [];
				}
			};
			_order.push(name);
		}

		return	_stacks[name];
	}


	/**
	 * Wrap and add to 'default' stack
	 *
	 * @public
	 * @param   {Object|Function}   ctx
	 * @param   {Function|String}   [fn]
	 * @param   {Object}            [opts]    Object({ uniq: false, weight: 0 })
	 * @return  {Function}
	 */
	callStack.wrap = function (ctx, fn, opts){
		return	callStack('default').wrap(ctx, fn, opts);
	};


	/**
	 * Add to 'default' stack
	 *
	 * @public
	 * @param   {Object|Function}   ctx
	 * @param   {Function|String}   [fn]
	 * @param   {Object}            [opts]    Object({ uniq: false, weight: 0 })
	 * @return  {Function}
	 */
	callStack.add = function (ctx, fn, opts){
		callStack('default').add(ctx, fn, opts);
	};


	/**
	 * Add 'tick' listener
	 *
	 * @public
	 * @param   {Function}  fn
	 */
	callStack.tick = function (fn){
		_tickFns.push(fn);
	};


	/**
	 * Remove 'tick' listener
	 *
	 * @public
	 * @param   {Function}  fn
	 */
	callStack.untick = function (fn){
		var i = _tickFns.length;
		while( i-- ){
			if( _tickFns[i] === fn ){
				_tickFns.splice(i, 1);
				break;
			}
		}
	};


	/**
	 * Once 'tick' listener
	 *
	 * @public
	 * @param   {Function}  fn
	 */
	callStack.tick.one = function (fn){
		callStack.tick(function _(){
			callStack.untick(_);
			fn();
		});
	};


	/**
	 * Order flows
	 */
	callStack.order = function (){
		var args = arguments, i = args.length, j;

		while( i-- ){
			j = _order.length;
			while( j-- ){
				if( _order[j] === args[i] ){
					_order.splice(j, 1);
					break;
				}
			}
		}

		_order.splice.apply(_order, [1, 0].concat([].slice.call(args)));
	};


	/**
	 * Pause stack
	 * @public
	 */
	callStack.pause = function (){
		_pause = true;
	};


	/**
	 * Unpause stack
	 * @public
	 */
	callStack.unpause = function (){
		_pause = false;
		_walkStackTick();
	};


	/**
	 * Clear call stack
	 */
	callStack.clear = function (name){
		callStack(name || 'default').clear();
	};


	// @export
	callStack.version = '0.2.0';
	return	callStack;
});

