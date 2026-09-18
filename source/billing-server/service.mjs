import {randomUUID} from 'node:crypto';
import {check,validId,fixedPlan,verifiedAccess} from './policy.mjs';
export function createService({db,paypal,config,clock=Date.now}){
  const ref=(collection,id)=>{check(validId(id),'Invalid identifier');return db.collection(collection).doc(id);};
  async function locked(id,fn){
    const lock=ref('sparkBillingLocks',id),token=randomUUID();
    await db.runTransaction(async tx=>{const old=(await tx.get(lock)).data();check(!old||old.until<=clock(),'Payment check in progress; retry shortly',409);tx.set(lock,{token,until:clock()+120000});});
    const commit=async fn=>db.runTransaction(async tx=>{const current=(await tx.get(lock)).data();check(current?.token===token&&current.until>clock(),'Payment check expired; retry shortly',409);return fn(tx);});
    try{return await fn(commit);}finally{await db.runTransaction(async tx=>{if((await tx.get(lock)).data()?.token===token)tx.delete(lock);});}
  }
  async function checkout(uid){return locked('user-'+uid,async commit=>{
    check((await ref('sparkPlayers',uid).get()).exists,'Open your game account first');
    const linkRef=ref('sparkBillingPlayers',uid);let link=(await linkRef.get()).data();
    if(link?.subscriptionId){
      const existing=await paypal.subscription(link.subscriptionId);
      if(['APPROVAL_PENDING','APPROVED'].includes(existing.status))return approval(existing);
      check(['CANCELLED','EXPIRED'].includes(existing.status),'You already have a subscription. Use Manage PayPal subscription.',409);
      const grant=(await ref('sparkPayPalMemberships',uid).get()).data();
      check(!grant?.active||grant.expiresAt<=clock(),'Your cancelled subscription still covers this period. Wait until it ends before subscribing again.',409);
      link=null;
    }
    const plan=await paypal.plan();check(plan.status==='ACTIVE','The PayPal plan is not active',503);fixedPlan(plan);
    if(!link?.requestId){link={requestId:randomUUID(),createdAt:clock()};await commit(async tx=>tx.set(linkRef,link));}
    // Never reuse a lost create request after PayPal's idempotency window could have elapsed.
    check(clock()-link.createdAt<3600000,'An earlier checkout needs owner investigation before retrying.',409);
    const sub=await paypal.create(uid,link.requestId);check(validId(sub.id)&&sub.custom_id===uid&&sub.plan_id===config.planId,'Unexpected PayPal subscription',502);
    await commit(async tx=>{tx.set(linkRef,{subscriptionId:sub.id,createdAt:clock()});tx.set(ref('sparkBillingSubscriptions',sub.id),{uid,held:false,createdAt:clock()});});
    return approval(sub);
  });}
  function approval(sub){const url=new URL(sub.links?.find(x=>x.rel==='approve')?.href||'https://invalid.invalid');check(url.protocol==='https:'&&url.hostname===(config.mode==='live'?'www.paypal.com':'www.sandbox.paypal.com')&&!url.username&&!url.password,'PayPal approval link unavailable',502);return {url:url.href};}
  async function sync(subscriptionId,event){return locked('sub-'+subscriptionId,async commit=>{
    const bindingRef=ref('sparkBillingSubscriptions',subscriptionId),binding=(await bindingRef.get()).data();
    check(binding,'Subscription binding not ready; retry',503);
    if(event&&(await ref('sparkBillingEvents',event.id).get()).exists)return {duplicate:true};
    const sub=await paypal.subscription(subscriptionId);check(sub.id===subscriptionId,'Unexpected subscription',502);
    const isRefund=event&&['PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED'].includes(event.event_type);
    const held=binding.held||!!isRefund;
    const [plan,transactions]=await Promise.all([paypal.plan(),paypal.transactions(subscriptionId,sub.billing_info?.last_payment?.time)]);
    const grant=verifiedAccess({subscription:sub,plan,transactions,uid:binding.uid,planId:config.planId,held,now:clock()});
    await commit(async tx=>{
      const currentLink=(await tx.get(ref('sparkBillingPlayers',binding.uid))).data();
      // Late events for a replaced subscription cannot overwrite the current subscription.
      if(currentLink?.subscriptionId===subscriptionId)tx.set(ref('sparkPayPalMemberships',binding.uid),{...grant,checkedAt:clock()});
      tx.set(bindingRef,{...binding,held,updatedAt:clock()});
      if(grant.paymentId)tx.set(ref('sparkBillingSales',grant.paymentId),{subscriptionId});
      if(event)tx.set(ref('sparkBillingEvents',event.id),{type:event.event_type,subscriptionId,processedAt:clock()});
    });
    return {active:grant.active,expiresAt:grant.expiresAt,status:grant.status};
  });}
  async function refresh(uid){
    const link=(await ref('sparkBillingPlayers',uid).get()).data();if(!link?.subscriptionId)return {active:false,status:'NO_SUBSCRIPTION'};
    const grant=(await ref('sparkPayPalMemberships',uid).get()).data();
    // Bound authenticated refresh traffic without continuous database polling.
    if(grant?.checkedAt>clock()-15000)return {active:grant.active&&grant.expiresAt>clock(),expiresAt:grant.expiresAt,status:grant.status};
    return sync(link.subscriptionId);
  }
  async function webhook(headers,event){
    await paypal.verify(headers,event);check(validId(event.id),'Invalid event');
    const relevant=['PAYMENT.SALE.COMPLETED','PAYMENT.SALE.REFUNDED','PAYMENT.SALE.REVERSED','BILLING.SUBSCRIPTION.ACTIVATED','BILLING.SUBSCRIPTION.UPDATED','BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.SUSPENDED','BILLING.SUBSCRIPTION.PAYMENT.FAILED'];
    if(!relevant.includes(event.event_type))return {ignored:true};
    let id=event.event_type.startsWith('BILLING.SUBSCRIPTION.')?event.resource?.id:event.resource?.billing_agreement_id;
    const saleId=event.resource?.sale_id||event.resource?.id;
    if(!id&&validId(saleId))id=(await ref('sparkBillingSales',saleId).get()).data()?.subscriptionId;
    check(validId(id),'Payment event cannot yet be linked; retry and inspect server logs',503);
    return sync(id,event);
  }
  return {checkout,refresh,webhook};
}
