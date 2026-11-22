# Malagasy strings to review by a native speaker

All of `mg.ts` was written by a non-native speaker. These entries are the least certain. Keys are in `src/i18n/mg.ts`.

| Key | English | Malagasy | Why unsure |
| --- | --- | --- | --- |
| nav.hallOfFame, hall.title, stop.hall, featured.title, features.fame.title | Hall of Fame | Efitrano Voninahitra | "Hall of honour" calque; no established term known |
| nav.heritage, heritage.title | Heritage index / Living Heritage Index | Lisitry ny lova (velona) | "Index" rendered as "lisitra" (list) |
| nav.explore, explore.title | Explore | Hitsidika | "Visit" used for "explore"; maybe "Hikaroka" or "Hizaha" fits better |
| nav.scan, scan.title | Check a photo | Hamarino ny sary | "Verify the picture"; "sary" vs "sary an-tsary" for photo |
| hero.line1-3 | EVERY ART DESERVES A MUSEUM | MENDRIKA / TRANOMBAKOKA / ZAVA-KANTO | VSO word order split over 3 short lines to fit the 3D wall; "rehetra" (every) dropped; the full sentence is in menu.tag |
| hero.bubble, menu.text, features.scan.title | Scan | Scan-o | "scan" kept as a loanword with imperative suffix |
| hero.descriptor | The free app that scans... | Aplikasiona maimaim-poana: manao scan... | Shortened to fit; "aplikasiona" vs "rindrambaiko" |
| neon.line1-2 | NO ART LEFT BEHIND, NO MASTER FORGOTTEN! | TSY AFOY NY ZAVA-KANTO, / TSY HADINO NY MPAHAY! | Free adaptation; "afoy" (abandon) and "mpahay" (master) uncertain |
| heritage.masters, heritage.intro, features.learn.* | masters | mpahay | "Mpahay" (expert) chosen for craft masters; "mpampianatra" or another term may be better |
| heritage.red / orange / green | Endangered / Weakening / Passed on | Atahorana ho levona / Miha-malemy / Nafindra | Status vocabulary; "Nafindra" for "passed on" |
| heritage.age | Median age | Taona antonony | "antonony" for median |
| heritage.intro | red-list rule | latsaky ny antsasany ... | Long sentence, check grammar |
| proof.human, scan.human_proven, publish.doneProven | Human-made, proven | Nataon'olombelona, voaporofo | Fine grammar, but "tombo-kase" (seal) for the human-made seal is unsure |
| proof.ai | AI-assisted, declared | Nampiasana AI, voambara | "AI" kept as acronym; "voambara" (stated) for "declared" |
| proof.*, museum.proof, publish.proof | Proof of process | Porofon'ny fanaovana | Literal; could be more natural |
| footer.text | fingerprint and date | marika mampiavaka azy sy ny datiny | "Fingerprint" (file hash) avoided as a technical term |
| vote.cta | Vote for this work | Omeo vato ity zava-kanto ity | "Give a vote" idiom; check |
| votes.one / votes.other | N vote(s) | N vato | Malagasy has no plural marking; "vato" (stone/ballot) used for vote |
| features.vote.text | Half public, half jury... | Antsasany vahoaka, antsasany mpitsara, mba handresen'ny asa tsara indrindra | Check |
| featured.text | public-domain classics | zava-kanto lehibe an'ny daholobe | "Public domain" paraphrased |
| explore.loadingWorks, explore.loadingArtists, hall.loading, heritage.loading, space.loading, scan.checking, museum.building, vote.voting, publish.publishing | Loading... | Eo am-pakana..., Eo am-pamarinana, Eo am-p... | "Eo am-pakana" (being fetched) is an unconfirmed wording for loading |
| category.* / art.* | Painting, Sculpture, Photography, Oral arts, Crafts, Textile, Print, Portrait, Words | Sary hosodoko, Sary sokitra, Fakana sary, Kanto am-bava, Asa tanana, Lamba, Pirinty, Sarin-tarehy, Teny | Several are descriptive guesses |
| work.kind.model | 3D object | Zavatra 3D | Check |
| work.*.title, reel.* | Works titles | kept in English | Left untranslated as proper names; a Malagasy or French title may be preferable |
| work.*.meta | e.g. "19th century", "the art of speech", "bronze" | taonjato faha-19, ny kanto fitenenana, bronze | "bronze" has no confirmed Malagasy term; kabary described as "kanto fitenenana" |
| card.oralTagline | the Malagasy art of speech | ny kanto fitenenana malagasy | Same |
| work.walking.text, work.julia.text, work.water.text | wall texts | see mg.ts | Poetic phrasing, check tone |
| scan.by, scan.visit, work.alt, meta.museum | by {artist} / {artist}'s museum | nataon'i {artist} / tranombakokan'i {artist} | Assumes the artist name follows "i"/"n'i" correctly for every name |
| auth.email | Email | Mailaka | "Mailaka" vs "Imailaka" |
| auth.password | Password | Tenimiafina | Standard, but confirm |
| gallery.join, contact.cta | Join ARTIKO / Join as an artist | Hiaraka amin'i ARTIKO / Hiditra ho mpanakanto | "Join" ambiguous between "hiditra" (enter) and "hiaraka" |
| stop.features | Features | Endri-javatra | Check |
| stop.forms | Art forms | Karazana | Shortened to fit the header bar |
| hero.scroll | Scroll to explore | Mizotra midina hijery | Check |
| menu.free | Free | Maimaim-poana | Fine, but confirm for a badge |
| doodle.winners / doodle.hello | WINNERS / HELLO | MPANDRESY / SALAMA | Check |
| publish.intro | sketches... timelapse, stems | rakikira, sary isaky ny dingana, timelapse, feo tsirairay | "Stems" (audio stems) translated loosely |
| error.title | This page could not load its works | Tsy mety mampiseho ny asa ity pejy ity | Check |
| auth.verified | Address confirmed, sign in. | Voamafy ny adiresy, midira. | "Voamafy" (confirmed) assumed from "hamafiso" |
| auth.checkUnavailable | The password check is unavailable for now. Try again in a few minutes. | Tsy azo atao vetivety ny fanamarinana ny tenimiafina. Andramo indray afaka minitra vitsy. | "vetivety" (for now) and "afaka minitra vitsy" (in a few minutes), check |
| auth.tooLong | This password is too long. | Lava loatra io tenimiafina io. | Built like auth.tooShort with "lava" (long), check |
| import.*, viewer.* | 3D import and 3D viewer | Fanovana ny scan, Sary fiandrasana, Fijerena 3D, Hazavana avo (HD)... | Written by a non-native speaker; "sary fiandrasana" (waiting image) for poster, "navigateur" kept as a loanword |
| api.unreachable, api.not_ready, api.not_found | The service did not answer / is unavailable for now / This is not available on the service for now | Tsy namaly ny tolotra / Tsy azo ampiasaina vetivety ny tolotra / Tsy misy an'izany ao amin'ny tolotra amin'izao fotoana izao | "tolotra" for the service, as in error.text; "vetivety" (for now) as in auth.checkUnavailable |
| api.unauthorized, api.invalid_token | Sign in first. / We could not confirm your sign-in. Try again in a few minutes, or sign in again. | Midira aloha. / Tsy voamarina ny fidiranao. Andramo indray afaka minitra vitsy, na midira indray. | "fidirana" for a sign-in, as in auth.resetDone; "tsy voamarina" (not verified) for "could not confirm"; "afaka minitra vitsy" as in auth.checkUnavailable |
| api.not_an_artist | Create your artist profile first. | Tehirizo aloha ny mombamomba anao ho mpanakanto. | Says "save your details as an artist first"; no sure verb for "create a profile" |
| api.duplicate_work, api.possible_copy | This exact file is already published on Artiko. / This image looks like another work. The jury will look at it before it can be published. | Efa navoaka ao amin'i Artiko io rakitra io mihitsy. / Mitovitovy amin'ny asa hafa ity sary ity. Hojeren'ny mpitsara izy vao azo avoaka. | "mihitsy" for "exact"; "mitovitovy" (looks like); "vao azo avoaka" (before it can be published) |
| api.invalid_exposition, api.too_many_proofs | Choose one of your own expositions. / A work takes 5 proof files at most. | Misafidiana iray amin'ireo fampirantianao. / Rakitra porofo 5 farafahabetsany isaky ny asa. | "farafahabetsany" (at most), built like "farafaharatsiny" |
| api.extras_need_model, api.invalid_model_hd, api.invalid_poster | The HD model and the poster image only go with a 3D model. / The HD model is not a valid GLB file. / The poster image must be a JPEG, PNG or WebP image. | Ny modely HD sy ny sary fiandrasana dia miaraka amin'ny modely 3D ihany. / Tsy rakitra GLB mety ny modely HD. / Tsy maintsy sary JPEG, PNG na WebP ny sary fiandrasana. | Same words as import.* ("modely", "sary fiandrasana"), same doubts |
| api.file_too_large, api.empty_file, api.unsupported_file, api.not_an_image | A file is over the size limit. / A file is empty. Choose another one. / This type of file is not accepted. / Send a photo (JPEG, PNG or WebP). | Misy rakitra mihoatra ny habe azo ekena. / Misy rakitra foana. Misafidiana hafa. / Tsy ekena io karazana rakitra io. / Mandefasa sary (JPEG, PNG na WebP). | "habe azo ekena" (accepted size) is a guess; "foana" for an empty file |
| api.file_too_large.named, api.empty_file.named, api.unsupported_file.named | {file} is over {max} MB. / {file} is empty. Choose another one. / {file}: this type of file is not accepted. | Mihoatra ny {max} MB ny rakitra {file}. / Foana ny rakitra {file}. Misafidiana hafa. / {file}: tsy ekena io karazana rakitra io. | Word order with a file name after "ny rakitra" (the file) is a guess; "MB" as in publish.fileHelp |
| api.work_not_found, api.artist_not_found, api.exposition_not_found, api.practice_not_found, api.file_not_found, api.invalid_link | This work / artist / exposition / practice / file was not found. / This link is invalid or has expired. | Tsy hita io asa / mpanakanto / fampirantiana / fanao / rakitra io. / Tsy mety na lany daty io rohy io. | "io ... io" for "this"; "tsy mety" for "invalid" |
| api.invalid_request, api.internal_error | Something sent was not valid. Check what you entered, then try again. / Something went wrong on our side. Try again in a moment. | Misy zavatra nalefa tsy mety. Jereo izay nosoratanao, dia andramo indray. / Nisy olana teo anilanay. Andramo indray afaka fotoana fohy. | "teo anilanay" (on our side) is a calque; "afaka fotoana fohy" (in a moment) |
