# Arkusz VAT

Formuły do uzgadniania VAT pozycji z VAT liczonym od sumy netto dla każdej stawki.

## Pliki

- `arkusz-vat.ods` — poprawiony arkusz z zachowaniem oryginalnego układu.
- `arkusz-vat.xlsx` — wersja XLSX.
- `testy.txt` — wynik testów.
- `work/formulas.mjs` — wspólne formuły arkusza i testów.
- `work/build.mjs` — budowanie i weryfikacja XLSX przy użyciu @oai/artifact-tool.
- `work/test_vat.mjs` — testy prawdziwych formuł, niezależny model całkowitoliczbowy i ponowny import XLSX.
- `work/ods_bridge.py` — odczyt ODS i zapis komórek utworzonych przez Artifact Tool z zachowaniem pozostałych elementów ODS.

## Działanie

1. M zaokrągla VAT każdej pozycji do grosza. N zachowuje różnicę między VAT teoretycznym a zaokrąglonym.
2. O wylicza liczbę groszy między VAT faktury a sumą zaokrąglonego VAT dla stawki.
3. F ustala odległość od progu zaokrąglenia. Dodawanie grosza preferuje największą dodatnią resztę. Odejmowanie preferuje najbardziej ujemną resztę. Wartość 1 wyklucza pozycję z korekty w danym kierunku.
4. P ustala kolejność osobno dla każdej stawki. Remisy rozstrzyga wcześniejszy wiersz, bez dodawania sztucznej wartości zależnej od numeru wiersza do reszty.
5. Q przydziela po jednym groszu do odpowiedniej liczby pozycji. G zawiera VAT do księgowania, H brutto.

Korekty nie mieszają stawek i nie zmieniają netto. Każda pozycja może otrzymać najwyżej jeden grosz korekty. Gdy zadana suma wymaga więcej korekt niż jest odpowiednich pozycji, wynik to #N/A zamiast wymuszania nieuzasadnionej zmiany.

## Użytkowanie

Netto w C podawaj z dokładnością do grosza. J1 i K1 określają dwie stawki w tym arkuszu (domyślnie 8% i 23%). J3 i K3 domyślnie obliczają VAT od sumy netto. Można zastąpić je kwotami VAT z faktury. Nieznana stawka i netto z ułamkiem grosza pozostają widocznymi błędami.

Więcej pozycji: wstaw wiersze przed ostatnią pozycją (obecnie wiersz 5) i skopiuj D:H oraz M:Q. Wstawianie wewnątrz zakresu rozszerza zakresy sum. Nie dopisuj danych pod RAZEM. Sprawdź kontrolę zgodności dla obu stawek. D/E zachowują pełną precyzję teoretyczną, G/H są rzeczywiście zaokrąglone, nie tylko sformatowane.

## Testy

Testy obejmują dodawanie i odejmowanie jednego oraz wielu groszy, remisy, kwoty dodatnie/ujemne, mieszane znaki, progi pół grosza, 0%, 5%, 8%, 23%, puste wiersze, zera, duże kwoty, VAT z faktury i błędne wejścia. Sprawdzana jest każda pozycja oraz przeliczenie po ponownym imporcie XLSX.

Testy wykonuje silnik @oai/artifact-tool. Aplikacje LibreOffice/Excel nie były dostępne, dlatego nie wykonano testu bezpośrednio w tych aplikacjach.

## Uruchomienie w środowisku Codex

```bash
ln -s "$CODEX_PRIMARY_RUNTIME_NODE_MODULES" work/node_modules
python work/ods_bridge.py read 'upload/Bez tytułu.ods'
"$CODEX_PRIMARY_RUNTIME_NODE" work/build.mjs
"$CODEX_PRIMARY_RUNTIME_NODE" work/test_vat.mjs
python work/ods_bridge.py write 'upload/Bez tytułu.ods' outputs/vat/authored.json outputs/vat/arkusz-vat.ods
```

Poza środowiskiem Codex potrzebna jest biblioteka @oai/artifact-tool. Same formuły w gotowych plikach nie wymagają tej biblioteki.
