import test from 'node:test';
import assert from 'node:assert/strict';
import { OutputOwnershipError, OutputTester } from '../src/output.mjs';

const base = {
  targetIp: '127.0.0.1',
  protocol: 'ddp',
  port: 49123,
  width: 4,
  height: 4,
  fps: 5,
  brightness: 0.2,
  pattern: 'plasma'
};

test('mapping ownership rejects delayed visual updates and stops', async () => {
  const tester = new OutputTester();
  try {
    const visual = await tester.start(base, { owner: 'visual' });
    const mapping = await tester.start({ ...base, pattern: 'matrix-flow-x' }, { owner: 'mapping' });
    assert.equal(mapping.owner, 'mapping');
    assert.equal(mapping.previousOwner, 'visual');

    await assert.rejects(
      tester.update({ ...base, pattern: 'waves' }, { owner: 'visual', streamId: visual.streamId }),
      (error) => error instanceof OutputOwnershipError && error.statusCode === 409
    );
    assert.equal(tester.status().owner, 'mapping');
    assert.equal(tester.status().config.pattern, 'matrix-flow-x');

    assert.throws(
      () => tester.stop({ owner: 'visual', streamId: visual.streamId }),
      (error) => error instanceof OutputOwnershipError && error.statusCode === 409
    );
    assert.equal(tester.status().running, true);
    assert.equal(tester.status().owner, 'mapping');

    const stopped = tester.stop({ owner: 'mapping', streamId: mapping.streamId });
    assert.equal(stopped.running, false);
    assert.equal(stopped.previousOwner, 'mapping');
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});

test('a stale update cannot restart stopped output', async () => {
  const tester = new OutputTester();
  try {
    const visual = await tester.start(base, { owner: 'visual' });
    tester.stop({ owner: 'visual', streamId: visual.streamId });
    await assert.rejects(
      tester.update({ ...base, pattern: 'waves' }, { owner: 'visual', streamId: visual.streamId }),
      (error) => error instanceof OutputOwnershipError && /no stream is running/i.test(error.message)
    );
    assert.equal(tester.status().running, false);
  } finally {
    tester.stop({ force: true });
    tester.socket.close();
  }
});
