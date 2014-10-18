import Stream from "ember-metal/streams/stream";
import {readArray} from "ember-metal/streams/read";

function streamifyArgs(view, params, options, env) {
  // Convert ID params to streams
  for (var i = 0, l = params.length; i < l; i++) {
    if (options.types[i] === 'id') {
      params[i] = view.getStream(params[i]);
    }
  }

  // Convert hash ID values to streams
  var hash = options.hash;
  var hashTypes = options.hashTypes;
  for (var key in hash) {
    if (hashTypes[key] === 'id') {
      hash[key] = view.getStream(hash[key]);
    }
  }
}

export function content(morph, path, view, params, options, env) {
  var hooks = env.hooks;

  // TODO: just set escaped on the morph in HTMLBars
  morph.escaped = options.escaped;
  var helper = hooks.lookupHelper(path, env);
  if (!helper) {
    helper = hooks.lookupHelper('bindHelper', env);
    // Modify params to include the first word
    params.unshift(path);
    options.types = ['id'];
  }

  streamifyArgs(view, params, options, env);
  return helper(params, options, env);
}

export function element(element, path, view, params, options, env) { //jshint ignore:line
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(view, params, options, env);
    return helper(element, params, options, env);
  } else {
    return view.getStream(path);
  }
}

export function subexpr(path, view, params, options, env) {
  var hooks = env.hooks;
  var helper = hooks.lookupHelper(path, env);

  if (helper) {
    streamifyArgs(view, params, options, env);
    return helper(params, options, env);
  } else {
    return view.getStream(path);
  }
}

export function lookupHelper(name, env) {
  if (name === 'concat') { return concat; }
  if (name === 'attribute') { return attribute; }
  return env.helpers[name];
}

function attribute(element, params, options) {
  var name = params[0],
      value = params[1];

  value.subscribe(function(lazyValue) {
    element.setAttribute(name, lazyValue.value());
  });

  element.setAttribute(name, value.value());
}

function concat(params, options) {
  var stream = new Stream(function() {
    return readArray(params).join('');
  });

  params.forEach(function(param) {
    if (param && param.isStream) {
      param.subscribe(stream.notifyAll, stream);
    }
  });

  return stream;
}
