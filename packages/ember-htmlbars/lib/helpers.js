/**
@module ember
@submodule ember-handlebars
*/

import {
  simpleBind,
  bind,
  exists
} from "ember-handlebars/helpers/binding";

function bindHelper(property, options, env) {
  // TODO: Remove this in favor of an actual refactoring.
  // Make the Handlebars helper happy.
  options.data = env.data;
  options.hash = {unescaped: !options.escaped};

  if (!options.fn) {
    var lazyValue = env.data.view.getStream(property);
    return simpleBind(options.context, lazyValue, options);
  }

  options.helperName = 'bind';

  return bind.call(options.context, property, options, false, exists);
}

export {
  bindHelper
};
