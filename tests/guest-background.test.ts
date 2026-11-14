import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featherAlpha} from '../lib/guest-background';
import {explainDeviceError} from '../lib/studio-device-error';
test('person mask keeps foreground and removes room with a soft edge',()=>{assert.equal(featherAlpha(0),0);assert.equal(featherAlpha(1),255);assert.ok(featherAlpha(.5)>100&&featherAlpha(.5)<155);for(let i=1;i<=100;i++)assert.ok(featherAlpha(i/100)>=featherAlpha((i-1)/100));});
test('device recovery distinguishes missing and busy hardware',()=>{const missing=new Error();missing.name='NotFoundError';assert.match(explainDeviceError(missing,'camera',false,false),/No camera/);const busy=new Error();busy.name='NotReadableError';assert.match(explainDeviceError(busy,'microphone',false,false),/busy/);});
