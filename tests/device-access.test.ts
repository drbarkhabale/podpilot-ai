import test from 'node:test';
import assert from 'node:assert/strict';
import {permissionMessage,inspectDeviceAccess,assertDevicePolicy} from '../lib/device-access';
test('blocked embedded policy is not presented as a user-declined prompt',()=>{const text=permissionMessage('camera',true,true);assert.match(text,/permissions policy/);assert.match(text,/standalone studio/);assert.doesNotMatch(text,/declined/);});
test('unknown embedded denial recommends standalone while top-level denial points to actual site controls',()=>{assert.match(permissionMessage('microphone',true,false),/may not allow/);assert.match(permissionMessage('microphone',false,false),/address-bar site controls/);});
test('policy inspection blocks unavailable features but permits normal and unsupported policy APIs',()=>{
 const w=Object.getOwnPropertyDescriptor(globalThis,'window'),d=Object.getOwnPropertyDescriptor(globalThis,'document');
 try{const self={};Object.defineProperty(globalThis,'window',{configurable:true,value:{self,top:{}}});Object.defineProperty(globalThis,'document',{configurable:true,value:{permissionsPolicy:{allowsFeature:(f:string)=>f==='microphone'}}});assert.deepEqual(inspectDeviceAccess('camera'),{embedded:true,policyBlocked:true});assert.throws(()=>assertDevicePolicy('camera'),/permissions policy/);assert.doesNotThrow(()=>assertDevicePolicy('microphone'));Object.defineProperty(globalThis,'document',{configurable:true,value:{}});assert.equal(inspectDeviceAccess('camera').policyBlocked,false);}
 finally{if(w)Object.defineProperty(globalThis,'window',w);else Reflect.deleteProperty(globalThis,'window');if(d)Object.defineProperty(globalThis,'document',d);else Reflect.deleteProperty(globalThis,'document');}
});
