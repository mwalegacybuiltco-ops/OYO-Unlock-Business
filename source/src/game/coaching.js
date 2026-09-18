/** Deterministic coaching: no model, external AI request, or credential. */
import {guideLevel,safeText,requireThat,missionOpen,missionState} from './engine.js';
import {guides,missions} from './content.js';
const question=(id,text,choices=[])=>({id,text,choices});
const discovery={
 strategist:[question('audience','Who specifically do you want to help?'),question('problem','What problem have they described in their own words?'),question('evidence','What happened in your most recent audience conversation? Include what surprised you.'),question('test','What small experiment could you run this week, and what would change your mind?')],
 creator:[question('audience','Who should recognize themselves in your message?'),question('outcome','What useful outcome can you honestly help them work toward?'),question('voice','Which brand voice fits your audience?',['Clear and practical','Warm and encouraging','Direct and professional']),question('channel','Where does this audience already look for help?'),question('draft','Write your current headline or opening sentence.'),question('feedback','What did an intended reader think your message meant?')],
 builder:[question('deliverable','What exactly will the customer receive? Include the quantity or scope.'),question('limits','What is excluded, and what must the customer provide?'),question('capacity','How much delivery time do you have available each week?'),question('test','What did someone ask or misunderstand when you showed the offer?')],
 closer:[question('offer','What do you sell, and what is included?'),question('audience','Who is the buyer, and what problem brought them to you?'),question('concern','Which concern is stopping the decision?',['Price or budget','Trust or proof','Timing','Another decision-maker','Poor fit','Not sure yet']),question('words','What were the buyer’s exact words? Remove names and private details.'),question('attempt','What did you ask next, and how did they respond?'),question('next','What next step did they agree to, or did they decline?')],
 analyst:[question('stage','Where does progress seem to stop?',['Getting replies','Booking conversations','Making offers','Closing sales','Delivering consistently']),question('numbers','For one dated period, how many attempts and outcomes did you observe? Include zero results.'),question('change','What changed during that period besides the thing you were testing?'),question('test','Which single change will you test next, for how long, and against what baseline?')],
 spark:[question('barrier','What is making your next action difficult?',['Too many choices','Fear of rejection','Not enough time','Unclear next step']),question('capacity','How many minutes can you realistically protect for this task?'),question('action','What is one action you can finish in that time?'),question('review','When will you check what happened, and what support would help?')]
};
const topics={price:/\b(price|budget|expensive|cost)\b/i,trust:/\b(trust|proof|testimonial|skeptic)\b/i,timing:/\b(timing|later|busy|delay)\b/i,authority:/\b(partner|decision-maker|approval|manager)\b/i,fit:/\b(poor fit|not a fit|declined|said no)\b/i};
const objections={
 price:'Ask: “When you say expensive, is it beyond the budget available, or are you unsure the scope is worth it?” Budget: explore a genuinely smaller useful scope or pause. Value uncertainty: relate the actual deliverables to the stated problem and offer relevant evidence. Do not guarantee a return or discount before understanding the concern.',
 trust:'Ask: “What would you need to see to judge whether this is suitable?” Offer a relevant sample, a clearly bounded pilot, or accurate evidence with permission. State what your evidence does not prove. Never invent testimonials.',
 timing:'Ask: “What would need to change for this to become a priority?” Distinguish a real scheduling constraint from unresolved fit. Agree on a follow-up date only if invited; do not manufacture urgency.',
 authority:'Ask: “Who else needs to be involved, and what will they need to evaluate?” Offer a short scope summary or an optional joint conversation. Respect the buyer’s decision process.',
 fit:'Acknowledge the decision: “Thanks for being clear. I do not want you buying something that does not meet your need.” Stop selling. Ask for learning feedback only if welcome; a referral is optional, never an obligation.'
};
const scripts={
 strategist:'Use one audience, one observed problem, and one small experiment. Ask “Tell me about the last time this happened; what did you try?” Separate their words from your assumptions. Choose a measure and a review date before building.',
 creator:'Write: “I help [specific audience] with [problem] through [concrete approach].” Add a worked example and one low-pressure next step. Keep three voice traits consistent across your profile and posts. Ask a reader what they think you do; revise anything they misunderstood.',
 builder:'List deliverables, exclusions, customer inputs, timeline, revisions, and a price hypothesis. Estimate your delivery time and costs. Test a small scope with one suitable person; revise unclear details before adding features.',
 closer:'Discover the trigger, current workaround, desired change, constraints, and decision process. Summarize: “You said [need] matters because [impact]. Have I understood?” Recommend only a fitting scope. Close with “What remains unclear? Would reviewing the written scope be a useful next step?” A clear no ends the sales conversation.',
 analyst:'Track attempts and outcomes with dates and denominators. Find the stage with the largest observed drop, then consider at least two explanations. Change one factor over a defined window. Record unfavorable results and distinguish evidence from a guess.',
 spark:'Shrink the task to one achievable action. Use “After [existing routine], I will [small action] for [minutes].” Name what you will stop or defer to make room. Review what you learned, not just whether someone bought.'
};
function topicFor(message,answers){const input=message+' '+(answers.concern||'');return Object.entries(topics).find(([,rx])=>rx.test(input))?.[0]||null;}
export function guideReply({game,guideId,message,reset=false}){
 const guide=guides.find(g=>g.id===guideId);requireThat(guide,'Unknown Guide.');safeText(message,3,2000);
 const old=reset?{}:game.coaching?.[guideId]||{};const memory=structuredClone(old);memory.answers=memory.answers||{};memory.turn=(memory.turn||0)+1;
 const lvl=guideLevel(game,guideId);const questions=[...discovery[guideId]];if(lvl>=3)questions.push(question('tradeoff','Which two approaches could you take, and what tradeoff makes one a better test?'));if(lvl>=6)questions.push(question('alternatives','What two explanations could account for your result, and what evidence would distinguish them?'));const pending=questions.find(q=>q.id===memory.pending);let accepted=false;
 if(pending&&!reset){if(!pending.choices.length||pending.choices.includes(message.trim())){memory.answers[pending.id]=message.trim();accepted=true;}else{return {mode:'adaptive',memory,text:`Choose the option that best matches your situation so I can take you down the right coaching path.\n\n${pending.text}`,question:pending};}}
 let next=questions.find(q=>!memory.answers[q.id]);memory.pending=next?.id||null;
 if(!pending&&!next&&!reset)memory.latestOutcome=message.trim();
 const verified=Object.values(game.missions).filter(m=>m.status==='verified').length;
 const active=missions.find(m=>missionOpen(game,m.id)&&missionState(game,m.id).status!=='verified');const concern=topicFor(message,memory.answers);memory.topic=concern||memory.topic||null;
 if(guideId==='closer'&&next?.id==='words'){const targeted={price:'What did the buyer say about budget or value, and what scope have they seen?',trust:'What evidence did the buyer ask to see, and what truthful sample can you provide?',timing:'What timing constraint did they describe, and did they invite a later follow-up?',authority:'Who else needs to evaluate the offer, and what information do they need?',fit:'What mismatch or boundary did they state, and how will you respect it?'};next={...next,text:targeted[memory.topic]||next.text};}
 const evidence=Object.values(game.missions).find(m=>m.feedback&&m.status!=='verified');
 const recollection=accepted?`You told me: “${message.trim().slice(0,300)}”. I have saved that as your answer, not independently verified it.\n\n`:'';
 const personalization=`${guide.name} · Level ${lvl} · ${verified} owner-reviewed missions\nBusiness path: ${game.profile.path}. ${game.profile.business?`Your business notes: ${game.profile.business}`:''}`;
 const strategy=guideId==='closer'&&memory.topic?objections[memory.topic]:scripts[guideId];
 const depth=lvl>=6?'Advanced challenge: name two alternative explanations for the result. Design a bounded comparison and decide what evidence would change your approach.':lvl>=3?'Growth challenge: compare two realistic approaches. Choose one, explain the tradeoff, and set a measure and review date.':'First step: use one real example and try one small action before expanding the plan.';
 const plan=!next?`\n\nYour saved planning notes:\n${questions.map(q=>`${q.text} → ${memory.answers[q.id]}`).join('\n')}\n\nRun the smallest suitable test, then tell me what happened. Use “Start a fresh plan” to revise these answers.`:'';
 const text=`${personalization}\n\n${recollection}${strategy}\n\n${depth}${evidence?`\nReview to revisit: ${evidence.feedback.slice(0,300)}`:''}${active?`\nNext mission: ${active.title}. ${active.irl}`:'\nReview your unlocked options and choose a bounded next experiment.'}${memory.latestOutcome?`\nLatest outcome you recorded: ${memory.latestOutcome.slice(0,500)}`:''}${plan}\n\n${next?next.text:'What changed after your last action? Record the actual outcome, including a decline or no response.'}`;
 // Store only bounded state, not arbitrary history or client-supplied progress.
 memory.updatedAt=Date.now();return {mode:'adaptive',text:text.slice(0,6000),memory,question:next||null};
}
export const bossCases=[
 [
 ['“Your idea sounds too broad. Who is it actually for?”','Choose one reachable audience and investigate a recent concrete problem.','Keep the audience broad so nobody is excluded.','Build the whole product before asking anyone.','Specific audience research makes the hypothesis testable.'],
 ['“People said it sounds nice, but nobody asked for it.”','Ask about past behavior and current workarounds before treating compliments as demand.','Count every compliment as a customer.','Invent a testimonial to encourage interest.','Observed behavior is stronger evidence than polite encouragement.'],
 ['“Your first audience test found a different problem.”','Update the hypothesis and run a smaller test of the observed problem.','Ignore the finding and expand the original plan.','Promise success to overcome hesitation.','Revise the hypothesis when evidence contradicts it.']
 ],
 [
 ['“Your profile sounds like everyone else.”','Name the audience, specific problem, approach, and a truthful example.','Use more impressive but vague words.','Copy a competitor’s identity.','Clear positioning and evidence help a reader judge relevance.'],
 ['“Your profile and your posts seem to offer different things.”','Align the promise and voice, then ask an intended reader to explain the offer.','Change the logo and keep the conflicting claims.','Add more unrelated services to the bio.','Consistency is about the promise and voice as well as graphics.'],
 ['“I read the rewrite and still cannot tell what to do next.”','Test a plain-language invitation with a reader and revise from their interpretation.','Blame the reader for not understanding.','Make the promise bigger without checking comprehension.','A next step should be understood by the intended audience.']
 ],
 [
 ['“That is more expensive than I expected.”','Ask whether the concern is available budget or uncertainty about value and scope.','Guarantee they will make the money back.','Discount before understanding the concern.','Budget and value uncertainty require different responses.'],
 ['“I only need half of those deliverables.”','Explore a smaller genuinely useful scope and make its limits explicit.','Charge the same and conceal the exclusions.','Pressure them to buy unwanted work.','Scope should match a real need and remain feasible to deliver.'],
 ['“Your smaller offer still does not explain what I will receive.”','Provide a concrete deliverable checklist, exclusions, and acceptance steps.','Promise unlimited revisions and outcomes.','Ask for payment before clarifying anything.','Concrete scope supports an informed decision.']
 ],
 [
 ['“The last post got almost no response.”','Check audience and message fit, then change one factor with a defined measure.','Change every channel and format at once.','Treat views as guaranteed sales.','A controlled change produces more interpretable evidence.'],
 ['“One post did well, but the next did not.”','Compare context and repeated observations before drawing a conclusion.','Declare the first post a proven growth formula.','Hide the unsuccessful result.','Small samples and changing context limit certainty.'],
 ['“More people saw it, but none were suitable customers.”','Measure qualified responses and refine the audience-specific invitation.','Buy unrelated attention to raise views.','Report reach as profit.','Visibility should connect to relevant next actions.']
 ],
 [
 ['“Why are you messaging me?”','Explain the relevant context, ask permission, and make declining easy.','Send the entire pitch without responding.','Imply they owe you a reply.','Permission and relevance come before a sales discussion.'],
 ['“I have not replied because this is not a priority.”','Respect the boundary and ask about future contact only if appropriate.','Contact them from another account.','Send daily reminders until they answer.','Silence and low priority do not justify pressure.'],
 ['“Please stop contacting me.”','Acknowledge the request and stop outreach.','Offer a final limited-time deal.','Ask another person to pitch them for you.','A clear boundary ends outreach.']
 ],
 [
 ['“I am not convinced this will help my situation.”','Ask what remains unclear, then compare the actual need with the offer’s limits.','Guarantee the desired outcome.','Say successful people decide quickly.','Investigate fit instead of overcoming resistance at any cost.'],
 ['“I need my partner’s input and have limited time.”','Offer a concise scope and an optional joint conversation on their schedule.','Bypass the partner and take payment.','Invent a deadline to force a decision.','Respect time constraints and the decision process.'],
 ['“I considered it and the answer is no.”','Respect the decision; request learning feedback only if welcome.','Keep rebutting until they agree.','Shame them for missing an opportunity.','An ethical close includes accepting no fit or no interest.']
 ],
 [
 ['“I expected work that was not included.”','Acknowledge the mismatch, review the agreement, and discuss fair options.','Dismiss the customer without checking the agreement.','Promise any extra work immediately regardless of capacity.','Clarify both the agreement and the source of confusion.'],
 ['“Your welcome instructions left me unsure what to send.”','Simplify the inputs and first step, then test the instructions with a reader.','Collect every possible personal detail just in case.','Blame the customer for being confused.','Collect only needed inputs and test clarity.'],
 ['“The revision still missed my concern.”','Restate the concern, agree on a concrete acceptance check, and confirm scope.','Mark it complete because a file was sent.','Publish their feedback as a testimonial without permission.','Completion should reflect the agreed deliverable and concern.']
 ],
 [
 ['“The checklist failed when a request was incomplete.”','Define an exception path and test it on an incomplete request.','Automate the broken checklist immediately.','Ignore requests that do not fit the happy path.','A repeatable process needs exception handling.'],
 ['“The numbers improved, but several things changed.”','List confounders and test one factor with dates and denominators.','Claim the improvement proves your preferred tactic.','Remove results that do not support the claim.','Correlation with several changes does not establish cause.'],
 ['“The new process saves time but creates rework.”','Measure total time including rework and revise the bottleneck.','Count only the time saved by the first step.','Scale it immediately without a quality check.','Optimize the whole process, including quality and rework.']
 ],
 [
 ['“You have more opportunities than available time.”','Choose one bounded experiment and explicitly defer other work.','Start all opportunities at once.','Assume every unlocked path guarantees income.','Capacity and downside should shape the choice.'],
 ['“The experiment is taking twice the time planned.”','Reduce scope or pause, protect the capacity limit, and set a review date.','Ignore the limit until you burn out.','Hide the extra hours from your review.','A sustainable plan changes when constraints change.'],
 ['“The first plan did not produce the expected result.”','Review actual evidence and choose to adjust, continue, or stop with a clear rule.','Spend indefinitely because stopping feels like failure.','Replace evidence with promised future earnings.','An experiment needs a real decision rule and a bounded downside.']
 ]
];
export function bossScenario(game,world){
 const round=Math.min(game.bosses[world.id]?.round||0,2),attempts=game.bosses[world.id]?.attempts||0,lvl=guideLevel(game,world.guide);
 const c=bossCases[world.index][round];requireThat(c,'Unknown boss scenario.');
 const shift=(world.index+round+attempts)%3,raw=[{id:'clarify',text:c[1]},{id:'rush',text:c[2]},{id:'evade',text:c[3]}];
 const options=raw.slice(shift).concat(raw.slice(0,shift));
 const checks=[{id:'observation',text:'Record the actual response, compare it with the goal, and decide the next adjustment.'},{id:'assumption',text:'Assume a positive result without recording what happened.'},{id:'vanity',text:'Count activity alone and ignore whether it helped.'}];
 const cue=attempts>round?'Revisit the unresolved concern. Acknowledge it before choosing a next move. ':'';
 const constraint=lvl>=6?'Advanced: identify an alternative explanation and a stop condition.':lvl>=3?'Growth: explain the tradeoff and set a review date.':'Start with a specific, respectful next step.';
 return {id:`${world.id}:${round}:${attempts}`,prompt:`${cue}${c[0]} ${constraint}`,options,checks:checks.slice(shift).concat(checks.slice(0,shift)),explanation:c[4],reflection:`Apply your choice to your ${game.profile.path.toLowerCase()} business. ${round===1?'You have only two hours available this week. ':round===2?'Your first approach did not resolve the concern. ':''}${constraint}`};
}
export function assessBoss({game,world,answer,choice,check,scenarioId}){
 safeText(answer,40,3000);const scenario=bossScenario(game,world);requireThat(scenarioId===scenario.id,'The battle changed. Refresh before making another move.');
 requireThat(scenario.options.some(o=>o.id===choice)&&scenario.checks.some(o=>o.id===check),'Choose both a strategy and a way to check the outcome.');
 const passed=choice==='clarify'&&check==='observation';
 const feedback=`${passed?'Both strategy choices meet this round’s rubric.':'Revisit '+(choice!=='clarify'?'your response strategy':'how you will check the outcome')+'.'} ${scenario.explanation} ${check!=='observation'?'Record a real observation rather than assuming success. ':''}Your written reflection is saved, but its meaning is not automatically graded. Owner-reviewed real-world missions remain separate.`;
 return {passed,feedback,mode:'adaptive'};
}
