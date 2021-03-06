// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
'REMOVE_USE_STRICT: true';

import isEnabled from 'ember-metal/features';
import { protoMethods as listenerMethods } from 'ember-metal/meta_listeners';
import EmptyObject from 'ember-metal/empty_object';

/**
@module ember-metal
*/

/*
 This declares several meta-programmed members on the Meta class. Such
 meta!

 In general, the `readable` variants will give you an object (if it
 already exists) that you can read but should not modify. The
 `writable` variants will give you a mutable object, and they will
 create it if it didn't already exist.

 The following methods will get generated metaprogrammatically, and
 I'm including them here for greppability:

 writableCache, readableCache, writableWatching, readableWatching,
 peekWatching, clearWatching, writableMixins, readableMixins,
 peekMixins, clearMixins, writableBindings, readableBindings,
 peekBindings, clearBindings, writableValues, readableValues,
 peekValues, clearValues, writableDeps, readableDeps, getAllDeps
 writableChainWatchers, readableChainWatchers, writableChains,
 readableChains

*/
let members = {
  cache: ownMap,
  watching: inheritedMap,
  mixins: inheritedMap,
  bindings: inheritedMap,
  values: inheritedMap,
  deps: inheritedMapOfMaps,
  chainWatchers: ownCustomObject,
  chains: inheritedCustomObject
};

let memberNames = Object.keys(members);

function Meta(obj, parentMeta) {
  this.cache = undefined;
  this.watching = undefined;
  this.mixins = undefined;
  this.bindings = undefined;
  this.values = undefined;
  this.deps = undefined;
  this.chainWatchers = undefined;
  this.chains = undefined;
  // used only internally
  this.source = obj;

  // when meta(obj).proto === obj, the object is intended to be only a
  // prototype and doesn't need to actually be observable itself
  this.proto = undefined;

  // The next meta in our inheritance chain. We (will) track this
  // explicitly instead of using prototypical inheritance because we
  // have detailed knowledge of how each property should really be
  // inherited, and we can optimize it much better than JS runtimes.
  this.parent = parentMeta;

  this._initializeListeners();
}

for (let name in listenerMethods) {
  Meta.prototype[name] = listenerMethods[name];
}
memberNames.forEach(name => members[name](name, Meta));

// Implements a member that is a lazily created, non-inheritable
// POJO.
function ownMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function() {
    return this._getOrCreateOwnMap(key);
  };
  Meta.prototype['readable' + capitalized] = function() { return this[key]; };
}

Meta.prototype._getOrCreateOwnMap = function(key) {
  let ret = this[key];
  if (!ret) {
    ret = this[key] = new EmptyObject();
  }
  return ret;
};

// Implements a member that is a lazily created POJO with inheritable
// values.
function inheritedMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype['writable' + capitalized] = function() {
    return this._getOrCreateInheritedMap(key);
  };

  Meta.prototype['readable' + capitalized] = function() {
    return this._getInherited(key);
  };

  Meta.prototype['peek' + capitalized] = function(subkey) {
    let map = this._getInherited(key);
    if (map) {
      return map[subkey];
    }
  };

  Meta.prototype['clear' + capitalized] = function() {
    this[key] = new EmptyObject();
  };
}

Meta.prototype._getOrCreateInheritedMap = function(key) {
  let ret = this[key];
  if (!ret) {
    if (this.parent) {
      ret = this[key] = Object.create(this.parent._getOrCreateInheritedMap(key));
    } else {
      ret = this[key] = new EmptyObject();
    }
  }
  return ret;
};

Meta.prototype._getInherited = function(key) {
  let pointer = this;
  while (pointer !== undefined) {
    if (pointer[key]) {
      return pointer[key];
    }
    pointer = pointer.parent;
  }
};

// Implements a member that provides a lazily created map of maps,
// with inheritance at both levels.
function inheritedMapOfMaps(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype['writable' + capitalized] = function(subkey) {
    let outerMap = this._getOrCreateInheritedMap(key);
    let innerMap = outerMap[subkey];
    if (!innerMap) {
      innerMap = outerMap[subkey] = new EmptyObject();
    } else if (!Object.hasOwnProperty.call(outerMap, subkey)) {
      innerMap = outerMap[subkey] = Object.create(innerMap);
    }
    return innerMap;
  };

  Meta.prototype['readable' + capitalized] = function(subkey) {
    let map = this._getInherited(key);
    if (map) {
      return map[subkey];
    }
  };

  Meta.prototype['getAll' + capitalized] = function() {
    return this._getInherited(key);
  };
}

// Implements a member that provides a non-heritable, lazily-created
// object using the method you provide.
function ownCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function(create) {
    let ret = this[key];
    if (!ret) {
      ret = this[key] = create(this.source);
    }
    return ret;
  };
  Meta.prototype['readable' + capitalized] = function() {
    return this[key];
  };
}

// Implements a member that provides an inheritable, lazily-created
// object using the method you provide. We will derived children from
// their parents by calling your object's `copy()` method.
function inheritedCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function(create) {
    let ret = this[key];
    if (!ret) {
      if (this.parent) {
        ret = this[key] = this.parent['writable' + capitalized](create).copy(this.source);
      } else {
        ret = this[key] = create(this.source);
      }
    }
    return ret;
  };
  Meta.prototype['readable' + capitalized] = function() {
    return this._getInherited(key);
  };
}


function memberProperty(name) {
  return '_' + name;
}

// there's a more general-purpose capitalize in ember-runtime, but we
// don't want to make ember-metal depend on ember-runtime.
function capitalize(name) {
  return name.replace(/^\w/, m => m.toUpperCase());
}

export var META_DESC = {
  writable: true,
  configurable: true,
  enumerable: false,
  value: null
};

var EMBER_META_PROPERTY = {
  name: '__ember_meta__',
  descriptor: META_DESC
};

// Placeholder for non-writable metas.
export var EMPTY_META = new Meta(null);

if (isEnabled('mandatory-setter')) {
  EMPTY_META.writableValues();
}

/**
  Retrieves the meta hash for an object. If `writable` is true ensures the
  hash is writable for this object as well.

  The meta object contains information about computed property descriptors as
  well as any watched properties and other information. You generally will
  not access this information directly but instead work with higher level
  methods that manipulate this hash indirectly.

  @method meta
  @for Ember
  @private

  @param {Object} obj The object to retrieve meta for
  @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
    the meta hash, allowing the method to avoid making an unnecessary copy.
  @return {Object} the meta hash for an object
*/
export function meta(obj, writable) {
  var ret = obj.__ember_meta__;
  if (writable === false) {
    return ret || EMPTY_META;
  }

  if (ret && ret.source === obj) {
    return ret;
  }

  if (!ret) {
    ret = new Meta(obj);
    if (isEnabled('mandatory-setter')) {
      ret.writableValues();
    }
  } else {
    ret = new Meta(obj, ret);
  }

  if (obj.__defineNonEnumerable) {
    obj.__defineNonEnumerable(EMBER_META_PROPERTY);
  } else {
    Object.defineProperty(obj, '__ember_meta__', META_DESC);
  }
  obj.__ember_meta__ = ret;

  return ret;
}
