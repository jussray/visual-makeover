// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { authorizeAi, type AiAccessConfig } from "./ai-access";
const issuer = "https://example-team.cloudflareaccess.com";
const config: AiAccessConfig = { enabled: true, teamDomain: issuer, audience: "studio-audience" };
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
async function fixture(overrides: Record<string, unknown> = {}) {
 const pair = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" }, true, ["sign", "verify"]);
 const key = { ...await crypto.subtle.exportKey("jwk", pair.publicKey), kid: "fixture", alg: "RS256" };
 const body = encode({ alg: "RS256", kid: "fixture" }) + "." + encode({ iss: issuer, aud: ["studio-audience"], sub: "test-user", exp: Math.floor(Date.now()/1000)+300, ...overrides });
 const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(body));
 return { jwt: body+"."+Buffer.from(signature).toString("base64url"), fetcher: vi.fn(async () => new Response(JSON.stringify({ keys: [key] }), {status:200})) };
}
describe("AI credit authorization", () => {
 it("fails closed without activation or identity, before fetching any keys", async () => {
  const fetcher = vi.fn(async () => new Response("unexpected"));
  expect(await authorizeAi({...config,enabled:false}, "any", fetcher)).toEqual({ok:false,reason:"disabled"});
  expect(await authorizeAi(config, undefined, fetcher)).toEqual({ok:false,reason:"unauthorized"});
  expect(await authorizeAi({...config,teamDomain:"https://example.com"}, "any", fetcher)).toEqual({ok:false,reason:"disabled"});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it("accepts only a valid signed, audience-bound identity", async () => {
  const {jwt,fetcher} = await fixture();
  expect(await authorizeAi(config,jwt,fetcher)).toEqual({ok:true,subject:"test-user"});
  expect(fetcher).toHaveBeenCalledWith(issuer+"/cdn-cgi/access/certs", expect.objectContaining({redirect:"error"}));
  const pieces=jwt.split(".");
  const changed=pieces[0]+"."+encode({iss:issuer,aud:["studio-audience"],sub:"forged",exp:Math.floor(Date.now()/1000)+300})+"."+pieces[2];
  expect(await authorizeAi(config,changed,fetcher)).toEqual({ok:false,reason:"unauthorized"});
 });
 it("rejects an incorrect audience and expired credentials", async () => {
  for(const bad of [{aud:["another-app"]},{exp:1},{iss:"https://other.cloudflareaccess.com"}]){
   const {jwt,fetcher}=await fixture(bad);
   expect(await authorizeAi(config,jwt,fetcher)).toEqual({ok:false,reason:"unauthorized"});
   expect(fetcher).not.toHaveBeenCalled();
  }
 });
 it("denies provider certificate failure", async () => {
  const {jwt}=await fixture();
  expect(await authorizeAi(config,jwt,async()=>new Response("unavailable",{status:503}))).toEqual({ok:false,reason:"unauthorized"});
 });
});
