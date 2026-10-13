"""Read ODS and serialize Artifact Tool-authored cells while preserving native layout."""
import json, re, sys, zipfile, copy
import xml.etree.ElementTree as ET
from pathlib import Path
T='urn:oasis:names:tc:opendocument:xmlns:table:1.0'
O='urn:oasis:names:tc:opendocument:xmlns:office:1.0'
P='urn:oasis:names:tc:opendocument:xmlns:text:1.0'
src=Path(sys.argv[2])
z=zipfile.ZipFile(src)
raw=z.read('content.xml')
for prefix, uri in re.findall(rb'xmlns:([^= ]+)="([^"]+)"',raw):
    ET.register_namespace(prefix.decode(),uri.decode())
r=ET.fromstring(raw)
r.set('xmlns:of','urn:oasis:names:tc:opendocument:xmlns:of:1.2')
s=r.find('.//{'+T+'}table')
rows=s.findall('{'+T+'}table-row')
def expand(row):
    result=[]
    for c in row:
        n=int(c.get('{'+T+'}number-columns-repeated','1'))
        for _ in range(min(n,21)):
            v=copy.deepcopy(c);v.attrib.pop('{'+T+'}number-columns-repeated',None);result.append(v)
    return result
if sys.argv[1]=='read':
    out=[]
    for row in rows[:6]:
        a=[]
        for c in expand(row)[:12]:
            v=c.get('{'+O+'}value')
            a.append({'value':float(v) if v else ''.join(c.itertext()) or None,'formula':c.get('{'+T+'}formula'),'style':c.get('{'+T+'}style-name')})
        out.append(a)
    Path('work/source.json').write_text(json.dumps({'name':s.get('{'+T+'}name'),'rows':out},ensure_ascii=False))
else:
    cells=json.loads(Path(sys.argv[3]).read_text())
    while len(rows)<max(x['row'] for x in cells)+1:
        row=ET.SubElement(s,'{'+T+'}table-row');rows.append(row)
    byrow={}
    for x in cells:byrow.setdefault(x['row'],[]).append(x)
    def of(f):
        return 'of:'+re.sub(r'(?<![A-Z0-9_])\$?[A-Z]{1,3}\$?\d+(?::\$?[A-Z]{1,3}\$?\d+)?',lambda m:'['+':'.join('.'+a for a in m[0].split(':'))+']',f.replace(',',';'))
    for ri, changes in byrow.items():
        row=rows[ri];a=expand(row)
        while len(a)<max(x['col'] for x in changes)+1:a.append(ET.Element('{'+T+'}table-cell'))
        for x in changes:
            c=a[x['col']];style=c.get('{'+T+'}style-name')
            c.clear()
            if style:c.set('{'+T+'}style-name',style)
            elif x['row']==0:c.set('{'+T+'}style-name','ce1')
            elif x['col']>=12:c.set('{'+T+'}style-name','ce5' if x['col'] in (12,16) else 'ce6')
            if x.get('formula'):c.set('{'+T+'}formula',of(x['formula']))
            v=x.get('value')
            if isinstance(v,(int,float)):
                c.set('{'+O+'}value-type','float');c.set('{'+O+'}value',str(v))
            elif v is not None:c.set('{'+O+'}value-type','string')
            if v is not None:ET.SubElement(c,'{'+P+'}p').text=str(v)
        for c in list(row):row.remove(c)
        if ri>=7 and a[0].find('{'+P+'}p') is not None:
            while len(a)<8:a.append(ET.Element('{'+T+'}table-cell'))
            a[0].set('{'+T+'}number-columns-spanned','8')
            for ci in range(1,8):a[ci]=ET.Element('{'+T+'}covered-table-cell')
        row.extend(a)
    # Extra helper widths: preserve original A:L columns, append readable helpers.
    cols=s.findall('{'+T+'}table-column')
    S='urn:oasis:names:tc:opendocument:xmlns:style:1.0'
    F='urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0'
    auto=r.find('{'+O+'}automatic-styles')
    cs=ET.SubElement(auto,'{'+S+'}style',{'{'+S+'}name':'coHelper','{'+S+'}family':'table-column'})
    ET.SubElement(cs,'{'+S+'}table-column-properties',{'{'+S+'}column-width':'4.3cm','{'+F+'}break-before':'auto'})
    for _ in range(5):
        c=ET.Element('{'+T+'}table-column',{'{'+T+'}style-name':'coHelper'})
        s.insert(len(cols),c);cols.append(c)
    with zipfile.ZipFile(sys.argv[4],'w',zipfile.ZIP_DEFLATED) as out:
        for item in z.infolist():out.writestr(item,ET.tostring(r,encoding='UTF-8',xml_declaration=True) if item.filename=='content.xml' else z.read(item.filename))
