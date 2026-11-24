import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateIp, assertBrowserTargetUrl } from '../src/security.mjs';

test('deny non-global address classes for public network requests', () => {
  for (const address of ['0.0.0.0','100.64.1.2','192.0.2.10','224.1.2.3','::','::ffff:127.0.0.1','fe90::1','2001:db8::1']) assert.equal(isPrivateIp(address),true,address);
  assert.equal(isPrivateIp('8.8.8.8'),false);
  assert.equal(isPrivateIp('2606:4700:4700::1111'),false);
});
test('reject bracketed non-global URL targets',()=>{
  assert.throws(()=>assertBrowserTargetUrl('https://[::1]/'),/private/i);
  assert.throws(()=>assertBrowserTargetUrl('https://[fd00::1]/'),/private/i);
});

import { resolvePublicTarget, pinnedLookup } from '../src/security.mjs';
test('validate every resolved address and pin the chosen address for connection',async()=>{
  let lookups=0;
  const lookup=async()=>{lookups++;return [{address:'8.8.8.8',family:4}];};
  const target=await resolvePublicTarget('https://example.com/',{lookup});
  assert.equal(lookups,1);
  pinnedLookup(target)('example.com',{all:true},(err,records)=>{assert.ifError(err);assert.deepEqual(records,[{address:'8.8.8.8',family:4}]);});
  assert.equal(lookups,1);
  await assert.rejects(resolvePublicTarget('https://example.com/',{lookup:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]}),/private/);
  await assert.rejects(resolvePublicTarget('https://example.com:8443/',{lookup}),/default/);
});
test('bounded DNS wait aborts',async()=>{
  const controller=new AbortController();
  const pending=resolvePublicTarget('https://example.com/',{lookup:()=>new Promise(()=>{}),signal:controller.signal});
  controller.abort();
  await assert.rejects(pending);
});
