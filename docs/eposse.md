## Wagwoordherstel-OTP

Wanneer: `POST /api/auth/forgot-password` as die e-pos aan ’n nie-anonimiseerde gebruiker behoort. Kode geldig 15 minute.

Onderwerp: Herstel jou wagwoord — Diamant Laan

Teks:

Herstel jou wagwoord

Hallo {naam},

Gebruik hierdie kode om jou wagwoord te herstel. Dit is vir 15 minute lank geldig:

{kode}

As jy nie hierdie versoek gemaak het nie, kan jy hierdie e-pos ignoreer.

Diamant Laan

## Handmatige aankoop welkom

Wanneer: admin skep ’n handmatige aankoop en daar is nog nie ’n gebruiker vir daardie e-pos nie.

Onderwerp: Jou Diamant Laan rekening — Diamant Laan

Teks:

Welkom by die Diamant Laan Projek

Hallo {naam},

Jou aankoop is suksesvol verwerk. Ons het ’n rekening vir jou geskep met die e-posadres {e-pos}.

Jou tydelike wagwoord is:

{tydelike wagwoord}

Jy sal gevra word om jou wagwoord te verander wanneer jy vir die eerste keer aanmeld.

Meld aan ({werf}/meld-aan)

As jy nie hierdie aankoop gemaak het nie, kontak ons asseblief.

Diamant Laan

## Gas-aankoop eis

Wanneer: PayFast ITN (of `simulate-itn` in ontwikkeling) bevestig ’n gas-aankoop met gas-e-pos. Een keer. Skakel geld 90 dae.

Onderwerp: Jou Diamant Laan aankoop is bevestig

Teks:

Dankie vir jou bydrae tot Diamant Laan

Hallo daar,

Jou betaling is bevestig. Jy het {aantal} blok/blokke geborg, R{totaal} in totaal.

Jy het sonder ’n rekening gekoop. As jy later van plan verander, kan jy met hierdie skakel een skep en jou blokke daaraan koppel:

Skep ’n rekening ({werf}/betalings/klaar?aankoop={id}&sleutel={token})

Met ’n rekening kan jy:

- Die vordering van elke blok volg, van nog nie begin nie tot klaar geteer
- Foto’s sien van die werk op jou blokke
- Jou sertifikaat enige tyd weer aflaai
- Al jou aankope op een plek hou

Die skakel werk vir 90 dae. Jy hoef niks te doen as jy tevrede is soos jy is nie, jou bydrae bly staan.

Diamant Laan

## Blokvordering

Wanneer: admin verander blokstatus (`PUT /api/admin/squares/status`). Wag 15 minute sonder verdere veranderinge. Nie gestuur as die gebruiker vorderings-e-posse afgeskakel het, geanonimiseer is, of geen e-pos of blokke het nie.

Onderwerp: Opdatering op jou blokke — Diamant Laan

Teks:

Opdatering van jou Diamant Laan blokke

Hallo {naam},

Jy het {aantal} blok/blokke. Hier is die huidige status:

- {aantal} — Nog nie begin nie
- {aantal} — Voorberei
- {aantal} — Besig om te teer
- {aantal} — Klaar geteer

Daar is vorderingsfoto’s beskikbaar. Besoek die webwerf om hulle te sien.

of

Besoek die webwerf om die nuutste vordering op jou blokke te sien.

Sien My Blokke ({werf}/my-blokke)

Jy kan e-posse soos hierdie afskakel onder My Profiel.

Diamant Laan
