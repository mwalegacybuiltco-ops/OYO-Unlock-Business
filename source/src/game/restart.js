import {missions,worlds} from './content.js';
import {requireThat} from './engine.js';

// Progress is sequential. Replaying a completed mission also removes its dependent unlocks.
export function restartPlan({scope,missionId,confirmed}){
 requireThat(confirmed===true,'Confirm the restart before clearing progress.');
 requireThat(scope==='mission'||scope==='adventure','Choose a mission or adventure restart.');
 const start=scope==='adventure'?0:missions.findIndex(m=>m.id===missionId);
 requireThat(start>=0,'Unknown mission.');
 return {missions:missions.slice(start).map(m=>m.id),bosses:worlds.filter(w=>w.index>=missions[start].world).map(w=>w.id)};
}
