$(document).ready(function() {

  var router = null;
  var location = null;
  var lastRoute = null;
  var lastArgs = [];

  function onRoute(router, route, args) {
    lastRoute = route;
    lastArgs = args;
  }

  var Location = function(href) {
    this.replace(href);
  };

  _.extend(Location.prototype, {

    replace: function(href) {
      _.extend(this, _.pick($('<a></a>', {href: href})[0],
        'href',
        'hash',
        'host',
        'search',
        'fragment',
        'pathname',
        'protocol'
      ));
      // In IE, anchor.pathname does not contain a leading slash though
      // window.location.pathname does.
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    },

    toString: function() {
      return this.href;
    }

  });

  module("Backbone.Router", {

    setup: function() {
      location = new Location('http://example.com');
      Backbone.history = new Backbone.History({location: location});
      router = new Router({testing: 101});
      Backbone.history.interval = 9;
      Backbone.history.start({pushState: false});
      lastRoute = null;
      lastArgs = [];
      Backbone.history.on('route', onRoute);
    },

    teardown: function() {
      Backbone.history.stop();
      Backbone.history.off('route', onRoute);
    }

  });

  var Router = Backbone.Router.extend({

    count: 0,

    routes: {
      "noCallback":                 "noCallback",
      "counter":                    "counter",
      "search/:query":              "search",
      "search/:query/p:page":       "search",
      "contacts":                   "contacts",
      "contacts/new":               "newContact",
      "contacts/:id":               "loadContact",
      "splat/*args/end":            "splat",
      "*first/complex-:part/*rest": "complex",
      ":entity?*args":              "query",
      "*anything":                  "anything"
    },

    initialize : function(options) {
      this.testing = options.testing;
      this.route('implicit', 'implicit');
    },

    counter: function() {
      this.count++;
    },

    implicit: function() {
      this.count++;
    },

    search : function(query, page) {
      this.query = query;
      this.page = page;
    },

    contacts: function(){
      this.contact = 'index';
    },

    newContact: function(){
      this.contact = 'new';
    },

    loadContact: function(){
      this.contact = 'load';
    },

    splat : function(args) {
      this.args = args;
    },

    complex : function(first, part, rest) {
      this.first = first;
      this.part = part;
      this.rest = rest;
    },

    query : function(entity, args) {
      this.entity    = entity;
      this.queryArgs = args;
    },

    anything : function(whatever) {
      this.anything = whatever;
    }

  });

  test("Router: initialize", 1, function() {
    equal(router.testing, 101);
  });

  test("Router: routes (simple)", 4, function() {
    location.replace('http://example.com#search/news');
    Backbone.history.checkUrl();
    equal(router.query, 'news');
    equal(router.page, undefined);
    equal(lastRoute, 'search');
    equal(lastArgs[0], 'news');
  });

  test("Router: routes (two part)", 2, function() {
    location.replace('http://example.com#search/nyc/p10');
    Backbone.history.checkUrl();
    equal(router.query, 'nyc');
    equal(router.page, '10');
  });

  test("Router: routes via navigate", 2, function() {
    Backbone.history.navigate('search/manhattan/p20', {trigger: true});
    equal(router.query, 'manhattan');
    equal(router.page, '20');
  });

  test("Router: routes via navigate for backwards-compatibility", 2, function() {
    Backbone.history.navigate('search/manhattan/p20', true);
    equal(router.query, 'manhattan');
    equal(router.page, '20');
  });

  test("Router: route precedence via navigate", 6, function(){
    // check both 0.9.x and backwards-compatibility options
    _.each([ { trigger: true }, true ], function( options ){
      Backbone.history.navigate('contacts', options);
      equal(router.contact, 'index');
      Backbone.history.navigate('contacts/new', options);
      equal(router.contact, 'new');
      Backbone.history.navigate('contacts/foo', options);
      equal(router.contact, 'load');
    });
  });

  test("loadUrl is not called for identical routes.", 0, function() {
    Backbone.history.loadUrl = function(){ ok(false); };
    location.replace('http://example.com#route');
    Backbone.history.navigate('route');
    Backbone.history.navigate('/route');
    Backbone.history.navigate('/route');
  });

  test("Router: use implicit callback if none provided", 1, function() {
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    equal(router.count, 1);
  });

  test("Router: routes via navigate with {replace: true}", 1, function() {
    location.replace('http://example.com#start_here');
    Backbone.history.checkUrl();
    location.replace = function(href) {
      strictEqual(href, new Location('http://example.com#end_here').href);
    };
    Backbone.history.navigate('end_here', {replace: true});
  });

  test("Router: routes (splats)", 1, function() {
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Backbone.history.checkUrl();
    equal(router.args, 'long-list/of/splatted_99args');
  });

  test("Router: routes (complex)", 3, function() {
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Backbone.history.checkUrl();
    equal(router.first, 'one/two/three');
    equal(router.part, 'part');
    equal(router.rest, 'four/five/six/seven');
  });

  test("Router: routes (query)", 5, function() {
    location.replace('http://example.com#mandel?a=b&c=d');
    Backbone.history.checkUrl();
    equal(router.entity, 'mandel');
    equal(router.queryArgs, 'a=b&c=d');
    equal(lastRoute, 'query');
    equal(lastArgs[0], 'mandel');
    equal(lastArgs[1], 'a=b&c=d');
  });

  test("Router: routes (anything)", 1, function() {
    location.replace('http://example.com#doesnt-match-a-route');
    Backbone.history.checkUrl();
    equal(router.anything, 'doesnt-match-a-route');
  });

  test("Router: fires event when router doesn't have callback on it", 1, function() {
    router.on("route:noCallback", function(){ ok(true); });
    location.replace('http://example.com#noCallback');
    Backbone.history.checkUrl();
  });

  test("#933, #908 - leading slash", 2, function() {
    location.replace('http://example.com/root/foo');

    Backbone.history.stop();
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.start({root: '/root', hashChange: false, silent: true});
    strictEqual(Backbone.history.getFragment(), 'foo');

    Backbone.history.stop();
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.start({root: '/root/', hashChange: false, silent: true});
    strictEqual(Backbone.history.getFragment(), 'foo');
  });

  test("#1003 - History is started before navigate is called", 1, function() {
    Backbone.history.stop();
    Backbone.history.navigate = function(){ ok(Backbone.History.started); };
    Backbone.history.start();
    // If this is not an old IE navigate will not be called.
    if (!Backbone.history.iframe) ok(true);
  });

  test("Router: route callback gets passed decoded values", 3, function() {
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Backbone.history.navigate(route, {trigger: true});
    equal(router.first, 'has/slash');
    equal(router.part, 'has#hash');
    equal(router.rest, 'has space');
  });

  test("Router: correctly handles URLs with % (#868)", 3, function() {
    location.replace('http://example.com#search/fat%3A1.5%25');
    Backbone.history.checkUrl();
    location.replace('http://example.com#search/fat');
    Backbone.history.checkUrl();
    equal(router.query, 'fat');
    equal(router.page, undefined);
    equal(lastRoute, 'search');
  });

  test("#1185 - Use pathname when hashChange is not wanted.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/path/name#hash');
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.start({hashChange: false});
    var fragment = Backbone.history.getFragment();
    strictEqual(fragment, location.pathname.replace(/^\//, ''));
  });

  test("#1206 - Strip leading slash before location.assign.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root/');
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.start({hashChange: false, root: '/root/'});
    location.assign = function(pathname) {
      strictEqual(pathname, '/root/fragment');
    };
    Backbone.history.navigate('/fragment');
  });

  test("#1387 - Root fragment without trailing slash.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.start({hashChange: false, root: '/root/', silent: true});
    strictEqual(Backbone.history.getFragment(), '');
  });

  test("#1366 - History does not prepend root to fragment.", 2, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root/');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/root/x');
        }
      }
    });
    Backbone.history.start({
      root: '/root/',
      pushState: true,
      hashChange: false
    });
    Backbone.history.navigate('x');
    strictEqual(Backbone.history.fragment, 'x');
  });

  test("Router: Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '/root',
      hashChange: false
    });
    Backbone.history.navigate('fragment');
  });

  test("Router: Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root#fragment');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(state, title, url) {},
        replaceState: function(state, title, url) {
          strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test("Router: Normalize root.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = new Backbone.History({location: location});
    Backbone.history.loadUrl = function() { ok(true); };
    Backbone.history.start({
      pushState: true,
      root: '/root'
    });
  });

  test("Normalize root - leading slash.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(){}
      }
    });
    Backbone.history.start({root: 'root'});
    strictEqual(Backbone.history.root, '/root/');
  });

  test("Transition from hashChange to pushState.", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/root#x/y');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(state, title, url){
          strictEqual(url, '/root/x/y');
        }
      }
    });
    Backbone.history.start({
      root: 'root',
      pushState: true
    });
  });

  test("#1619: Router: Normalize empty root", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(){},
        replaceState: function(){}
      }
    });
    Backbone.history.start({root: ''});
    strictEqual(Backbone.history.root, '/');
  });

  test("#1619: Router: nagivate with empty root", 1, function() {
    Backbone.history.stop();
    location.replace('http://example.com/');
    Backbone.history = new Backbone.History({
      location: location,
      history: {
        pushState: function(state, title, url) {
          strictEqual(url, '/fragment');
        }
      }
    });
    Backbone.history.start({
      pushState: true,
      root: '',
      hashChange: false
    });
    Backbone.history.navigate('fragment');
  });

});
