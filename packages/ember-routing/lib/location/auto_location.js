if (Ember.FEATURES.isEnabled("ember-routing-auto-location")) {
  /**
  @module ember
  @submodule ember-routing
  */

  var get = Ember.get, set = Ember.set,
      history = window.history;

  /**
    Ember.AutoLocation will select the best location option based off browser
    support with the priority order: history, hash, none.

    Clean pushState paths accessed by hashchange-only browsers will be redirected
    to the hash-equivalent and vice versa so future transitions are consistent.

    Keep in mind that since some of your users will use `HistoryLocation`, your
    server must serve the Ember app at all the routes you define.

    @class AutoLocation
    @namespace Ember
    @static
  */
  var AutoLocation = Ember.AutoLocation = {

    /**
      Will be pre-pended to path upon state change.

      @property rootURL
      @default '/'
    */
    rootURL: '/',

    window: window,
    location: window.location,
    history: history,

    // Included on context so we can mock them in testing
    HistoryLocation: Ember.HistoryLocation,
    HashLocation: Ember.HashLocation,
    NoneLocation: Ember.NoneLocation,

    /**
      @private

      We assume that if the history object has a pushState method, the host should
      support HistoryLocation.

      @method getSupportsHistory
    */
    getSupportsHistory: function () {
      // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
      // The stock browser on Android 2.2 & 2.3 returns positive on history support
      // Unfortunately support is really buggy and there is no clean way to detect
      // these bugs, so we fall back to a user agent sniff :(
      var userAgent = this.window.navigator.userAgent;

      // We only want Android 2, stock browser, and not Chrome which identifies
      // itself as 'Mobile Safari' as well
      if (userAgent.indexOf('Android 2') !== -1 &&
          userAgent.indexOf('Mobile Safari') !== -1 &&
          userAgent.indexOf('Chrome') === -1) {
        return false;
      }

      return !!(this.history && 'pushState' in this.history);
    },

    /**
      @private

      IE8 running in IE7 compatibility mode gives false positive, so we must also
      check documentMode.

      @method getSupportsHashChange
    */
    getSupportsHashChange: function () {
      var window = this.window,
          documentMode = window.document.documentMode;

      return ('onhashchange' in window && (documentMode === undefined || documentMode > 7 ));
    },

    create: function (options) {
      if (options && options.rootURL) {
        this.rootURL = options.rootURL;
      }

      var implementationClass, historyPath, hashPath,
          cancelRouterSetup = false,
          currentPath = this.getFullPath();

      if (this.getSupportsHistory()) {
        historyPath = this.getHistoryPath();

        implementationClass = this.HistoryLocation;

        // Directly change the history, so we start off as expected, before
        // HistoryLocation takes over
        if (currentPath !== historyPath) {
          this.history.replaceState(null, null, historyPath);  
        }

      } else if (this.getSupportsHashChange()) {
        hashPath = this.getHashPath();

        // Be sure we're using a hashed path, otherwise let's switch over it to so
        // we start off clean and consistent. We'll count an index path with no
        // hash as "good enough" as well.
        if (currentPath === hashPath || (currentPath === '/' && hashPath === '/#/')) {
          implementationClass = this.HashLocation;
        } else {
          // Our URL isn't in the expected hash-supported format, so we want to
          // cancel the router setup and replace the URL to start off clean
          implementationClass = this.NoneLocation;
          cancelRouterSetup = true;
          this.location.replace(hashPath);
        }
      }

      // If none has been set
      if (!implementationClass) {
        implementationClass = this.NoneLocation;
      }

      var implementation = implementationClass.create.apply(implementationClass, arguments);

      if (cancelRouterSetup) {
        set(implementation, 'cancelRouterSetup', true);
      }
      
      return implementation;
    },

    /**
      @private

      @method getRootURL
    */
    getRootURL: function () {
      return this.rootURL;
    },

    /**
      @private

      Returns the current `location.pathname`, normalized for IE inconsistencies.

      @method getPath
    */
    getPath: function () {
      var pathname = this.location.pathname;
      // Various versions of IE/Opera don't always return a leading slash
      if (pathname.charAt(0) !== '/') {
        pathname = '/' + pathname;
      }

      return pathname;
    },

    /**
      @private

      Returns normalized location.hash

      @method getHash
    */
    getHash: Ember.Location.getHash,

    /**
      @private

      Returns location.search

      @method getQuery
    */
    getQuery: function () {
      return this.location.search;
    },

    /**
      @private

      Returns the full pathname including query and hash

      @method getFullPath
    */
    getFullPath: function () {
      return this.getPath() + this.getQuery() + this.getHash();
    },

    /**
      @private

      Returns the current path as it should appear for HistoryLocation supported
      browsers. This may very well differ from the real current path (e.g. if it 
      starts off as a hashed URL)

      @method getHistoryPath
    */
    getHistoryPath: function () {
      var rootURL = this.getRootURL(),
          path = this.getPath(),
          hash = this.getHash(),
          query = this.getQuery(),
          rootURLIndex = path.indexOf(rootURL),
          routeHash, hashParts;

      Ember.assert('Path ' + path + ' does not start with the provided rootURL ' + rootURL, rootURLIndex === 0);

      // By convention, Ember.js routes using HashLocation are required to start
      // with `#/`. Anything else should NOT be considered a route and should
      // be passed straight through, without transformation.
      if (hash.substr(0, 2) === '#/') {
        // There could be extra hash segments after the route
        hashParts = hash.substr(1).split('#');
        // The first one is always the route url
        routeHash = hashParts.shift();

        // If the path already has a trailing slash, remove the one
        // from the hashed route so we don't double up.
        if (path.slice(-1) === '/') {
            routeHash = routeHash.substr(1);
        }

        // This is the "expected" final order
        path += routeHash;
        path += query;

        if (hashParts.length) {
          path += '#' + hashParts.join('#');
        }
      } else {
        path += query;
        path += hash;
      }

      return path;
    },

    /**
      @private

      Returns the current path as it should appear for HashLocation supported
      browsers. This may very well differ from the real current path.

      @method getHashPath
    */
    getHashPath: function () {
      var rootURL = this.getRootURL(),
          path = rootURL,
          historyPath = this.getHistoryPath(),
          routePath = historyPath.substr(rootURL.length);

      if (routePath !== '') {
        if (routePath.charAt(0) !== '/') {
          routePath = '/' + routePath;
        }

        path += '#' + routePath;
      }

      return path;
    }
  };
}