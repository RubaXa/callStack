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
	 * Sort  calls stack
	 * @private
	 * @returns {number}
	 */
	function _sortStack(a, b){
		return	(a.weight > b.weight) ? -1 : (b.weight == a.weight ? 0 : 1);
	}


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
			var name, stack, i, n, callee, s = 0, sn = _order.length;

			for( ; s < sn; s++ ){
				name	= _order[s];
				if( _stacks[name] !== void 0 ){
					stack = _stacks[name].calls;

					i = 0;
					n = stack.length;

					_stacks[name].calls = [];

					for( ; i < n; i++ ){
						callee = stack[i];
						callee.fn.apply(callee.ctx, callee.args);
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


		opts = opts || {
			uniq: false,
			weight: 0
		};

		if( opts.weight !== 0 ){
			stack.sortable = true;
		}

		return function (){
			if( !opts.uniq || _ifNotInStack(stack.calls, fn, arguments, opts.uniq) ){
				stack.calls.push({
					  fn: fn
					, ctx: ctx
					, args: arguments
					, weight: opts.weight || 0
				});

				if( stack.sortable === true ){
					stack.calls.sort(_sortStack);
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
				clear: function (){
					this.calls = [];
				}
			};
			_order.push(name);
		}

		return	_stacks[name];
	}


	/**
	 * Add to 'default' stack
	 *
	 * @public
	 * @param   {Object|Function}   ctx
	 * @param   {Function|String}   [fn]
	 * @param   {Object}            [opts]    Object({ uniq: false, weight: 0 })
	 * @return  {Function}
	 */
	callStack.wrap = function (){
		var def = callStack('default');
		return	def.wrap.apply(def, arguments);
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
	return	callStack;
});
