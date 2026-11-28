import { describe, expect, it } from '@jest/globals';

import { describeError } from '../errors';

describe('describeError', () => {
  it('explains offline / paused server', () => {
    expect(describeError(new TypeError('Network request failed'))).toMatch(
      /Can't reach the server/,
    );
    expect(describeError(new TypeError('Failed to fetch'))).toMatch(/asleep/);
  });
  it('explains expired sessions and server errors', () => {
    expect(describeError(new Error('JWT expired'))).toMatch(/session expired/);
    expect(describeError(new Error('503 Service Unavailable'))).toMatch(/trouble/);
  });
  it('falls back for anything else', () => {
    expect(describeError(new Error('weird'), 'Could not load.')).toBe('Could not load.');
    expect(describeError(undefined)).toBe('Something went wrong.');
  });
});
