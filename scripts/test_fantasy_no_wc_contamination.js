/**
 * REGRESSION TEST: Fantasy Chat — No World Cup Contamination
 * Run: node scripts/test_fantasy_no_wc_contamination.js
 */
const http = require('http')
const PORT = process.env.PORT || 3009
const WC_STRINGS = ['Group I','Morocco','World Cup','Spain and France','Compare Spain','Who will win the World Cup']

function post(question, lang='en') {
  return new Promise((resolve,reject) => {
    const body = JSON.stringify({question,conversationHistory:[],language:lang})
    const req = http.request({hostname:'127.0.0.1',port:PORT,path:'/api/fpl/chat',method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}
    },(res)=>{ let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{resolve({status:res.statusCode,body:JSON.parse(d)})}catch(e){resolve({status:res.statusCode,body:{answer:d}})} }) })
    req.on('error',reject); req.write(body); req.end()
  })
}
function noWC(answer){ for(const s of WC_STRINGS){ if(answer.includes(s)) return{clean:false,found:s} } return{clean:true} }
function assert(label,cond,detail=''){ const ok=!!cond; console.log(ok?'PASS:':'FAIL:',label,detail?'| '+detail:''); return ok }

async function run(){
  console.log('=== REGRESSION: Fantasy Chat No-WC Contamination ===')
  let p=0,t=0
  t++; const r1=await post('Who should I captain next Gameweek?'); const w1=noWC(r1.body.answer||'')
  if(assert('Captain->Fantasy no WC',r1.status===200&&['PREDICTION_RECOMMENDATION','CAPTAIN_QUERY'].includes(r1.body.intent)&&(r1.body.answer||'').toLowerCase().includes('haaland')&&w1.clean,w1.clean?'intent='+r1.body.intent:'WC found:'+w1.found)) p++
  t++; const r2=await post('Best midfielder under 7m?'); const w2=noWC(r2.body.answer||'')
  if(assert('Budget->BUDGET_QUERY no WC',r2.status===200&&r2.body.intent==='BUDGET_QUERY'&&(r2.body.answer||'').toLowerCase().includes('semenyo')&&w2.clean,w2.clean?'ok':'WC found:'+w2.found)) p++
  t++; const r3=await post('How many points does Haaland have?'); const w3=noWC(r3.body.answer||'')
  if(assert('LivePts->LIVE_GAMEWEEK no WC',r3.status===200&&r3.body.intent==='LIVE_GAMEWEEK'&&w3.clean,w3.clean?'ok':'WC found:'+w3.found)) p++
  t++; const r4=await post('Who should I captain?'); const w4=noWC(r4.body.answer||'')
  if(assert('No WC strings in captain response',w4.clean,w4.clean?'clean':'WC found:'+w4.found)) p++
  console.log('=== RESULT:',p+'/'+t,p===t?'ALL PASS':'FAILURES ===')
  if(p<t) process.exit(1)
}
run().catch(e=>{console.error(e);process.exit(1)})
