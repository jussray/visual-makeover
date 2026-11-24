import type { Brief, ScreenPlan } from "./schema";
import type { Audience } from "./review";
import { storyboardKey } from "./storyboard";
export interface ReceiptInput {
 brief:Brief; plans:ScreenPlan[]; audience:Audience; description:string; stale:boolean;reviewStale:boolean;localFindings:number;illustrated:number;
}
/** Local draft evidence, not a SOL-issued continuity cookie, Chief-issued capability plan, or FCR approval. */
export async function buildDesignReceipt(input:ReceiptInput){
 const bytes=new TextEncoder().encode(storyboardKey(input.brief,input.description,input.audience,input.plans));
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
 return {contract:"visual-makeover/design-receipt@v1",status:"draft",createdAt:new Date().toISOString(),source:"moodmockup",fingerprint:hash,
  continuity:{peer:"solcontinuity",state:input.stale?"stale":"current-inputs",peerVerified:false},
  planning:{peer:"chief-ai-machine",status:"not_requested",requestedAuthority:"reason",proofRequirements:["client and SSR build","desktop and 320px browser journey","accessibility runtime audit","provider generation and export"],missingEvidence:["Chief capability plan","runtime observation"]},
  governance:{peer:"founder-control-room",status:"awaiting_review",registrationAuthority:false,executionAuthorized:false,mayMerge:false,mayDeploy:false,mayPublish:false,maySpend:false},
  observation:{screenCount:input.plans.length,illustratedCount:input.illustrated,localFindingCount:input.localFindings,reviewStale:input.reviewStale,scope:"client design plan only"},
  peerInvocations:0,rawDesignIncluded:false
 } as const;
}
