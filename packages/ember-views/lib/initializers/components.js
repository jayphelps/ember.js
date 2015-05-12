import { onLoad } from 'ember-runtime/system/lazy_load';
import TextField from 'ember-views/views/text_field';
import TextArea from 'ember-views/views/text_area';
import Checkbox from 'ember-views/views/checkbox';
import LegacyEachView from 'ember-views/views/legacy_each_view';

onLoad('Ember.Application', function(Application) {
  Application.initializer({
    name: 'ember-views-components',
    initialize(registry) {
      registry.register('component:-text-field', TextField);
      registry.register('component:-text-area', TextArea);
      registry.register('component:-checkbox', Checkbox);
      registry.register('view:-legacy-each', LegacyEachView);
    }
  });
});
