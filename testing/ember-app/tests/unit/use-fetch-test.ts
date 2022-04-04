import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { setComponentTemplate } from '@ember/component';
// import { destroy } from '@ember/destroyable';
import { click, render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest, setupTest } from 'ember-qunit';

// import { timeout } from 'ember-concurrency';
import { useFetch } from 'ember-resources';

window.fetch = function <Response>(
  url: string,
  _config: RequestInit | undefined
): Promise<Response> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        json() {
          return { url };
        },
      } as unknown as Response);
    }, 100);
  });
};

module('useFetch', function () {
  module('in js', function (hooks) {
    setupTest(hooks);

    test('fetch reacts to tracked dependencies changing', async function (assert) {
      type TestResponse = { url: string };

      class Test {
        @tracked property = 'a';
        @tracked count = 1;

        handleData(data: TestResponse) {
          assert.step(`run ${this.count}, value: ${data.url}`);

          this.count++;

          return data;
        }

        data = useFetch<TestResponse>(
          this,
          () => `http://www.something.com/${this.property}`,
          { headers: { 'Content-Type': 'application/json' } },
          this.handleData.bind(this)
        );
      }

      let foo = new Test();

      debugger;

      assert.strictEqual(foo.data.value, undefined, 'Initially undefined');

      foo.data.value;
      await settled();
      assert.strictEqual(foo.data.value.url, `http://www.something.com/a`, 'Change 1');

      foo.data.value;
      await settled();
      assert.strictEqual(foo.data.value.url, `http://www.something.com/a`, 'Change 2');

      foo.property = 'b';
      foo.data.value;
      await settled();
      assert.strictEqual(foo.data.value.url, `http://www.something.com/b`, 'Change 3');

      assert.verifySteps([
        'run 1, value: http://www.something.com/a',
        'run 2, value: http://www.something.com/b',
      ]);
    });
  });

  module('in templates', function (hooks) {
    setupRenderingTest(hooks);

    test('it works in templates', async function (assert) {
      class Test extends Component {
        @tracked count = 1;

        data = useFetch<{ url: string }>(
          this,
          () => this.count,
          (data) => data.url
        );

        increment = () => this.count++;
      }

      const TestComponent = setComponentTemplate(
        hbs`
        <out>{{this.data.value}}</out>
        <button type='button' {{on 'click' this.increment}}></button>`,
        Test
      );

      this.setProperties({ TestComponent });

      await render(hbs`<this.TestComponent />`);

      assert.dom('out').hasText('1');

      await click('button');

      assert.dom('out').hasText('2');
    });
  });
});
