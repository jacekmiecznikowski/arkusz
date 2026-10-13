# Arkusz VAT

Formuły do uzgadniania VAT pozycji z VAT liczonym od sumy netto osobno dla każdej stawki.

Gotowe ODS i XLSX przekazano osobno. Repozytorium zawiera kod i testy ze sztucznymi kwotami. Nie zawiera danych z załącznika.

## Działanie

- M: VAT zaokrąglony do grosza. N: VAT teoretyczny minus zaokrąglony.
- O: liczba groszy do rozdzielenia osobno dla stawki.
- F: odległość od progu zaokrąglenia. Dodawanie preferuje największą dodatnią resztę, odejmowanie najbardziej ujemną. Wartość 1 wyklucza pozycję. Nie dodajemy sztucznej wartości zależnej od numeru wiersza do reszty.
- P: kolejność w grupie VAT. Remis rozstrzyga wcześniejszy wiersz.
- Q: korekta ±0,01 zł dla odpowiedniej liczby pozycji.
- G: VAT do księgowania. H: brutto do księgowania.

Korekty nie mieszają stawek i nie zmieniają netto. Pozycja otrzymuje najwyżej jeden grosz korekty. Niemożliwa korekta, nieznana/zdublowana stawka lub netto z ułamkiem grosza dają widoczny błąd #N/A.

## Użytkowanie gotowego arkusza

Netto w C podawaj z dokładnością do grosza. J1 i K1 określają dwie stawki (domyślnie 8% i 23%). J3/K3 domyślnie obliczają VAT od sumy netto. Można je zastąpić kwotami VAT z faktury. Kontrola w J7:K10 porównuje VAT, brutto i netto.

Więcej pozycji: wstaw wiersze przed ostatnią pozycją (obecnie wiersz 5) i skopiuj D:H oraz M:Q. Wstawianie wewnątrz zakresu rozszerza zakresy sum. Nie dopisuj danych pod RAZEM. Sprawdź kontrolę zgodności. D/E zachowują pełną precyzję teoretyczną, G/H są rzeczywiście zaokrąglone.

## Kod i testy

- `work/formulas.mjs` — wspólne formuły arkusza i testów.
- `work/tests.mjs` — 124 zaliczone testy syntetyczne. Niezależny model całkowitoliczbowy oraz eksport/import XLSX i przeliczenie po zmianie danych.
- `work/build.mjs` — tworzenie XLSX, kontrola wartości i podgląd przy użyciu @oai/artifact-tool.
- `work/ods_bridge.py` — odczyt własnego ODS i zapis komórek utworzonych przez Artifact Tool z zachowaniem pozostałej zawartości ODS.

Testy: +/− jeden i wiele groszy, remisy, kwoty dodatnie/ujemne, mieszane znaki, pół grosza, stawki 0%, 5%, 8%, 23%, puste wiersze, zera, duże kwoty, VAT faktury i błędne wejścia. Każda pozycja VAT i brutto jest porównywana z niezależnym modelem. Aplikacje LibreOffice i Excel były niedostępne. ODS sprawdzono pod kątem ZIP/XML, wartości i zapisu formuł. Nie wykonano testów w natywnych aplikacjach.

## Uruchomienie w środowisku Codex

Testy nie wymagają załącznika:

```bash
mkdir -p outputs/vat
ln -s "$CODEX_PRIMARY_RUNTIME_NODE_MODULES" work/node_modules
"$CODEX_PRIMARY_RUNTIME_NODE" work/tests.mjs
```

Budowanie na własnym załączniku (pliki wejściowe i wyniki są ignorowane przez git):

```bash
python work/ods_bridge.py read 'upload/Bez tytułu.ods'
"$CODEX_PRIMARY_RUNTIME_NODE" work/build.mjs
python work/ods_bridge.py write 'upload/Bez tytułu.ods' outputs/vat/authored.json outputs/vat/arkusz-vat.ods
```

Poza środowiskiem Codex potrzebna jest biblioteka @oai/artifact-tool. Gotowe formuły w arkuszach nie wymagają tej biblioteki.
