import EmberObject from "ember-runtime/system/object";
import { compile } from "htmlbars-compiler/compiler";
import { defaultEnv } from "ember-htmlbars";
import { equalHTML } from "../helpers";

QUnit.module("ember-htmlbars: hooks/content_test");

test("property is output", function() {
  var template = compile("ohai {{name}}");
  var output = template({name: 'erik'}, defaultEnv, document.body);
  equalHTML(output, "ohai erik");
});

test("path is output", function() {
  var template = compile("ohai {{name.firstName}}");
  var output = template({name: {firstName: 'erik'}}, defaultEnv, document.body);
  equalHTML(output, "ohai erik");
});

test("changed property updates", function() {
  var context = EmberObject.create({
    name: 'erik'
  });
  var template = compile("ohai {{name}}");
  var output = template(context, defaultEnv, document.body);
  equalHTML(output, "ohai erik");
  Ember.run(context, context.set, 'name', 'mmun');
  equal(output, "ohai mmun");
});
