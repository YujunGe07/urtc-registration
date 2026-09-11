import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { applyAction, PortalError } from '../../../lib/scheduler-actions.ts';
import { type SchedulerState } from '../../../lib/scheduler.ts';
import { visibleData, type PortalActor } from '../../../lib/portal-view.ts';

const allowedOrigins = new Set(['https://yujunge07.github.io','http://127.0.0.1:4173','http://localhost:4173']);
const database = () => createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
type Database = ReturnType<typeof database>;
async function hash(text:string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join(''); }
async function snapshot(db:Database) {
 const {data,error}=await db.from('urtc_conferences').select('revision,data').eq('id','urtc-2027').single();
 if(error)throw error;
 return {revision:Number(data.revision),state:data.data as SchedulerState};
}
async function actorFor(request:Request,db:Database):Promise<PortalActor> {
 let email='',signedIn=false,organizer=false;
 const jwt=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(jwt){
  const {data:{user},error}=await db.auth.getUser(jwt);
  if(!error&&user?.email&&user.email_confirmed_at){email=user.email;signedIn=true;const allowed=await db.from('urtc_organizers').select('email').eq('email',email.toLowerCase()).maybeSingle();if(allowed.error)throw allowed.error;organizer=Boolean(allowed.data);}
 }
 const token=request.headers.get('x-presenter-session')??'';
 let submissionId:string|null=null;
 if(/^[a-f0-9]{64}$/.test(token)){
  const {data,error}=await db.from('urtc_presenter_sessions').select('submission_id').eq('token_hash',await hash(token)).gt('expires_at',Date.now()).maybeSingle();
  if(error)throw error;submissionId=data?.submission_id??null;
 }
 return {email,signedIn,organizer,submissionId};
}
export async function handle(request:Request):Promise<Response> {
 const origin=request.headers.get('origin')??'';
 const cors:Record<string,string>={'Vary':'Origin','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 if(origin&&allowedOrigins.has(origin))Object.assign(cors,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-presenter-session','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(origin&&!allowedOrigins.has(origin))return json({error:'This origin is not allowed.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 try{
  if(!['GET','POST'].includes(request.method))return json({error:'Method not allowed.'},405);
  const db=database();
  if(request.method==='GET')return json(visibleData(await snapshot(db),await actorFor(request,db)));
  if(!request.headers.get('content-type')?.includes('application/json'))throw new PortalError('JSON is required.',415);
  const reader=request.body?.getReader();let raw='',bytes=0;const decoder=new TextDecoder();
  if(reader)while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>20000){await reader.cancel();throw new PortalError('Request is too large.',413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
  let action:Record<string,unknown>;try{action=JSON.parse(raw);}catch{throw new PortalError('Invalid request.');}
  if(!action||typeof action!=='object'||Array.isArray(action))throw new PortalError('Invalid request.');
  if(action.kind==='logout'){
   const token=request.headers.get('x-presenter-session')??'';
   if(token){const {error}=await db.from('urtc_presenter_sessions').delete().eq('token_hash',await hash(token));if(error)throw error;}
   return json({ok:true});
  }
  if(action.kind==='login'){
   const ip=request.headers.get('cf-connecting-ip')??request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown';
   const {data:attempts,error:rateError}=await db.rpc('urtc_count_login',{p_id:`${await hash(ip)}:${Math.floor(Date.now()/900000)}`,p_expiry:Date.now()+900000});
   if(rateError)throw rateError;if(Number(attempts)>20)throw new PortalError('Too many attempts. Please try again in 15 minutes.',429);
   const current=await snapshot(db);const key=typeof action.key==='string'?action.key.trim().toUpperCase():'';
   const submission=current.state.submissions.find(s=>s.key===key);if(!submission)throw new PortalError('We could not find that key. Check your invitation and try again.',401);
   const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
   const {error}=await db.from('urtc_presenter_sessions').insert({token_hash:await hash(token),submission_id:submission.id,expires_at:Date.now()+43200000});if(error)throw error;
   await db.from('urtc_presenter_sessions').delete().lt('expires_at',Date.now());await db.from('urtc_login_attempts').delete().lt('expires_at',Date.now());
   const actor=await actorFor(request,db);
   return json({...visibleData(current,{...actor,organizer:false,submissionId:submission.id}),sessionToken:token});
  }
  const actor=await actorFor(request,db);
  if(!actor.organizer&&!actor.submissionId)throw new PortalError('Sign in to continue.',401);
  for(let attempt=0;attempt<5;attempt++){
   const current=await snapshot(db);
   if(actor.organizer&&action.revision!==current.revision)throw new PortalError('The conference changed. Refresh and review before saving again.',409);
   const next=applyAction(current.state,action,actor);
   const {data,error}=await db.from('urtc_conferences').update({data:next,revision:current.revision+1}).eq('id','urtc-2027').eq('revision',current.revision).select('revision').maybeSingle();
   if(error)throw error;if(data)return json(visibleData({state:next,revision:Number(data.revision)},actor));
  }
  throw new PortalError('The schedule is busy. Please try again.',409);
 }catch(error){
  if(error instanceof PortalError)return json({error:error.message},error.status);
  console.error('Portal request failed',error instanceof Error?error.message:'Database request failed');
  return json({error:'The scheduling service is unavailable. Your changes have not been saved. Please try again.'},503);
 }
}
Deno.serve(handle);
