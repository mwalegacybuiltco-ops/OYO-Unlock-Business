export class BillingError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
export const check=(condition,message,status=400)=>{if(!condition)throw new BillingError(message,status);};
export const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id);
export function money(value){check(typeof value==='string'&&/^\d+(\.\d{1,2})?$/.test(value),'Unsupported payment amount');return Math.round(Number(value)*100);}
export function fixedPlan(plan){
  const cycles=plan.billing_cycles||[],c=cycles[0];
  check(cycles.length===1&&c.tenure_type==='REGULAR'&&c.total_cycles===0,'Use one ongoing fixed-price billing cycle, without a trial.');
  check(['DAY','WEEK','MONTH','YEAR'].includes(c.frequency?.interval_unit)&&Number.isInteger(c.frequency.interval_count)&&c.frequency.interval_count>=1&&c.frequency.interval_count<=12,'Unsupported billing interval');
  check(c.pricing_scheme?.fixed_price&&!c.pricing_scheme.tiers&&!plan.quantity_supported,'Use fixed pricing without quantity tiers');
  check(!plan.payment_preferences?.setup_fee||money(plan.payment_preferences.setup_fee.value)===0,'Setup fees are not supported');
  check(!plan.taxes||Number(plan.taxes.percentage)===0,'Separate taxes are not supported by this integration');
  const price=c.pricing_scheme.fixed_price;check(money(price.value)>0&&/^[A-Z]{3}$/.test(price.currency_code),'Invalid plan price');
  return {price,frequency:c.frequency};
}
export function periodEnd(time,frequency){
  const d=new Date(time),n=frequency.interval_count;check(Number.isFinite(d.getTime()),'Invalid payment date');
  if(frequency.interval_unit==='DAY')d.setUTCDate(d.getUTCDate()+n);
  else if(frequency.interval_unit==='WEEK')d.setUTCDate(d.getUTCDate()+7*n);
  else {const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n*(frequency.interval_unit==='YEAR'?12:1));const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));}
  return d.getTime();
}
// Only PayPal API data obtained by the server enters this function. A browser return never does.
export function verifiedAccess({subscription:s,plan,transactions,uid,planId,held=false,now=Date.now()}){
  check(s.custom_id===uid&&s.plan_id===planId&&validId(s.id),'Subscription belongs to a different player or plan',403);
  check(!s.plan_overridden&&(!s.quantity||s.quantity==='1')&&(!s.shipping_amount||money(s.shipping_amount.value)===0),'Overridden subscriptions are not supported');
  const {price,frequency}=fixedPlan(plan),last=s.billing_info?.last_payment;
  const base={active:false,expiresAt:0,subscriptionId:s.id,status:s.status,source:'paypal',paymentId:'',paymentAt:0};
  if(held)return {...base,status:'PAYMENT_REVIEW'};
  if(!['ACTIVE','CANCELLED','SUSPENDED','EXPIRED'].includes(s.status)||!last)return base;
  const paidAt=Date.parse(last.time);
  if(!Number.isFinite(paidAt)||paidAt>now+60000)return base;
  const samePrice=a=>a?.currency_code===price.currency_code&&money(a.value)===money(price.value);
  if(!samePrice(last.amount))return base;
  const transaction=transactions.find(t=>t.status==='COMPLETED'&&validId(t.id)&&Math.abs(Date.parse(t.time)-paidAt)<=60000&&samePrice(t.amount_with_breakdown?.gross_amount));
  if(!transaction)return base;
  // Do not extend from a future billing date alone: a completed payment must cover this period.
  const maximum=periodEnd(paidAt,frequency),next=Date.parse(s.billing_info?.next_billing_time);
  const expiresAt=Number.isFinite(next)&&next>paidAt?Math.min(next,maximum):maximum;
  return {...base,active:expiresAt>now,expiresAt,paymentId:transaction.id,paymentAt:paidAt};
}
