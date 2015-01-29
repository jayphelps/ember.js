/**
@module ember
@submodule ember-htmlbars
*/

/**
  @class Helper
  @namespace Ember.HTMLBars
*/
export default function Helper(helper) {
  this.helperFunction = helper;

  this.isHelper = true;
  this.isHTMLBars = true;
}
