import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import EmberObject from "ember-runtime/system/object";
import { compile } from "htmlbars-compiler/compiler";
import { equalHTML } from "../helpers";

var view;

function appendView(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
}

QUnit.module("ember-htmlbars: basic/text_node_test", {
  teardown: function(){
    if (view) {
      run(view, view.destroy);
    }
  }
});

test("property is output", function() {
  view = EmberView.create({
    context: {name: 'erik'},
    template: compile("ohai {{name}}")
  });
  appendView(view);

  equalHTML(view.element, 'ohai erik', "property is output");
});

test("path is output", function() {
  view = EmberView.create({
    context: {name: {firstName: 'erik'}},
    template: compile("ohai {{name.firstName}}")
  });
  appendView(view);

  equalHTML(view.element, 'ohai erik', "path is output");
});

test("changed property updates", function() {
  view = EmberView.create({
    context: EmberObject.create({name: 'erik'}),
    template: compile("ohai {{name}}")
  });
  appendView(view);

  equalHTML(view.element, 'ohai erik', "precond - original property is output");

  run(view, view.set, 'name', 'mmun');

  equalHTML(view.element, 'ohai mmun', "precond - original property is output");
});
