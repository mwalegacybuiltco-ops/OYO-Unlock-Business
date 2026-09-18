import {BillingError,check} from './policy.mjs';
export function createHandler({service,auth,origin}){
  return async(req,res)=>{
    const headers={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(req.headers.origin===origin)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS'});
    const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
    try{
      const path=new URL(req.url,'http://server').pathname;
      if(req.method==='GET'&&path==='/health')return send(200,{ok:true,service:'oyo-paypal'});
      if(req.method==='OPTIONS'){check(req.headers.origin===origin,'Origin not allowed',403);return send(204,{});}
      check(req.method==='POST','Not found',404);
      check(['/checkout','/refresh','/webhooks/paypal'].includes(path),'Not found',404);
      let uid;
      if(path!=='/webhooks/paypal'){
        check(req.headers.origin===origin,'Origin not allowed',403);
        const match=/^Bearer (\S+)$/.exec(req.headers.authorization||'');check(match,'Sign in first',401);
        try{uid=(await auth.verifyIdToken(match[1],true)).uid;}catch{throw new BillingError('Sign in again',401);}
      }
      let raw='';for await(const chunk of req){raw+=chunk;check(Buffer.byteLength(raw)<=131072,'Request too large',413);}
      let body;try{body=raw?JSON.parse(raw):{};}catch{throw new BillingError('Invalid JSON');}
      const result=path==='/webhooks/paypal'?await service.webhook(req.headers,body):path==='/checkout'?await service.checkout(uid):await service.refresh(uid);
      send(200,result);
    }catch(e){const status=e instanceof BillingError?e.status:503;console.error('Billing request failed:',status,e instanceof BillingError?e.message:'Internal service error');send(status,{error:e instanceof BillingError?e.message:'Payment service unavailable; retry shortly'});}
  };
}
