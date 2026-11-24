// Server-only authorization for billable provider calls. No request header is trusted until its signature, issuer and audience are checked.
export type AiAccessConfig = { enabled: boolean; teamDomain?: string | undefined; audience?: string | undefined };
type AccessResult = {ok:true;subject:string} | {ok:false;reason:"disabled"|"unauthorized"};
const unauthorized = {ok:false,reason:"unauthorized"} as const;
const disabled = {ok:false,reason:"disabled"} as const;
function issuerFor(domain: string | undefined): string | null {
 if (!domain) return null;
 try {
  const url=new URL(domain.includes("://")?domain:"https://"+domain);
  if(url.protocol!=="https:" || url.username || url.password || url.port || url.pathname!=="/" || url.search || url.hash || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(url.hostname)) return null;
  return url.origin;
 } catch { return null; }
}
function decode(value:string): Uint8Array<ArrayBuffer> {
 if(!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid encoding");
 const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"="));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function object(value:string): Record<string,unknown> {
 const parsed:unknown=JSON.parse(new TextDecoder().decode(decode(value)));
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw new Error("Invalid claim");
 return parsed as Record<string,unknown>;
}
export async function authorizeAi(config:AiAccessConfig,jwt:string|undefined,fetcher:typeof fetch=fetch):Promise<AccessResult>{
 const issuer=issuerFor(config.teamDomain);
 if(!config.enabled||!issuer||!config.audience)return disabled;
 if(!jwt||jwt.length>8192)return unauthorized;
 try{
  const parts=jwt.split(".");
  if(parts.length!==3)return unauthorized;
  const [h,p,s]=parts;
  if(!h||!p||!s)return unauthorized;
  const header=object(h),payload=object(p);
  const now=Math.floor(Date.now()/1000);
  const aud=Array.isArray(payload["aud"])?payload["aud"]:[payload["aud"]];
  const subject=payload["sub"],exp=payload["exp"],nbf=payload["nbf"];
  if(header["alg"]!=="RS256"||typeof header["kid"]!=="string"||payload["iss"]!==issuer||!aud.includes(config.audience)||typeof subject!=="string"||!subject||subject.length>256||typeof exp!=="number"||!Number.isFinite(exp)||exp<=now||(nbf!==undefined&&(typeof nbf!=="number"||!Number.isFinite(nbf)||nbf>now)))return unauthorized;
  const response=await fetcher(issuer+"/cdn-cgi/access/certs",{headers:{accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(5000)});
  if(!response.ok)return unauthorized;
  const body=await response.json() as {keys?: Array<JsonWebKey & {kid?:string}>};
  const jwk=Array.isArray(body.keys)?body.keys.find(k=>k.kid===header["kid"]&&k.kty==="RSA"&&(!k.alg||k.alg==="RS256")):undefined;
  if(!jwk)return unauthorized;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(s),new TextEncoder().encode(h+"."+p));
  return valid?{ok:true,subject}:unauthorized;
 }catch{return unauthorized;}
}
