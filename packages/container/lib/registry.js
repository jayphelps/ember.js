import Ember from 'ember-metal/core'; // Ember.assert
import dictionary from 'ember-metal/dictionary';
import Container from './container';

var VALID_FULL_NAME_REGEXP = /^[^:]+.+:[^:]+$/;

/**
 A lightweight registry used to store factory and option information keyed
 by type.

 A `Registry` stores the factory and option information needed by a
 `Container` to instantiate and cache objects.

 The public API for `Registry` is still in flux and should not be considered
 stable.

 @private
 @class Registry
*/
export default function Registry(options) {
  this.resolver = options && options.resolver ? options.resolver : function() {};

  this.registrations  = dictionary(options && options.registrations ? options.registrations : null);
  this.typeInjections = dictionary(options && options.typeInjections ? options.typeInjections : null);
  this.injections     = dictionary(null);
  this.factoryTypeInjections = dictionary(null);
  this.factoryInjections     = dictionary(null);

  this._normalizeCache = dictionary(null);
  this._resolveCache   = dictionary(null);

  this._options     = dictionary(options && options.options ? options.options : null);
  this._typeOptions = dictionary(options && options.typeOptions ? options.typeOptions : null);
}

Registry.prototype = {
  /**
   @property resolver
   @type function
   */
  resolver: null,

  /**
   @property registrations
   @type InheritingDict
   */
  registrations: null,

  /**
   @property typeInjections
   @type InheritingDict
   */
  typeInjections: null,

  /**
   @property injections
   @type InheritingDict
   */
  injections: null,

  /**
   @property factoryTypeInjections
   @type InheritingDict
   */
  factoryTypeInjections: null,

  /**
   @property factoryInjections
   @type InheritingDict
   */
  factoryInjections: null,

  /**
   @private

   @property _normalizeCache
   @type InheritingDict
   */
  _normalizeCache: null,

  /**
   @private

   @property _resolveCache
   @type InheritingDict
   */
  _resolveCache: null,

  /**
   @private

   @property _options
   @type InheritingDict
   */
  _options: null,

  /**
   @private

   @property _typeOptions
   @type InheritingDict
   */
  _typeOptions: null,

  /**
   The first container created for this registry.

   This allows deprecated access to `lookup` and `lookupFactory` to avoid
   breaking compatibility for Ember 1.x initializers.

   @private
   @property _defaultContainer
   @type Container
   */
   _defaultContainer: null,

  /**
   Creates a container based on this registry.

   @method container
   @param {Object} options
   @return {Container} created container
   */
  container: function(options) {
    var container = new Container(this, options);

    // Allow deprecated access to the first child container's `lookup` and
    // `lookupFactory` methods to avoid breaking compatibility for Ember 1.x
    // initializers.
    if (!this._defaultContainer) {
      this._defaultContainer = container;
    }

    return container;
  },

  lookup: function(fullName, options) {
    Ember.assert('Create a container on the registry (with `registry.container()`) before calling `lookup`.', this._defaultContainer);

    if (Ember.FEATURES.isEnabled('ember-application-instance-initializers')) {
      Ember.deprecate('`lookup` was called on a Registry. The `initializer` API no longer receives a container, and you should use an `instanceInitializer` to look up objects from the container.', { url: "http://emberjs.com/guides/deprecations#toc_deprecate-access-to-instances-in-initializers" });
    }

    return this._defaultContainer.lookup(fullName, options);
  },

  lookupFactory: function(fullName) {
    Ember.assert('Create a container on the registry (with `registry.container()`) before calling `lookupFactory`.', this._defaultContainer);

    if (Ember.FEATURES.isEnabled('ember-application-instance-initializers')) {
      Ember.deprecate('`lookupFactory` was called on a Registry. The `initializer` API no longer receives a container, and you should use an `instanceInitializer` to look up objects from the container.', { url: "http://emberjs.com/guides/deprecations#toc_deprecate-access-to-instances-in-initializers" });
    }

    return this._defaultContainer.lookupFactory(fullName);
  },

  /**
   Registers a factory for later injection.

   Example:

   ```javascript
   var registry = new Registry();

   registry.register('model:user', Person, {singleton: false });
   registry.register('fruit:favorite', Orange);
   registry.register('communication:main', Email, {singleton: false});
   ```

   @method register
   @param {String} fullName
   @param {Function} factory
   @param {Object} options
   */
  register: function(fullName, factory, options) {
    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));

    if (factory === undefined) {
      throw new TypeError('Attempting to register an unknown factory: `' + fullName + '`');
    }

    var normalizedName = this.normalize(fullName);

    if (this._resolveCache[normalizedName]) {
      throw new Error('Cannot re-register: `' + fullName +'`, as it has already been resolved.');
    }

    this.registrations[normalizedName] = factory;
    this._options[normalizedName] = (options || {});
  },

  /**
   Unregister a fullName

   ```javascript
   var registry = new Registry();
   registry.register('model:user', User);

   registry.resolve('model:user').create() instanceof User //=> true

   registry.unregister('model:user')
   registry.resolve('model:user') === undefined //=> true
   ```

   @method unregister
   @param {String} fullName
   */
  unregister: function(fullName) {
    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));

    var normalizedName = this.normalize(fullName);

    delete this.registrations[normalizedName];
    delete this._resolveCache[normalizedName];
    delete this._options[normalizedName];
  },

  /**
   Given a fullName return the corresponding factory.

   By default `resolve` will retrieve the factory from
   the registry.

   ```javascript
   var registry = new Registry();
   registry.register('api:twitter', Twitter);

   registry.resolve('api:twitter') // => Twitter
   ```

   Optionally the registry can be provided with a custom resolver.
   If provided, `resolve` will first provide the custom resolver
   the opportunity to resolve the fullName, otherwise it will fallback
   to the registry.

   ```javascript
   var registry = new Registry();
   registry.resolver = function(fullName) {
      // lookup via the module system of choice
    };

   // the twitter factory is added to the module system
   registry.resolve('api:twitter') // => Twitter
   ```

   @method resolve
   @param {String} fullName
   @return {Function} fullName's factory
   */
  resolve: function(fullName) {
    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));
    return resolve(this, this.normalize(fullName));
  },

  /**
   A hook that can be used to describe how the resolver will
   attempt to find the factory.

   For example, the default Ember `.describe` returns the full
   class name (including namespace) where Ember's resolver expects
   to find the `fullName`.

   @method describe
   @param {String} fullName
   @return {string} described fullName
   */
  describe: function(fullName) {
    return fullName;
  },

  /**
   A hook to enable custom fullName normalization behaviour

   @method normalizeFullName
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalizeFullName: function(fullName) {
    return fullName;
  },

  /**
   normalize a fullName based on the applications conventions

   @method normalize
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalize: function(fullName) {
    return this._normalizeCache[fullName] || (
        this._normalizeCache[fullName] = this.normalizeFullName(fullName)
      );
  },

  /**
   @method makeToString

   @param {any} factory
   @param {string} fullName
   @return {function} toString function
   */
  makeToString: function(factory, fullName) {
    return factory.toString();
  },

  /**
   Given a fullName check if the container is aware of its factory
   or singleton instance.

   @method has
   @param {String} fullName
   @return {Boolean}
   */
  has: function(fullName) {
    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));
    return has(this, this.normalize(fullName));
  },

  /**
   Allow registering options for all factories of a type.

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   // if all of type `connection` must not be singletons
   registry.optionsForType('connection', { singleton: false });

   registry.register('connection:twitter', TwitterConnection);
   registry.register('connection:facebook', FacebookConnection);

   var twitter = container.lookup('connection:twitter');
   var twitter2 = container.lookup('connection:twitter');

   twitter === twitter2; // => false

   var facebook = container.lookup('connection:facebook');
   var facebook2 = container.lookup('connection:facebook');

   facebook === facebook2; // => false
   ```

   @method optionsForType
   @param {String} type
   @param {Object} options
   */
  optionsForType: function(type, options) {
    this._typeOptions[type] = options;
  },

  getOptionsForType: function(type) {
    return this._typeOptions[type];
  },

  /**
   @method options
   @param {String} fullName
   @param {Object} options
   */
  options: function(fullName, options) {
    options = options || {};
    var normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  },

  getOptions: function(fullName) {
    var normalizedName = this.normalize(fullName);
    return this._options[normalizedName];
  },

  getOption: function(fullName, optionName) {
    var options = this._options[fullName];

    if (options && options[optionName] !== undefined) {
      return options[optionName];
    }

    var type = fullName.split(':')[0];
    options = this._typeOptions[type];

    if (options) {
      return options[optionName];
    }
  },

  option: function(fullName, optionName) {
    Ember.deprecate('`Registry.option()` has been deprecated. Call `Registry.getOption()` instead.');
    return this.getOption(fullName, optionName);
  },

  /**
   Used only via `injection`.

   Provides a specialized form of injection, specifically enabling
   all objects of one type to be injected with a reference to another
   object.

   For example, provided each object of type `controller` needed a `router`.
   one would do the following:

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('router:main', Router);
   registry.register('controller:user', UserController);
   registry.register('controller:post', PostController);

   registry.typeInjection('controller', 'router', 'router:main');

   var user = container.lookup('controller:user');
   var post = container.lookup('controller:post');

   user.router instanceof Router; //=> true
   post.router instanceof Router; //=> true

   // both controllers share the same router
   user.router === post.router; //=> true
   ```

   @private
   @method typeInjection
   @param {String} type
   @param {String} property
   @param {String} fullName
   */
  typeInjection: function(type, property, fullName) {
    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));

    var fullNameType = fullName.split(':')[0];
    if (fullNameType === type) {
      throw new Error('Cannot inject a `' + fullName +
      '` on other ' + type +
      '(s). Register the `' + fullName +
      '` as a different type and perform the typeInjection.');
    }

    var injections = this.typeInjections[type] ||
                     (this.typeInjections[type] = []);

    injections.push({
      property: property,
      fullName: fullName
    });
  },

  /**
   Defines injection rules.

   These rules are used to inject dependencies onto objects when they
   are instantiated.

   Two forms of injections are possible:

   * Injecting one fullName on another fullName
   * Injecting one fullName on a type

   Example:

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('source:main', Source);
   registry.register('model:user', User);
   registry.register('model:post', Post);

   // injecting one fullName on another fullName
   // eg. each user model gets a post model
   registry.injection('model:user', 'post', 'model:post');

   // injecting one fullName on another type
   registry.injection('model', 'source', 'source:main');

   var user = container.lookup('model:user');
   var post = container.lookup('model:post');

   user.source instanceof Source; //=> true
   post.source instanceof Source; //=> true

   user.post instanceof Post; //=> true

   // and both models share the same source
   user.source === post.source; //=> true
   ```

   @method injection
   @param {String} factoryName
   @param {String} property
   @param {String} injectionName
   */
  injection: function(fullName, property, injectionName) {
    this.validateFullName(injectionName);
    var normalizedInjectionName = this.normalize(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.typeInjection(fullName, property, normalizedInjectionName);
    }

    Ember.assert('fullName must be a proper full name', this.validateFullName(fullName));
    var normalizedName = this.normalize(fullName);

    var injections = this.injections[normalizedName] ||
                     (this.injections[normalizedName] = []);

    injections.push({
      property: property,
      fullName: normalizedInjectionName
    });
  },


  /**
   Used only via `factoryInjection`.

   Provides a specialized form of injection, specifically enabling
   all factory of one type to be injected with a reference to another
   object.

   For example, provided each factory of type `model` needed a `store`.
   one would do the following:

   ```javascript
   var registry = new Registry();

   registry.register('store:main', SomeStore);

   registry.factoryTypeInjection('model', 'store', 'store:main');

   var store = registry.lookup('store:main');
   var UserFactory = registry.lookupFactory('model:user');

   UserFactory.store instanceof SomeStore; //=> true
   ```

   @private
   @method factoryTypeInjection
   @param {String} type
   @param {String} property
   @param {String} fullName
   */
  factoryTypeInjection: function(type, property, fullName) {
    var injections = this.factoryTypeInjections[type] ||
                     (this.factoryTypeInjections[type] = []);

    injections.push({
      property: property,
      fullName: this.normalize(fullName)
    });
  },

  /**
   Defines factory injection rules.

   Similar to regular injection rules, but are run against factories, via
   `Registry#lookupFactory`.

   These rules are used to inject objects onto factories when they
   are looked up.

   Two forms of injections are possible:

   * Injecting one fullName on another fullName
   * Injecting one fullName on a type

   Example:

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('store:main', Store);
   registry.register('store:secondary', OtherStore);
   registry.register('model:user', User);
   registry.register('model:post', Post);

   // injecting one fullName on another type
   registry.factoryInjection('model', 'store', 'store:main');

   // injecting one fullName on another fullName
   registry.factoryInjection('model:post', 'secondaryStore', 'store:secondary');

   var UserFactory = container.lookupFactory('model:user');
   var PostFactory = container.lookupFactory('model:post');
   var store = container.lookup('store:main');

   UserFactory.store instanceof Store; //=> true
   UserFactory.secondaryStore instanceof OtherStore; //=> false

   PostFactory.store instanceof Store; //=> true
   PostFactory.secondaryStore instanceof OtherStore; //=> true

   // and both models share the same source instance
   UserFactory.store === PostFactory.store; //=> true
   ```

   @method factoryInjection
   @param {String} factoryName
   @param {String} property
   @param {String} injectionName
   */
  factoryInjection: function(fullName, property, injectionName) {
    var normalizedName = this.normalize(fullName);
    var normalizedInjectionName = this.normalize(injectionName);

    this.validateFullName(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.factoryTypeInjection(normalizedName, property, normalizedInjectionName);
    }

    var injections = this.factoryInjections[normalizedName] || (this.factoryInjections[normalizedName] = []);

    injections.push({
      property: property,
      fullName: normalizedInjectionName
    });
  },

  validateFullName: function(fullName) {
    if (!VALID_FULL_NAME_REGEXP.test(fullName)) {
      throw new TypeError('Invalid Fullname, expected: `type:name` got: ' + fullName);
    }
    return true;
  },

  validateInjections: function(injections) {
    if (!injections) { return; }

    var fullName;

    for (var i = 0, length = injections.length; i < length; i++) {
      fullName = injections[i].fullName;

      if (!this.has(fullName)) {
        throw new Error('Attempting to inject an unknown injection: `' + fullName + '`');
      }
    }
  },

  normalizeInjectionsHash: function(hash) {
    var injections = [];

    for (var key in hash) {
      if (hash.hasOwnProperty(key)) {
        Ember.assert("Expected a proper full name, given '" + hash[key] + "'", this.validateFullName(hash[key]));

        injections.push({
          property: key,
          fullName: hash[key]
        });
      }
    }

    return injections;
  }
};

function resolve(registry, normalizedName) {
  var cached = registry._resolveCache[normalizedName];
  if (cached) { return cached; }

  var resolved = registry.resolver(normalizedName) || registry.registrations[normalizedName];
  registry._resolveCache[normalizedName] = resolved;

  return resolved;
}

function has(registry, fullName) {
  return registry.resolve(fullName) !== undefined;
}
