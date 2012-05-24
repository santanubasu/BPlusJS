/* 
 * Modified from http://ejohn.org/blog/simple-javascript-inheritance/
 */
(function() {
	var initializing = false, fnTest = /xyz/.test(function() {
		xyz;
	}) ? /\b_super\b/ : /.*/;
	this.Class = function() {
	};
	Class.extend = function(prop, singleton) {
		var _super = this.prototype;
		initializing = true;
		var prototype = new this();
		initializing = false;
		for ( var name in prop) {
			prototype[name] = typeof prop[name] == "function"
					&& typeof _super[name] == "function"
					&& fnTest.test(prop[name]) ? (function(name, fn) {
				return function() {
					var tmp = this._super;
					this._super = _super[name];
					var ret = fn.apply(this, arguments);
					this._super = tmp;

					return ret;
				};
			})(name, prop[name]) : prop[name];
		}
		function Class() {
			if (singleton) {
			}
			else if (!initializing&&this.init) {
				this.init.apply(this, arguments);
			}
		}
		Class.prototype = prototype;
		Class.extend = arguments.callee;
		if (singleton) {
			var instance;
			Class.getInstance = function() {
	            if (instance == null) {
	                instance = new Class();
	                if (instance.init) {
	                	instance.init.apply(instance, arguments);
	                }
	                instance.constructor = null;
	            }
	            return instance;
			};
			Class.prototype.constructor = null;
		}
		else {
			Class.prototype.constructor = Class;
		}
		return Class;
	};
})();

$.extend({
	MAX_LONG:(Math.pow(2, 63)-1),
	MAX_INT:(Math.pow(2, 31)-1),
	LOG_ERROR:3,
	LOG_WARN:2,
	LOG_INFO:1,
	LOG_DEBUG:0,
	namespace:function(ns) {
		var parts = ns.split('.');
		var parent = window;
		var currentPart = "";
		for (var i=0, length=parts.length; i<length; i++) {
			currentPart = parts[i];
			parent[currentPart] = parent[currentPart] || {};
			parent = parent[currentPart];
		}
		return parent;
	},
	log:function() { 
		if(arguments.length > 0) {
			var level = 1;
			var message = "";
			if (arguments.length > 1 && typeof arguments[0] === "number") {
				level = arguments[0];
				message = arguments.length > 2 ? Array.prototype.join.call(
						Array.prototype.splice.call(arguments, 1), " ") : arguments[1];
			} 
			else {
				message = arguments.length > 1 ? Array.prototype.join.call(arguments, " ") : arguments;
			}

			try { 
				if (level >= $.LOG_ERROR) {
					console.error(message);
				} 
				else if(level >= $.LOG_WARN) {
					console.warn(message);
				} 
				else if(level >= $.LOG_INFO) {
					console.info(message);
				} 
				else {
					console.debug(message);
				}
				return true;
			} 
			catch(e) {		
				try { 
					opera.postError(message); 
					return true;
				} catch(e) { }
			}
			return false;
		}
	},
	isBlank:function(str) {
		return (str.length==0);
	},
	isNotBlank:function(str) {
		return ($.isDefined(str)&&str!=null&&str.length>0);
	},
	isNull:function(obj) {
		return obj==null;
	},
	isNotNull:function(obj) {
		return $.isDefined(str)&&obj!=null;
	},
	isDefined:function(obj) {
		return typeof obj!=="undefined";
	},	
	isNotDefined:function(obj) {
		return !$.isDefined(obj);
	},
	generatePsuedoGuid:function() {
		return "GUID"+(-Math.floor(Math.random()*$.MAX_LONG)); 
	},
	wrapArray:function(value) {
		if ($.isArray(value)) {
			return value;
		}
		else {
			return [value];
		}
	},
	values:function(map) {
		var values = [];
		for (var key in map) {
			values.push(map[key]);
		}
		return values;
	},
	keys:function(map) {
		var keys = [];
		for (var key in map) {
			keys.push(key);
		}
		return keys;
	},
	assertQuack:function(model, candidate) {
		$.assert($.quacksLike(model, candidate), "Duck typing mismatch.");
	},
	quacksLike:function(model, candidate) {
		if ($.isPlainObject(model)&&$.isPlainObject(candidate)) {
			for (var propName in model) {
				if  ($.isDefined(candidate[propName])) {
					if (!$.quacksLike(model[propName], candidate[propName])) {
						return false;
					}
				}
				else {
					return false;
				}
			}
			return true;
		}
		else if ($.isArray(model)&&$.isArray(candidate)) {
			return true;
		}
		else if ($.isArray(model)||$.isArray(candidate)) {
			return false;
		}
		else {
			return (typeof model)===(typeof candidate);
		}
	},
	/*
	 * http://stackoverflow.com/questions/1026069/capitalize-the-first-letter-of-string-in-javascript
	 */
	capFirst:function(string) {
	    return string.charAt(0).toUpperCase() + string.slice(1);
	},
	split:function(array, n) {
	    var len = array.length;
	    var out = [];
	    var i = 0;
	    while (i<len) {
	        var size = Math.ceil((len - i)/n--);
	        out.push(array.slice(i, i += size));
	    }
	    return out;
	},
	intersection:function(sets, keyProp) {
		var thiz = this;
		var candidateHash = {};
		sets[0].forEach(function(element) {
			candidateHash[element[keyProp]] = element;
		});
		for (var i=1; i<sets.length; i++) {
			var resultHash = {};
			sets[i].forEach(function(element) {
				var pk = element[keyProp];
				if ($.isDefined(candidateHash[pk])) {
					resultHash[pk] = element;
				}
			});
			candidateHash = resultHash;
		}
		return $.values(candidateHash);
	},
	union:function(sets, keyProp) {
		var thiz = this;
		var resultHash = {};
		sets.forEach(function(set) {
			set.forEach(function(element) {
				var pk = element[keyProp];
				resultHash[pk] = element;
			});
		});
		return $.values(resultHash);
	},
	difference:function(sets, keyProp) {
		var diffs = [];
		var common = {};
		sets.forEach(function(set) {
			diffs.push([]);
		});
		for (var i=0; i<sets.length; i++) {
			sets[i].forEach(function(element) {
				var pk = element[keyProp];
				if ($.isDefined(common[pk])) {
					common[pk].count++;
				}
				else {
					common[pk] = {
						diffBin:diffs[i],
						element:element,
						count:1
					};
				}
			});			
		}
		for (var pk in common) {
			if (common[pk].count==1) {
				common[pk].diffBin.push(common[pk].element);
			}
		}
		return diffs;
	}
});