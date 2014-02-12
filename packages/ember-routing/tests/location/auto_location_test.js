var AutoTestLocation, location, supportsHistory, supportsHashChange, App,
    Router, router, container,
    copy = Ember.copy, get = Ember.get, set = Ember.set,
    AutoLocation = Ember.AutoLocation,
    getSupportsHistory = AutoLocation.getSupportsHistory,
    getSupportsHashChange = AutoLocation.getSupportsHashChange;

var FakeHistoryLocation = Ember.Object.extend({
  implementation: 'history'
});

var FakeHashLocation = Ember.Object.extend({
  implementation: 'hash'
});

var FakeNoneLocation = Ember.Object.extend({
  implementation: 'none'
});

function createLocation(options) {
  if (!options) { options = {}; }
  location = AutoTestLocation.create(options);
}

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

module("Ember.AutoLocation", {
  setup: function() {
    supportsHistory = supportsHashChange = null;

    AutoTestLocation = Ember.copy(AutoLocation);

    AutoTestLocation.HistoryLocation = FakeHistoryLocation;
    AutoTestLocation.HashLocation = FakeHashLocation;
    AutoTestLocation.NoneLocation = FakeNoneLocation;

    AutoTestLocation.getSupportsHistory = function () {
      if (supportsHistory !== null) {
        return supportsHistory;
      } else {
        return getSupportsHistory.call(this);
      }
    };

    AutoTestLocation.getSupportsHashChange = function () {
      if (supportsHashChange !== null) {
        return supportsHashChange;
      } else {
        return getSupportsHashChange.call(this);
      }
    };

    AutoTestLocation.location = {
      href: 'http://test.com/',
      pathname: '/',
      hash: '',
      search: '',
      replace: function () {
        ok(false, 'location.replace should not be called');
      }
    };

    AutoTestLocation.history = {
      pushState: function () {
        ok(false, 'history.pushState should not be called');
      },
      replaceState: function () {
        ok(false, 'history.replaceState should not be called');
      }
    };

    /*Ember.run(function() {
      App = Ember.Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });

      App.deferReadiness();

      Router = App.Router;
      container = App.__container__;
    });*/
  },

  teardown: function() {
    Ember.run(function() {
      if (location) { location.destroy(); }
      AutoTestLocation = null;
      //App.destroy();
      //App = null;
    });
  }
});

test("AutoLocation.create() should return a HistoryLocation instance when pushStates are supported", function() {
  expect(2);

  supportsHistory = true;

  createLocation();

  equal(get(location, 'implementation'), 'history');
  equal(location instanceof FakeHistoryLocation, true);
});

test("AutoLocation.create() should return a HashLocation instance when pushStates are not supported, but hashchange events are and the URL is already in the HashLocation format", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation.location.hash = '#/test';

  createLocation();

  equal(get(location, 'implementation'), 'hash');
  equal(location instanceof FakeHashLocation, true);
});

test("AutoLocation.create() should return a NoneLocation instance when neither history nor hashchange is supported.", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = false;

  AutoTestLocation.location.hash = '#/test';

  createLocation();

  equal(get(location, 'implementation'), 'none');
  equal(location instanceof FakeNoneLocation, true);
});

test("AutoLocation.create() should consider an index path (i.e. '/\') without any location.hash as OK for HashLocation", function() {
  expect(2);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation.location = {
    href: 'http://test.com/',
    pathname: '/',
    hash: '',
    search: '',
    replace: function (path) {
      ok(false, 'location.replace should not be called');
    }
  };

  createLocation();

  equal(get(location, 'implementation'), 'hash');
  equal(location instanceof FakeHashLocation, true);
});

test("AutoLocation.getSupportsHistory() should use `history.pushState` existance as proof of support", function() {
  expect(3);

  AutoTestLocation.history.pushState = function () {};
  equal(AutoTestLocation.getSupportsHistory(), true, 'Returns true if `history.pushState` exists');
  
  AutoTestLocation.history = {};
  equal(AutoTestLocation.getSupportsHistory(), false, 'Returns false if `history.pushState` does not exist');

  AutoTestLocation.history = undefined;
  equal(AutoTestLocation.getSupportsHistory(), false, 'Returns false if `history` does not exist');
});

test("AutoLocation.create() should transform the URL for hashchange-only browsers viewing a HistoryLocation-formatted path", function() {
  expect(4);

  supportsHistory = false;
  supportsHashChange = true;

  AutoTestLocation.location = {
    href: 'http://test.com/test',
    pathname: '/test',
    hash: '',
    search: '',
    replace: function (path) {
      equal(path, '/#/test', 'location.replace should be called with normalized HashLocation path');
    }
  };

  createLocation();

  equal(get(location, 'implementation'), 'none', 'NoneLocation should be returned while we attempt to location.replace()');
  equal(location instanceof FakeNoneLocation, true, 'NoneLocation should be returned while we attempt to location.replace()');
  equal(get(location, 'cancelRouterSetup'), true, 'cancelRouterSetup should be set so the router knows.');
});

test("AutoLocation.create() should transform the URL for pushState-supported browsers viewing a HashLocation-formatted path", function() {
  expect(3);

  supportsHistory = true;
  supportsHashChange = true;

  AutoTestLocation.location = {
    href: 'http://test.com/#/test',
    pathname: '/',
    hash: '#/test',
    search: '',
    replace: function () {
      ok(false, 'location.replace should not be called');
    }
  };

  AutoTestLocation.history.replaceState = function (arg1, arg2, path) {
    equal(path, '/test', 'history.replaceState should be called with normalized HistoryLocation path');
  };

  createLocation();

  equal(get(location, 'implementation'), 'history');
  equal(location instanceof FakeHistoryLocation, true);
});

test("AutoLocation.getSupportsHistory() should handle false positive for Android 2.2/2.3, returning false", function() {
  expect(1);

  var fakeNavigator = {
    userAgent: 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
  };

  AutoTestLocation.window.navigator = fakeNavigator;

  equal(AutoTestLocation.getSupportsHistory(), false);
});

test("AutoLocation.getSupportsHashChange() should use `onhashchange` event existance as proof of support", function() {
  expect(2);

  AutoTestLocation.window.onhashchange = null;
  equal(AutoTestLocation.getSupportsHashChange(), true, 'Returns true if `onhashchange` exists');
  
  AutoTestLocation.window = {
    navigator: window.navigator,
    document: {}
  };

  equal(AutoTestLocation.getSupportsHashChange(), false, 'Returns false if `onhashchange` does not exist');
});

test("AutoLocation.getSupportsHashChange() should handle false positive for IE8 running in IE7 compatibility mode, returning false", function() {
  expect(1);

  AutoTestLocation.window = {
    onhashchange: null,
    document: {
      documentMode: 7
    }
  };

  equal(AutoTestLocation.getSupportsHashChange(), false);
});

test("AutoLocation.getPath() should normalize location.pathname, making sure it always returns a leading slash", function() {
  expect(2);

  AutoTestLocation.location = { pathname: 'test' };
  equal(AutoTestLocation.getPath(), '/test', 'When there is no leading slash, one is added.');

  AutoTestLocation.location = { pathname: '/test' };
  equal(AutoTestLocation.getPath(), '/test', 'When a leading slash is already there, it isn\'t added again');
});

test("AutoLocation.getHash() should be a reference to Ember.Location.getHash, otherwise it needs its own test!", function() {
  expect(1);

  equal(AutoTestLocation.getHash, Ember.Location.getHash);
});

test("AutoLocation.getQuery() should return location.search as-is", function() {
  expect(1);

  AutoTestLocation.location = { search: '?foo=bar' };
  equal(AutoTestLocation.getQuery(), '?foo=bar');
});

test("AutoLocation.getFullPath() should return full pathname including query and hash", function() {
  expect(1);

  AutoTestLocation.location = {
    href: 'http://test.com/about?foo=bar#foo',
    pathname: '/about',
    search: '?foo=bar',
    hash: '#foo'
  };

  equal(AutoTestLocation.getFullPath(), '/about?foo=bar#foo');
});

test("AutoLocation.getHistoryPath() should return a normalized, HistoryLocation-supported path", function() {
  expect(3);

  AutoTestLocation.rootURL = '/app/';

  AutoTestLocation.location = {
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  };
  equal(AutoTestLocation.getHistoryPath(), '/app/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  AutoTestLocation.location = {
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  };
  equal(AutoTestLocation.getHistoryPath(), '/app/about?foo=bar#foo', 'HashLocation formed URLs should be normalized');

  AutoTestLocation.location = {
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  };
  equal(AutoTestLocation.getHistoryPath(), '/app/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});

test("AutoLocation.getHashPath() should return a normalized, HashLocation-supported path", function() {
  expect(3);

  AutoTestLocation.rootURL = '/app/';

  AutoTestLocation.location = {
    href: 'http://test.com/app/#/about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#/about?foo=bar#foo'
  };
  equal(AutoTestLocation.getHashPath(), '/app/#/about?foo=bar#foo', 'URLs already in HistoryLocation form should come out the same');

  AutoTestLocation.location = {
    href: 'http://test.com/app/about?foo=bar#foo',
    pathname: '/app/about',
    search: '?foo=bar',
    hash: '#foo'
  };
  equal(AutoTestLocation.getHashPath(), '/app/#/about?foo=bar#foo', 'HistoryLocation formed URLs should be normalized');

  AutoTestLocation.location = {
    href: 'http://test.com/app/#about?foo=bar#foo',
    pathname: '/app/',
    search: '',
    hash: '#about?foo=bar#foo'
  };
  equal(AutoTestLocation.getHashPath(), '/app/#/#about?foo=bar#foo', 'URLs with a hash not following #/ convention shouldn\'t be normalized as a route');
});

/*test("AutoTestLocation.getRootURL() should return the rootURL provided to the Router", function() {
  expect(1);

  var expectedRootURL = '/app';

  supportsHistory = true;
  supportsHashChange = true;

  App.Router.reopen({
    rootURL: expectedRootURL
  });

  bootApplication();

  alert(router.location);

  //equal(location.getRootURL(), expectedRootURL);
});*/