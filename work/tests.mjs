import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Workbook,SpreadsheetFile,FileBlob} from '@oai/artifact-tool';
import {install} from './formulas.mjs';
const roundDiv=(n,d)=>(Math.sign(n)*Math.floor((Math.abs(n)+d/2)/d))||0;
// Independent reference: integer net cents and hundredths of a VAT cent.
function expected(rows,rates,overrides={}) {
 const out=rows.map(([net,rate])=>roundDiv(net*rate,100));
 for(const rate of rates){
  const ids=rows.map((x,i)=>i).filter(i=>rows[i][1]===rate);
  const target=overrides[rate]??roundDiv(ids.reduce((t,i)=>t+rows[i][0]*rate,0),100);
  const delta=target-ids.reduce((t,i)=>t+out[i],0), sign=Math.sign(delta);
  const eligible=ids.filter(i=>sign*(rows[i][0]*rate-out[i]*100)>0);
  eligible.sort((a,b)=>sign*((rows[b][0]*rate-out[b]*100)-(rows[a][0]*rate-out[a]*100))||a-b);
  if(Math.abs(delta)>eligible.length)return null;
  for(const i of eligible.slice(0,Math.abs(delta)))out[i]+=sign;
 }
 return out;
}
const cases=[
 ['syntetyczny przykład',[[6,8],[4,8],[7,23],[8,23]],[8,23]],
 ['dodaj grosz',[[6,8],[4,8]],[8,23]],
 ['odejmij grosz',[[7,8],[8,8]],[8,23]],
 ['dodaj kilka groszy i remis',Array.from({length:12},()=>[6,8]),[8,23]],
 ['odejmij kilka groszy i remis',Array.from({length:12},()=>[7,8]),[8,23]],
 ['ujemne dodawanie',[[-7,8],[-8,8]],[8,23]],
 ['ujemne odejmowanie',[[-6,8],[-4,8]],[8,23]],
 ['mieszane znaki',[[7,8],[-6,8],[6,8],[-7,8],[8,23],[-9,23]],[8,23]],
 ['pół grosza dodatni',[[10,5],[10,5]],[5,23]],
 ['pół grosza ujemny',[[-10,5],[-10,5]],[5,23]],
 ['zero netto',[[0,8],[0,23]],[8,23]],
 ['zero VAT i 5%',[[125,0],[6,5],[9,5]],[0,5]],
 ['dokładne grosze',[[100,8],[200,23]],[8,23]],
 ['jedna pozycja',[[17,23]],[8,23]],
 ['duże kwoty',[[999999999,23],[888888883,23]],[8,23]],
 ['różnica z faktury',[[6,8],[4,8]],[8,23],{8:0}],
 ['niemożliwa korekta',[[100,8]],[8,23],{8:10}],
 ['brak pozycji',[],[8,23]],
];
let seed=20261013;
function random(n){seed=(1664525*seed+1013904223)>>>0;return seed%n;}
for(let j=0;j<100;j++){
 const n=1+random(40),rates=j%3===0?[0,5]:[8,23];
 cases.push([`losowy ${j+1}`,Array.from({length:n},()=>[(random(2000001)-1000000),rates[random(2)]]),rates]);
}
const wb=Workbook.create(),s=wb.worksheets.add('Test');install(s,41);
let passed=0;
for(const [name,rows,rates,overrides={}] of cases){
 s.getRange('B2:C41').clear({applyTo:'contents'});
 s.getRange('J1:K1').values=[rates.map(x=>x/100)];
 // Restore target formulas after override tests.
 for(const c of ['J','K'])s.getRange(`${c}3`).formulas=[[`=ROUND(${c}1*${c}2,2)`]];
 if(rows.length)s.getRange(`B2:C${rows.length+1}`).values=rows.map(([net,rate])=>[rate/100,net/100]);
 for(const [rate,target]of Object.entries(overrides))s.getRange(`${rates.indexOf(Number(rate))===0?'J':'K'}3`).values=[[target/100]];
 wb.recalculate();
 const want=expected(rows,rates,overrides),actual=s.getRange(`G2:H${Math.max(2,rows.length+1)}`).values;
 if(want===null){assert.ok(String(actual[0][0]).includes('#N/A'),`${name}: oczekiwano #N/A, jest ${actual[0][0]}`);}
 else rows.forEach(([net],i)=>{
   assert.equal(Math.round(Number(actual[i][0])*100),want[i],`${name}: VAT wiersz ${i+2}`);
   assert.equal(Math.round(Number(actual[i][1])*100),net+want[i],`${name}: brutto wiersz ${i+2}`);
   const base=roundDiv(net*rows[i][1],100);
   assert.ok(Math.abs(want[i]-base)<=1,`${name}: więcej niż grosz na pozycję`);
 });
 if(rows.length<40)assert.equal(s.getRange(`G${rows.length+2}`).values[0][0],'',`${name}: pusty wiersz`);
 passed++;
 if(passed%25===0)console.log(`Przeliczone testy: ${passed}/${cases.length}`);
}
// The user's six-decimal example: test priority itself, bypassing the cents-only net input.
s.getRange('B2:C41').clear({applyTo:'contents'});
s.getRange('B2:C3').values=[[0.08,1],[0.08,1]];
s.getRange('E2:E3').values=[[2.000912],[2.004439]];
s.getRange('J1:K1').values=[[0.08,0.23]];
s.getRange('J3').values=[[4.01]];wb.recalculate();
assert.deepEqual(s.getRange('G2:G3').values,[[2],[2.01]]);passed++;
// Input validation and an unmapped rate must remain visible errors.
s.getRange('C2').values=[[1.001]];wb.recalculate();assert.ok(String(s.getRange('M2').values[0][0]).includes('#N/A'));passed++;
s.getRange('B2:C2').values=[[0.07,1]];wb.recalculate();assert.ok(String(s.getRange('O2').values[0][0]).includes('#N/A'));passed++;
// Export and re-open a synthetic workbook, then change inputs again.
s.getRange("B2:C41").clear({applyTo:"contents"});
install(s,41);s.getRange("J1:K1").values=[[0.08,0.23]];
s.getRange("B2:C3").values=[[0.08,0.06],[0.08,0.04]];wb.recalculate();
const file=new URL("../outputs/vat/test-roundtrip.xlsx",import.meta.url).pathname;
await (await SpreadsheetFile.exportXlsx(wb)).save(file);
const saved=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
const real=saved.worksheets.getItem("Test");
assert.deepEqual(real.getRange("G2:G3").values,[[0.01],[0]]);passed++;
real.getRange("C2:C3").values=[[0.07],[0.08]];saved.recalculate();
assert.deepEqual(real.getRange("G2:G3").values,[[0],[0.01]]);passed++;
real.getRange("C2:C3").values=[[0.06],[0.04]];saved.recalculate();
assert.deepEqual(real.getRange("G2:G3").values,[[0.01],[0]]);passed++;
await fs.unlink(file);
console.log(`Testy syntetyczne: ${passed}/${passed} zaliczonych.`);
