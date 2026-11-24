import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

const blocked4 = new net.BlockList();
for (const [address, bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',3]]) blocked4.addSubnet(address,bits,'ipv4');
const global6 = new net.BlockList();
global6.addSubnet('2000::',3,'ipv6');
const blocked6 = new net.BlockList();
for (const [address,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]]) blocked6.addSubnet(address,bits,'ipv6');
export function isPrivateIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return blocked4.check(ip,'ipv4');
  if (family === 6) return !global6.check(ip,'ipv6') || blocked6.check(ip,'ipv6');
  return true;
}
const hostname = url => url.hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
export function assertBrowserTargetUrl(raw) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) browser targets are allowed.');
  if (url.username || url.password) throw new Error('Browser target URLs must not contain credentials.');
  const host = hostname(url);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Local/private browser targets are blocked.');
  if (net.isIP(host) && isPrivateIp(host)) throw new Error('Private IP browser targets are blocked.');
  return url;
}
function withAbort(promise,signal) {
  if (!signal) return promise;
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason ?? new Error('Request aborted.'));
    signal.addEventListener('abort',abort,{once:true});
    promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
    if(signal.aborted)abort();
  });
}
export async function resolvePublicTarget(raw,{lookup=dns.lookup,signal}={}) {
  const url=assertBrowserTargetUrl(raw);
  if(url.port)throw new Error('Only default HTTP(S) ports are allowed for public scraping.');
  const host=hostname(url), family=net.isIP(host);
  signal?.throwIfAborted();
  const records=family?[{address:host,family}]:await withAbort(lookup(host,{all:true}),signal);
  if(!records.length||records.some(r=>net.isIP(r.address)!==r.family||isPrivateIp(r.address)))throw new Error('Target resolves to a private or unavailable address.');
  return {url,address:records[0].address,family:records[0].family};
}
export async function assertPublicUrl(raw,options) {return (await resolvePublicTarget(raw,options)).url;}
export function pinnedLookup(target) {
  return (host,options,callback)=>{
    if(host.toLowerCase().replace(/\.$/,'')!==hostname(target.url))return callback(new Error('Unexpected connection hostname.'));
    if(options?.all)return callback(null,[{address:target.address,family:target.family}]);
    callback(null,target.address,target.family);
  };
}
export async function requestPublicPage(raw,{signal,lookup}={}) {
  const target=await resolvePublicTarget(raw,{signal,lookup});
  const request=target.url.protocol==='https:'?https.request:http.request;
  return new Promise((resolve,reject)=>{
    const req=request(target.url,{method:'GET',agent:false,family:target.family,autoSelectFamily:false,lookup:pinnedLookup(target),signal,headers:{'user-agent':'VisualMakeoverBot/0.1 (+consent-first visual audit)','accept-encoding':'identity'}},res=>resolve({url:target.url,res}));
    req.once('error',reject);
    req.end();
  });
}
export function originOf(raw) {return assertBrowserTargetUrl(raw).origin;}
