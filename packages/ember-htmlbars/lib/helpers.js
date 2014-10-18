/**
@module ember
@submodule ember-handlebars
*/

import run from "ember-metal/run_loop";

/*
import {
  bind,
  exists
} from "ember-handlebars/helpers/binding";
*/

import {
  SimpleHandlebarsView
} from "ember-handlebars/views/handlebars_bound_view";

function simpleBind(params, options, env) {
  var parentView = env.data.view;
  var lazyValue = params[0];

  var view = new SimpleHandlebarsView(
    lazyValue, options.escaped
  );

  view._parentView = parentView;
  view._morph = options.morph;
  parentView.appendChild(view);

  lazyValue.subscribe(parentView._wrapAsScheduled(function() {
    run.scheduleOnce('render', view, 'rerender');
  }));
}

function bindHelper(params, options, env) {
  if (options.fn) {
    // This code path has not been tested at all
    // TODO: is this needed?
    // options.helperName = 'bind';
    // bind.call(options.context, property, options, false, exists);
    throw "not implemented";
  } else {
    simpleBind(params, options, env);
  }
}

export {
  bindHelper
};
