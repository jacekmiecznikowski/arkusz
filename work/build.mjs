import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
import {install} from './formulas.mjs';
const source=JSON.parse(await fs.readFile(new URL('./source.json',import.meta.url),'utf8'));
const out=new URL('../outputs/vat/',import.meta.url).pathname;
await fs.mkdir(out,{recursive:true});
const wb=Workbook.create(), s=wb.worksheets.add(source.name);
s.getRange('A1:L6').values=source.rows.map(row=>Array.from({length:12},(_,i)=>row[i]?.value??null));
s.getRange('A1:Q15').format.font={name:'Arial',size:10};
s.getRange('A1:L6').format.rowHeight=28;
s.getRange('A1:A6').format.columnWidth=34;
s.getRange('B1:H6').format.columnWidth=18;
s.getRange('I1:L6').format.columnWidth=19;
s.getRange('A1:L1').format.font.bold=true;
s.getRange('A6:H6').format.font.bold=true;
s.getRange('C2:E6').setNumberFormat('0.00');
s.getRange('G2:L6').setNumberFormat('0.00');
s.getRange('B2:B5').setNumberFormat('0%');
s.getRange('J1:K1').setNumberFormat('0%');
s.getRange('F2:F5').setNumberFormat('0.000000');
await fs.writeFile(out+'before.png',new Uint8Array(await (await wb.render({sheetName:s.name,range:'A1:L6',scale:1.5,format:'png'})).arrayBuffer()));
install(s,5);
s.getRange('M1:Q1').values=[['VAT zaokrąglony','Reszta VAT','Różnica (gr)','Kolejność korekty','Korekta VAT (zł)']];
s.getRange('M1:Q6').format.columnWidth=21;
s.getRange('M1:Q1').format.font.bold=true;
s.getRange('M2:M5').setNumberFormat('0.00');
s.getRange('N2:N5').setNumberFormat('0.0000000000');
s.getRange('O2:P5').setNumberFormat('0');
s.getRange('Q2:Q5').setNumberFormat('0.00');
s.getRange('F1').values=[['Odległość od progu']];
for(const c of ['C','G','H'])s.getRange(`${c}6`).formulas=[[`=ROUND(SUM(${c}2:${c}5),2)`]];
s.getRange('D6').formulas=[['=ROUND(SUM(C2:C5)+SUM(M2:M5),2)']];
s.getRange('E6').formulas=[['=ROUND(SUM(M2:M5),2)']];
for(const r of [2,3,4])s.getRange(`L${r}`).formulas=[[r===4?'=ROUND(L2+L3,2)':`=SUM(J${r}:K${r})`]];
s.getRange('I7:I10').values=[['Różnica VAT'],['Różnica brutto'],['Różnica netto'],['Kontrola']];
for(const c of ['J','K']){
  s.getRange(`${c}7:${c}10`).formulas=[
    [`=ROUND(SUMIFS($G$2:$G$5,$B$2:$B$5,${c}$1)-${c}3,2)`],
    [`=ROUND(SUMIFS($H$2:$H$5,$B$2:$B$5,${c}$1)-${c}4,2)`],
    [`=ROUND(SUMIFS($C$2:$C$5,$B$2:$B$5,${c}$1)-${c}2,2)`],
    [`=IF(AND(${c}7=0,${c}8=0,${c}9=0),"OK","SPRAWDŹ")`]
  ];
}
const notes=[
'F: mniejsza odległość oznacza wcześniejszą korektę. Wartość 1 wyklucza pozycję.',
'Każda korekta wynosi +0,01 albo −0,01 zł. Remis rozstrzyga wcześniejszy wiersz.',
'J3 i K3: VAT z faktury. Domyślnie wyliczony od sumy netto danej stawki.',
'Netto wpisuj z dokładnością do grosza. Nieznana stawka lub niemożliwa korekta daje #N/A.',
'Więcej pozycji: wstaw wiersze przed ostatnią pozycją (obecnie wiersz 5) i skopiuj D:H oraz M:Q.',
'Zachowaj ostatnią pozycję w zakresie sum. Nie dopisuj pozycji pod wierszem RAZEM.',
'D i E zachowują wartości teoretyczne. G i H zawierają kwoty do księgowania.'
];
for(let i=0;i<notes.length;i++){
 s.mergeCells(`A${8+i}:H${8+i}`);s.getRange(`A${8+i}`).values=[[notes[i]]];
 s.getRange(`A${8+i}:H${8+i}`).format.rowHeight=25;
}
wb.recalculate();
console.log((await wb.inspect({kind:'region',sheetId:s.name,range:'F1:Q10',maxChars:4000,tableMaxCols:12,tableMaxRows:10})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!',options:{useRegex:true,maxResults:30},summary:'Błędy formuł'})).ndjson);
await fs.writeFile(out+'after.png',new Uint8Array(await (await wb.render({sheetName:s.name,range:'A1:Q15',scale:1.5,format:'png'})).arrayBuffer()));
const authored=[];
for(let row=0;row<15;row++)for(let col=0;col<17;col++){
 const cell=s.getCell(row,col),formula=cell.formulas[0][0],value=cell.values[0][0];
 if(formula || (row===0&&col===5) || col>=12 || row>=6)if(value!==null&&value!==undefined||formula)authored.push({row,col,formula,value});
}
await fs.writeFile(out+'authored.json',JSON.stringify(authored));
await (await SpreadsheetFile.exportXlsx(wb)).save(out+'arkusz-vat.xlsx');
console.log('Wynik:',JSON.stringify(s.getRange('G2:H6').values));
