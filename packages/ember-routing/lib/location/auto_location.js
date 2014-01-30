if (Ember.FEATURES.isEnabled("ember-routing-auto-location")) {
  /**
  @module ember
  @submodule ember-routing
  */

  var get = Ember.get, set = Ember.set;
  var documentMode = document.documentMode,
      history = window.history,
      location = window.location;

  /**
    Ember.AutoLocation will select the best location option based off browser
    support with the priority order: history, hash, none.

    Clean pushState paths accessed by hashchange-only browsers will be redirected
    to the hash-equivalent and vice versa so future transitions look consistent.

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

    /**
      @private

      We assume that if the history object has a pushState method, the host should
      support HistoryLocation.

      @property supportsHistory
    */
    supportsHistory: (function () {
      // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
      // The stock browser on Android 2.2 & 2.3 returns positive on history support
      // Unfortunately support is really buggy and there is no clean way to detect
      // these bugs, so we fall back to a user agent sniff :(
      var userAgent = window.navigator.userAgent;

      // We only want Android 2, stock browser, and not Chrome which identifies
      // itself as 'Mobile Safari' as well
      if (userAgent.indexOf('Android 2') !== -1 &&
          userAgent.indexOf('Mobile Safari') !== -1 &&
          userAgent.indexOf('Chrome') === -1) {
        return false;
      }

      return !!(history && 'pushState' in history);
    })(),

    /**
      @private

      IE8 running in IE7 compatibility mode gives false positive, so we must also
      check documentMode.

      @property supportsHashChange
    */
    supportsHashChange: ('onhashchange' in window && (documentMode === undefined || documentMode > 7 )),

    create: function (options) {
      if (options && options.rootURL) {
        this.rootURL = options.rootURL;
      }

      var implementationClass, historyPath, hashPath,
          cancelRouterSetup = false,
          currentPath = this.getFullPath();

      if (this.supportsHistory) {
        historyPath = this.getHistoryPath();

        // Since we support history paths, let's be sure we're using them else 
        // switch the location over to it.
        if (currentPath === historyPath) {
          implementationClass = Ember.HistoryLocation;
        } else {
          cancelRouterSetup = true;
          location.replace(historyPath);
        }

      } else if (this.supportsHashChange) {
        hashPath = this.getHashPath();

        // Be sure we're using a hashed path, otherwise let's switch over it to so
        // we start off clean and consistent.
        if (currentPath === hashPath) {
          implementationClass = Ember.HashLocation;
        } else {
          cancelRouterSetup = true;
          location.replace(hashPath);
        }
      }

      // If none has been set
      if (!implementationClass) {
        implementationClass = Ember.NoneLocation;
      }

      var implementation = implementationClass.create.apply(implementationClass, arguments);

      if (cancelRouterSetup) {
        set(implementation, 'cancelRouterSetup', true);
      }
      
      return implementation;
    },

    /**
      @private

      Returns the current `location.pathname`, normalized for IE inconsistencies.

      @method getPath
    */
    getPath: function () {
      var pathname = location.pathname;
      // Various versions of IE/Opera don't always return a leading slash
      if (pathname.charAt(0) !== '/') {
        pathname = '/' + pathname;
      }

      return pathname;
    },

    /**
      @private

      Returns the current `location.hash`

      @method getHash
    */
    getHash: function () {
      return location.hash;
    },

    /**
      @private

      Returns the full pathname including the hash string.

      @method getFullPath
    */
    getFullPath: function () {
      return this.getPath() + this.getHash();
    },

    /**
      @private

      Returns the current path as it should appear for HistoryLocation supported
      browsers. This may very well differ from the real current path (e.g. if it 
      starts off as a hashed URL)

      @method getHistoryPath
    */
    getHistoryPath: function () {
      var path = this.getPath(),  
          hash = this.getHash();

      // By convention, Ember.js routes using HashLocation are required to start
      // with `#/`. Anything else should NOT be considered a route and should
      // be passed straight through, without transformation.
      if (hash.substr(0, 2) === '#/') {
        // If the path already has a trailing slash, remove the one
        // from the hashed route so we don't double up.
        if (path.slice(-1) === '/') {
            path += hash.substr(2);
        } else {
            path += hash.substr(1);
        }
      } else {
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
      var historyPath = this.getHistoryPath(),
          exp = new RegExp('(' + this.rootURL + ')(.+)'),
          url = historyPath.replace(exp, '$1#/$2');

      // Remove any stacked double stashes
      url = url.replace(/\/\//, '/');

      return url;
    }

  };
}