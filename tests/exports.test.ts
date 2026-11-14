import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, transcriptText } from '../lib/exports';
import { DEFAULT_CONFIG } from '../lib/types';
import { generateContent } from '../lib/interview';
import type { Episode } from '../lib/types';

test('timestamp formatting handles invalid, negative and long sessions', () => {
  assert.equal(formatTime(-2),'00:00');
  assert.equal(formatTime(Number.NaN),'00:00');
  assert.equal(formatTime(75.9),'01:15');
  assert.equal(formatTime(3665),'1:01:05');
});

test('text export distinguishes transcript from media and discloses demo', () => {
  const episode:Episode={id:'e1',createdAt:'2026-11-13T12:00:00Z',config:{...DEFAULT_CONFIG,guest:'Sam',topic:'Building useful tools'},duration:30,transcript:[{id:'g1',role:'guest',text:'The first customer taught us to listen.',timestamp:8}],content:generateContent(DEFAULT_CONFIG,[],30),engine:'demo'};
  const output=transcriptText(episode);
  assert.match(output,/DEMO MODE/);
  assert.match(transcriptText({...episode,sample:true}),/FICTIONAL WRITTEN SAMPLE — no interview, audio or video was recorded/);
  assert.match(output,/not a recorded podcast/);
  assert.match(output,/\[00:08\] Sam: The first customer taught us to listen./);
});
