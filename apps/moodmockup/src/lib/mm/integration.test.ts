import {describe,it,expect} from "vitest";
import {BriefSchema,ScreenSchema} from "./schema";
import {automaticChecks,emptyAudience} from "./review";
import {storyboardKey,imagePayload} from "./storyboard";
import {buildDesignReceipt} from "./portfolio";
const brief=BriefSchema.parse({direction:"Calm.",palette:[{hex:"#112233",role:"primary",name:"Ink"},{hex:"#445566",role:"secondary",name:"Slate"},{hex:"#AA3300",role:"accent",name:"Clay"},{hex:"#EEEEEE",role:"background",name:"Paper"},{hex:"#DDDDDD",role:"text",name:"Light"}],typography:{heading:"Fraunces",body:"DM Sans",reasoning:"Contrast."},imagery:"Photos.",layout:"Open.",tone:"Kind.",avoid:["Neon"]});
const plan=(kind:"home"|"feature")=>ScreenSchema.parse({kind,title:kind,caption:"Journey",density:"airy",radius:"soft",blocks:[{kind:"chips",items:["One","Two"]},{kind:"button",label:"Next",variant:"primary"},{kind:"button",label:"Another",variant:"primary"}]});
const plans=[plan("home"),plan("feature")];
describe("design integration",()=>{
 it("flags base contrast on each screen",()=>expect(automaticChecks(brief,plans,emptyAudience).filter(f=>f.category==="contrast"&&f.blockIndex==null).map(f=>f.screen)).toEqual(["home","feature"]));
 it("targets motor and cognitive needs per screen",()=>{const f=automaticChecks(brief,plans,{...emptyAudience,needs:["large_touch_targets","plain_language"]});expect(f.filter(x=>x.category==="touch_targets").map(x=>x.screen)).toEqual(["home","feature"]);expect(f.filter(x=>x.category==="cognitive_load")).toHaveLength(2);});
 it("invalidates panels on audience or order change",()=>{const k=storyboardKey(brief,"App",emptyAudience,plans);expect(storyboardKey(brief,"App",{...emptyAudience,notes:"New"},plans)).not.toBe(k);expect(storyboardKey(brief,"App",emptyAudience,[...plans].reverse())).not.toBe(k);});
 it("rejects invalid image data",()=>{expect(imagePayload("data:image/png;base64,AAAA","png")).toBe("AAAA");expect(()=>imagePayload("data:image/jpeg;base64,AAAA","png")).toThrow();expect(()=>imagePayload("data:image/png;base64,@@@!","png")).toThrow();});
 it("does not promote a draft receipt to authority or leak input",async()=>{const r=await buildDesignReceipt({brief,plans,audience:emptyAudience,description:"private premise",stale:true,reviewStale:true,localFindings:2,illustrated:0});expect(r.continuity.state).toBe("stale");expect(r.governance.executionAuthorized).toBe(false);expect(r.peerInvocations).toBe(0);expect(r.fingerprint).toMatch(/^[0-9a-f]{64}$/);expect(JSON.stringify(r)).not.toContain("private premise");});
});
