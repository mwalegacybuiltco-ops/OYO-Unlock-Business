import {check,validId} from './policy.mjs';
export function createPayPal(config,fetcher=fetch){
  const base=config.mode==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
  let token,expires=0;
  async function accessToken(){
    if(token&&Date.now()<expires)return token;
    const r=await fetcher(base+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(config.clientId+':'+config.secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(20000)});
    check(r.ok,'PayPal authentication unavailable',502);const body=await r.json();check(body.access_token,'PayPal authentication unavailable',502);token=body.access_token;expires=Date.now()+Math.max(0,(body.expires_in-60))*1000;return token;
  }
  async function api(path,method='GET',body,requestId){
    const r=await fetcher(base+path,{method,headers:{Authorization:'Bearer '+await accessToken(),'Content-Type':'application/json',...(requestId?{'PayPal-Request-Id':requestId}:{}),'Prefer':'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    check(r.ok,'PayPal verification unavailable; retry shortly',502);return r.status===204?{}:r.json();
  }
  const subscription=id=>{check(validId(id),'Invalid subscription');return api('/v1/billing/subscriptions/'+id);};
  return {
    subscription,
    plan:()=>api('/v1/billing/plans/'+config.planId),
    async transactions(id,lastTime){
      check(validId(id),'Invalid subscription');if(!lastTime)return [];
      const t=Date.parse(lastTime);check(Number.isFinite(t),'Invalid payment time',502);
      const query=new URLSearchParams({start_time:new Date(t-86400000).toISOString(),end_time:new Date(Math.min(Date.now(),t+86400000)).toISOString()});
      const result=await api('/v1/billing/subscriptions/'+id+'/transactions?'+query);return result.transactions||[];
    },
    create:(uid,requestId)=>api('/v1/billing/subscriptions','POST',{plan_id:config.planId,custom_id:uid,application_context:{brand_name:'OYO UNLOCKED',user_action:'SUBSCRIBE_NOW',shipping_preference:'NO_SHIPPING',return_url:config.appUrl+'#membership',cancel_url:config.appUrl+'#membership'}},requestId),
    async verify(headers,event){
      const names=['paypal-auth-algo','paypal-cert-url','paypal-transmission-id','paypal-transmission-sig','paypal-transmission-time'];
      check(names.every(n=>headers[n]),'Missing PayPal signature',401);
      const result=await api('/v1/notifications/verify-webhook-signature','POST',{auth_algo:headers[names[0]],cert_url:headers[names[1]],transmission_id:headers[names[2]],transmission_sig:headers[names[3]],transmission_time:headers[names[4]],webhook_id:config.webhookId,webhook_event:event});
      check(result.verification_status==='SUCCESS','Invalid PayPal signature',401);
    }
  };
}
