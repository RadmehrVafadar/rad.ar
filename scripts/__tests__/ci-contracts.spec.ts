import * as fs from 'node:fs';
import * as path from 'node:path';

const yaml = require('js-yaml') as { load(body: string): any };
const root = path.resolve(__dirname, '../..');
const workflow = (name: string) => yaml.load(
  fs.readFileSync(path.join(root, '.github/workflows', name), 'utf8'),
);

it('bounds every workflow job and cancels superseded runs', () => {
  for (const file of fs.readdirSync(path.join(root, '.github/workflows'))) {
    const config = workflow(file);
    expect(config.concurrency['cancel-in-progress']).toBe(true);
    for (const job of Object.values(config.jobs) as any[]) {
      expect(job['timeout-minutes']).toBeGreaterThan(0);
      expect(job['timeout-minutes']).toBeLessThanOrEqual(15);
    }
  }
});

it('shards fixture coverage without running live source E2E tests in PRs', () => {
  const job = workflow('ci.yml').jobs['test-sources'];
  expect(job.strategy.matrix.shard).toEqual(
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  expect(job.strategy['fail-fast']).toBe(false);
  expect(job['continue-on-error']).toBe(true);
  const step = job.steps.find((s: any) => s.run?.includes('jest.sources'));
  expect(step.run).toContain('--shard=${{ matrix.shard }}/12');
  expect(step['timeout-minutes']).toBe(10);
  const config = require('../../jest.sources.config');
  expect(config.testMatch).toEqual(['**/source-*/__tests__/**/*.spec.ts']);
  expect(config.testTimeout).toBe(15_000);
});

it('keeps live source checks manual, targeted, and bounded', () => {
  const config = workflow('source-live.yml');
  expect(Object.keys(config.on)).toEqual(['workflow_dispatch']);
  expect(config.on.workflow_dispatch.inputs.source.required).toBe(true);
  const step = config.jobs.source.steps.find((s: any) => s.name === 'Test selected source');
  expect(step.env.SOURCE).toBe('${{ inputs.source }}');
  expect(step.run).toContain('packages/plugins/$SOURCE/');
  expect(step['timeout-minutes']).toBe(5);
});
