export function rowFormulas(r,end) {
  const b=`$B$2:$B$${end}`, m=`$M$2:$M$${end}`, f=`$F$2:$F$${end}`;
  const guard=x=>`=IF(ISBLANK(C${r}),"",${x})`;
  return {
    M:guard(`IF(AND(ISNUMBER(C${r}),ISNUMBER(B${r}),C${r}=ROUND(C${r},2),COUNTIFS($J$1:$K$1,B${r})=1),ROUND(E${r},2),NA())`),
    N:guard(`ROUND(E${r}-M${r},10)`),
    O:guard(`IF(COUNTIFS($J$1:$K$1,B${r})=1,ROUND((HLOOKUP(B${r},$J$1:$K$3,3,0)-SUMIFS(${m},${b},B${r}))*100,0),NA())`),
    F:guard(`IF(O${r}=0,0,IF(N${r}*SIGN(O${r})>0,ROUND(0.005-SIGN(O${r})*N${r},10),1))`),
    P:guard(`COUNTIFS(${b},B${r},${f},"<"&F${r})+COUNTIFS($B$2:B${r},B${r},$F$2:F${r},F${r})`),
    Q:guard(`IF(AND(F${r}<1,P${r}<=ABS(O${r})),SIGN(O${r})/100,0)`),
    G:guard(`IF(ABS(O${r})>COUNTIFS(${b},B${r},${f},"<1"),NA(),ROUND(M${r}+Q${r},2))`),
    H:guard(`ROUND(C${r}+G${r},2)`)
  };
}
export function install(sheet,end) {
  for(let r=2;r<=end;r++) {
    sheet.getRange(`D${r}:E${r}`).formulas=[[`=C${r}+E${r}`,`=C${r}*B${r}`]];
    for(const [col,formula] of Object.entries(rowFormulas(r,end)))sheet.getRange(`${col}${r}`).formulas=[[formula]];
  }
  for(const col of ['J','K']){
    sheet.getRange(`${col}2:${col}4`).formulas=[
      [`=SUMIFS($C$2:$C$${end},$B$2:$B$${end},${col}$1)`],
      [`=ROUND(${col}1*${col}2,2)`],
      [`=ROUND(${col}2+${col}3,2)`]
    ];
  }
}
