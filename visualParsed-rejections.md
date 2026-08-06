# visualParsed import — rejected songs

**2180** files examined · **1080** imported · **887** rejected

Every row shows the score behind the decision so the thresholds can be re-tuned.

## Summary

| Count | Reason |
|---:|---|
| 703 | Already in the database — same opening line |
| 138 | Duplicated inside visualParsed |
| 30 | Failed the quality audit |
| 6 | Already in the database — lyrics overlap |
| 6 | Server refused — name ≥80% similar to an existing song |
| 4 | Already in the database — opening line found inside it |

## Thresholds used

| Test | Threshold | Rejected by it |
|---|---:|---:|
| Whole-lyric overlap | 0.90 | 6 |
| Opening-line similarity | 0.88 | 703 |
| Opening line inside another song | 0.88 (and ≥0.45 body) | 4 |
| Duplicate within visualParsed | 0.90 | 138 |
| Server name check (Dice on the title) | 0.80 | 6 |

## Already in the database — same opening line — 703

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Aa mundla kireetam boyenu ghanambukalgenu | 9 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.14 body |
| Aacharinchuchununnaamu aa chandhamu | 16 | Aanandamaanandame | 0.93 first line / 0.10 body |
| Aadharimpumu Yesuvaa | 12 | Yese Naa Aashrayamu | 0.92 first line / 0.09 body |
| Aahaa anthyatheerpu nanduna | 16 | Aaraadhana Yesu Neeke | 0.93 first line / 0.09 body |
| Aahaa naakemaanandhamu Shree Yesu | 20 | Aahaa Yemaanandam | 0.94 first line / 0.12 body |
| Aakaashaana sukka elise | 17 | Aakaasha Vaasulaaraa | 0.92 first line / 0.09 body |
| Aakaashamu bhuvilo nella Yesu unnathudu | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Aakaashamunu bhoomiyu gathinchunu gaani | 4 | Nee Naamam Naa Gaanam | 1.00 first line / 0.22 body |
| Aalakinthunu aa pilupunu sevinchedhanu Devuni | 13 | Premagala Yesayyaa | 0.93 first line / 0.23 body |
| Aalinchu maa praarthana maa rakshakaa | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.09 body |
| Aamen halleluyaa | 8 | Parama Thandri Neeke Sthothram | 0.94 first line / 0.14 body |
| Aananda gaanaalatho | 18 | Ghanamaina Naa Yesayyaa | 0.94 first line / 0.16 body |
| Aananda maanandha maayenu | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Aananda magu mukthi e naa mandiramu | 11 | Aanandamaanandame | 0.93 first line / 0.18 body |
| Aananda sandhrambuna naa jeevitha naavanu | 11 | Naa Jeevithaanthamu | 0.92 first line / 0.10 body |
| Aanandam aanandam | 10 | Aanandamaanandame | 1.00 first line / 0.15 body |
| Aanandam aanandam dhinadhinam aanandam | 12 | Aanandamaanandame | 0.93 first line / 0.15 body |
| Aanandam aanandame raaraaju puttenani | 17 | Aanandamaanandame | 1.00 first line / 0.21 body |
| Aanandam Yesutho | 12 | Aanandamaanandame | 0.93 first line / 0.18 body |
| Aanandame Prabhu Yesuni | 11 | Aanandame Paramaanandame | 0.95 first line / 0.15 body |
| Aanandhamaanandha maayenu naadu priyakumaaruni yandu | 23 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Aanni Kaalambula Nunna Yohovaa | 13 | Anni Kaalambula | 0.96 first line / 0.86 body |
| Aaraadhana naa Yesuke | 6 | Aaraadhana Yesu Neeke | 0.93 first line / 0.26 body |
| Aaraadhinchedamu aathmatho sathyamutho | 14 | Aaraadhinchedanu Ninnu | 0.94 first line / 0.16 body |
| Aaraadhinthu aaraadhinthu Yesayya | 15 | Christmas Mashup 5.0 | 1.00 first line / 0.14 body |
| Aarbhaatamutho pradhaana dootha | 11 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.15 body |
| Aascharyakarudaa needu krupa | 8 | Aascharyakarudaa (Yesanna) | 1.00 first line / 0.21 body |
| Aashcharyakaramaina | 17 | Prabhuvaa Nee Kaaryamulu Aashcharyakaramainavi | 1.00 first line / 0.19 body |
| Aashrayam neeve Yesayyaa aadhaaram neeve Messayyaa | 28 | Aashrayamaa Aadhaaramaa | 1.00 first line / 0.26 body |
| Aashrayudaa naa Yesayya | 34 | Sari Raarevvaru | 0.94 first line / 0.16 body |
| Aathma mandhiramunu - Prabhu kattuchunnaadu | 18 | Aanandamaanandame | 1.00 first line / 0.14 body |
| Aathma niyamamu dwaaraa - Saagi povudhamu | 20 | Karuninchavaa Naa Yesuvaa | 0.95 first line / 0.16 body |
| Aayana dhanavanthudai yundiyu meeru | 28 | Aaraadhana Aaraadhana (Chellinchedamu) | 1.00 first line / 0.15 body |
| Aayanaashcharya karudu nannu rakshinchi kaapaadi | 9 | Aascharyakarudaa (Yesanna) | 0.92 first line / 0.21 body |
| Aayane naaku aashrayamu naa kota | 24 | Randi Yehovaanu Goorchi | 1.00 first line / 0.36 body |
| Aayane nannu nadipinchun | 13 | Painunna Aakaashamandunaa | 0.94 first line / 0.12 body |
| Adavi pushpamaa santhoshinchumaa kasthuree pushpamaa ullasinchumaa | 8 | Painunna Aakaashamandunaa | 0.94 first line / 0.15 body |
| Adbhutha deevenalu - Prabhuvaa kummarinchithivi | 16 | Entha Manchi Devudavesayyaa | 0.95 first line / 0.17 body |
| Adhyantha rahitha Prabhuvaa | 24 | Maa Sarvaanidhi Neevayyaa | 0.94 first line / 0.17 body |
| Adigo Kalvarilo Yesu rakshakude deenudai vrelaaduchunnaade | 23 | Siluva Chenthaku Raa | 0.93 first line / 0.13 body |
| Adigo vachchunadhevaro choodumaa mahima galigina mana Yese | 11 | Choodaalani Unnadi | 0.92 first line / 0.16 body |
| Aidu gaayamu londhinaavaa naakora | 17 | Gaayaamulan Gaayamulan | 0.94 first line / 0.08 body |
| Anaadi Devudu aashrayamu thana baahuvulu nee kaadhaarame | 17 | Prema Shaashwatha Kaalamundunu | 0.96 first line / 0.16 body |
| Ananthudaa aadarinche Yesayya | 16 | Maatlaaade Yesayyaa | 0.92 first line / 0.13 body |
| Andhakaaralokamunaku velugunivva Prabhuvu vachchenu | 15 | Shaashwathamu Kaadu Ee Lokamu | 0.95 first line / 0.18 body |
| Annaa mana Yesu prabhuni kanna | 12 | Naa Yesayyaa Naa Rakshakaa | 0.94 first line / 0.13 body |
| Annivelalaa aadharinchedi aathmaroopee neeke vandanam | 10 | Anni Velala Aaraadhana | 1.00 first line / 0.13 body |
| Annivelalaa aanandame | 14 | Anni Velala Aaraadhana | 0.93 first line / 0.16 body |
| Anthyadhinamandhu dootha boora noodhuchundagaa | 18 | Aathma Deepamunu | 1.00 first line / 0.17 body |
| Anudinamu maa bhaaramu | 19 | Naa Thandri | 0.95 first line / 0.16 body |
| Anukarinchedha ne nanudhinamunu baalu Desu | 21 | Ninne Ne Nammukunnaanu | 0.94 first line / 0.14 body |
| Apu darchakaadhu luppongiri Prabhuni | 12 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.07 body |
| Arpinthu sthuthul nee siluvalonaa | 12 | Premisthaa Ninne | 1.00 first line / 0.15 body |
| Asamaanundagu O Kreesthu - Adhvitheeyundagu Deva | 16 | Yesayyaa Naa Praana Naathaa | 0.94 first line / 0.17 body |
| Athadu mandhiramunakunu, balipeethamunakunu chuttu | 19 | Aathma Deepamunu | 1.00 first line / 0.16 body |
| Athani peru nithyamu niluchunu | 16 | Naalo Unna Aanandamu | 0.92 first line / 0.15 body |
| Baala Yesuni joodare | 12 | Yesu Neeku Kaavaalani | 0.94 first line / 0.14 body |
| Bahu saundharya Seeyonulo sthuthi simhaasanaaseenudaa | 11 | Sthuthi Simhaasanaaseenudaa (Yesu Raajaa) | 1.00 first line / 0.13 body |
| Bhaagyamau dinamu Prabhun gaikonna dinamu | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.14 body |
| Bhaaramainadhi seva maranamu kanna | 16 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.14 body |
| Bhaaratha Kraisthava yuvajanulaaraa | 12 | Aakaasha Vaasulaaraa | 0.92 first line / 0.11 body |
| Bhajiyimpa randi Prabhuyesuni | 19 | Choodaalani Unnadi | 0.92 first line / 0.15 body |
| Bhavishyadh gnaanamu pai nundi vachchu gnaanamu | 21 | Kalyaanam Kamaneeyam | 0.94 first line / 0.19 body |
| Bhayamu ledugaa manaku bhayamu ledugaa | 21 | Aaraadhana Aaraadhana (Chellinchedamu) | 1.00 first line / 0.16 body |
| Bhayapadaku | 10 | Bhayapadakumaa | 0.94 first line / 0.11 body |
| Bhayapadakumu neevu yudhdhamu Yehovadhe | 13 | Premagala Yesayyaa | 1.00 first line / 0.15 body |
| Bhayapadakumu o chinna mandaa | 25 | Nee Naamam Naa Gaanam | 1.00 first line / 0.16 body |
| Bhoomandalamu daani sampoornathayunu | 16 | Bhoomiyu Daani Sampoornatha | 0.92 first line / 0.20 body |
| Chaalina Devudavu Yesu chaalina Devuda neevu | 12 | Naaku Chaalina Devuda Neevu | 0.95 first line / 0.23 body |
| Chakkani paraloka sambandhulatho | 15 | Aakaashamaa Aalakinchumaa | 0.94 first line / 0.15 body |
| Chandhamaama chandhamaama | 27 | Christmas Mashup 5.0 | 1.00 first line / 0.11 body |
| Cheddaamaa poraatam | 18 | Poraatam Aathmeeya Poraatam | 1.00 first line / 0.11 body |
| Cheekati kaalamu vachchuchunde - Krupakaalamu nupayoginchu | 16 | Naa Thanuvu Naa Manasu | 0.94 first line / 0.20 body |
| Cherikolvudi Kreesthuni paadamula | 17 | Sthuthi Paadanaa Nenu | 0.93 first line / 0.12 body |
| Chetluleni Mettalandhu Nadula Paarajeyu Devaa | 14 | Choodaalani Unnadi | 0.92 first line / 0.15 body |
| Chinna paralokamanna mana hrudayam anna | 5 | Christmas Mashup 5.0 | 1.00 first line / 0.29 body |
| Chithikina naa jeevitham | 17 | Naa Jeevithaanthamu | 1.00 first line / 0.15 body |
| Chooda goreda Deva mandhiraavaranamulanu | 17 | Aanandamaanandame | 0.93 first line / 0.15 body |
| Choodaalani undi Yesuni cheraalani undi | 12 | Choodaalani Unnadi | 0.92 first line / 0.08 body |
| Choodumadhe nee korake siluvapai vrelaadu Shreeyesu rakshakun | 16 | Aadhaaram Naaku Aadhaaram | 0.93 first line / 0.15 body |
| Christmas vachchindhee santhosham techchindhee | 19 | Jai Jai Jai Yesayyaa | 1.00 first line / 0.15 body |
| Daagunedhi maapunu vegayesu rakthadhaare | 12 | Vinumaa Yesuni Jananamu | 0.95 first line / 0.17 body |
| Daahamu theerchumayyaa | 10 | Nee Koraku Naa Praanam | 1.00 first line / 0.17 body |
| Daaveedu vamsha Yesu Kreesthuku sthuthi chellinchudi | 11 | Sthuthi Paadanaa Nenu | 0.93 first line / 0.13 body |
| Davala varnudu | 12 | Aadhaaram Neevenayyaa (Medley) | 0.92 first line / 0.21 body |
| Dayagala Yesu paapikaashrayudaa priya Prabhu drohini karuninchumu | 15 | Naa Thandri | 0.95 first line / 0.17 body |
| Deevinchu Deva nee biddala | 16 | Choodaalani Unnadi | 0.92 first line / 0.09 body |
| Deshamaa naa deshamaa deshamaa Bhaaratha deshamaa | 28 | Mana Desham | 1.00 first line / 0.12 body |
| Deva Dhivyanantha Prabhaava | 17 | Yavvanaa Janamaa | 1.00 first line / 0.10 body |
| Deva gorrepilla siluvalo samasinapudu paapa parihaaraartha oota therachen | 32 | Idhigo Devuni Gorrepillaa | 1.00 first line / 0.14 body |
| Deva naa Devudavu neeve | 19 | Naa Devuni Krupavalana | 0.95 first line / 0.17 body |
| Deva naadheva nannela vidachithivani siluvalo baliyaina naa Yesuvaa | 25 | Nee Naamam Athi Madhuram | 1.00 first line / 0.12 body |
| Deva nee naamam entho balamainadi | 12 | Yehovaa Nee Naamamu | 0.96 first line / 0.24 body |
| Deva neeku sthothramu ee raathrilo | 8 | Devara Nee Deevenalu | 0.94 first line / 0.15 body |
| Deva ninnu nenu viduvanu nannu deevinchu varaku | 17 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.16 body |
| Deva samvathsaramunu dhayaakireetamugaa nichchi yunnaavu | 19 | Yavvanudaa | 0.94 first line / 0.15 body |
| Deva vembadinchithi nee naamamun | 12 | Nee Naamam Naa Gaanam | 0.92 first line / 0.15 body |
| Deva, naa hrudayamu nibbaramugaa | 12 | Idhe Naa Hrudaya Vaanchana | 0.95 first line / 0.18 body |
| Devaa naayandu neeku entho prema | 25 | Shaashwathamaina Prematho | 0.97 first line / 0.19 body |
| Devaa nee krupachoppuna nannu karunimpumu | 17 | Devaa Mahonnathudaa | 0.93 first line / 0.23 body |
| Devaa nee sannidhilo sampoorna santhosham | 15 | Nee Sannidhilo Santhoshamu | 1.00 first line / 0.17 body |
| Devara brovumaa deena kutumbamun | 12 | Devara Nee Deevenalu | 1.00 first line / 0.13 body |
| Devude manakaashrayamunu dhurgamunai yunnaadu | 20 | Aanandamaanandame | 0.93 first line / 0.16 body |
| Devudu deniki shilpiyunu nirmaanakudai yunnaado | 16 | Naa Devuni Krupavalana | 0.95 first line / 0.16 body |
| Devudu lokamunu entho preminchenu advitheeya kumaaruni anugrahinchenu | 10 | Devudu Lokamunu | 1.00 first line / 0.16 body |
| Devuni grandhamu dinadinamu | 14 | Nee Naamam Naa Gaanam | 1.00 first line / 0.19 body |
| Devuni keerthinchedhamu dhaivaputhruni naamamandhu | 17 | Nee Krupa Nithyamundunu | 1.00 first line / 0.15 body |
| Devuni nijaprema parishuddha granthamandhunnadhi | 11 | Gaayaamulan Gaayamulan | 0.94 first line / 0.14 body |
| Devuni pattanamaa manushyulu ninnu | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.09 body |
| Devuni sannidhilo sampoorna santhosham | 13 | Nee Sannidhilo Santhoshamu | 0.95 first line / 0.13 body |
| Dhaathruthvamunu galigi perugudhama | 15 | Sthuthi Paadanaa Nenu | 0.93 first line / 0.12 body |
| Dhaatumu Yordhaanun yaathrikudaa naalugu ghadiyalake athithivi neevichata | 15 | Yesanna Swaramannaa | 0.93 first line / 0.13 body |
| Dhaivadharshanamuna Yaakobu dhivyamuganu choochi | 16 | Naalo Unna Aanandamu | 0.92 first line / 0.17 body |
| Dhaivaprema manalanepudu bandhinchugaa | 10 | Nibandhanaa Janulam | 0.94 first line / 0.17 body |
| Dhanaraashulunnaa bhavanaalu | 12 | Naalo Unna Aanandamu | 0.92 first line / 0.10 body |
| Dhanya dhanya Yesu naamamu jayajaya Prabhu naamamu | 13 | Nee Naamam Athi Madhuram | 1.00 first line / 0.16 body |
| Dhanyudavu neevu dhanyudavu O Ishraayelu bahu dhanyudavu | 26 | Ishraayelu Raajuve | 0.93 first line / 0.20 body |
| Dhappigonina Vaanipai Neetin Kummarinchunu | 17 | Premagala Yesayyaa | 1.00 first line / 0.15 body |
| Dhappigonina vaaralaaraa dhappitheerchukona randi randi | 17 | Premagala Yesayyaa | 1.00 first line / 0.10 body |
| Dharaniloni dhanamu lella dharanipaalai povunu | 12 | Aaraadhana Anduko | 1.00 first line / 0.18 body |
| Dhashamu bhaagamu lella Dhevunivi | 18 | Bhayamu Ledu Manaku | 0.94 first line / 0.14 body |
| Dheevenatho selavimmu karthaa | 9 | Devara Nee Deevenalu | 1.00 first line / 0.16 body |
| Dheshasevanjesi Deva dhaasulai | 13 | Yese Naa Maargamu | 0.92 first line / 0.11 body |
| Dhevaadhi Devuni bhoojanulaaraa | 14 | Sankeerthana - Naa Sthuthikeerthana | 0.96 first line / 0.16 body |
| Dhevadhevuni goppa puramu | 21 | Naa Jeevithaanthamu | 0.92 first line / 0.12 body |
| Dhevadhevuni koniyaadedhamu - Aviratha thriyekuni sthothrinthumu | 32 | Devuni Sthuthincha Randi | 1.00 first line / 0.13 body |
| Dhoothaganamulella aaraadhinchirigaa parishuddhudu sainyamula Yehovani | 25 | Premagala Yesayyaa | 0.93 first line / 0.20 body |
| Dikkuleni vaadano Prabho | 15 | Aanandamaanandame | 0.93 first line / 0.15 body |
| Divya Yesu meeda naanukondhumu | 15 | Premagala Yesayyaa | 0.93 first line / 0.16 body |
| Duppi neetivaagulakoraku aashapadunatlu Deva | 15 | Nee Koraku Naa Praanam | 1.00 first line / 0.18 body |
| E dheshasthulamaina e jaathi manadhaina | 7 | Nee Naamam Naa Gaanam | 0.92 first line / 0.18 body |
| E paatidho naa jeevitham elaantidho aa naa gatham | 15 | Naa Jeevithaanthamu | 0.92 first line / 0.18 body |
| E samayamandhaina | 20 | Ae Samayamandainaa | 0.97 first line / 0.87 body |
| Ee dinam shubha dinam | 16 | Ee Dinamentho | 1.00 first line / 0.17 body |
| Eeyanaa Yesu rakshakudu | 19 | Naa Yesuu Nee Paadaala Chenthaa | 0.95 first line / 0.09 body |
| Emaashcharyamu priyulaaraa Kreesthu maranamu | 18 | Aascharyakarudaa (Yesanna) | 0.92 first line / 0.13 body |
| Emi ledu sumee jagamulo | 15 | Siluva Dhyaanam | 0.94 first line / 0.12 body |
| Endukayyaa Yesayya nannu | 10 | Yesu Nan Preminchithivi | 0.95 first line / 0.16 body |
| Entha aashcharyakarudo yannaa | 12 | Aascharyakarudaa (Yesanna) | 1.00 first line / 0.18 body |
| Entha goppa bobba puttenu | 15 | Christmas Mashup 5.0 | 1.00 first line / 0.11 body |
| Entha premincheno Devudu manapai | 16 | Naalo Unna Aanandamu | 0.92 first line / 0.13 body |
| Entho goppa nithyamaina poorna rakshana idhe | 17 | Naa Praanamaina Yesu | 0.94 first line / 0.16 body |
| Entho shrungaara mainadhi Yesuni charitha midhi | 29 | Yesu Naathaa Devaa | 1.00 first line / 0.13 body |
| Entho vintha entho chintha | 12 | Entho Vintha | 0.95 first line / 0.85 body |
| Evariki evaru ee lokamulo | 17 | Evariki Evaru | 1.00 first line / 0.11 body |
| Evarunna lekunna naakemunna lekunna | 11 | Evaru Unnaa Lekunnaa | 1.00 first line / 0.14 body |
| Gaanamu jeyudu sukeerthananu | 16 | Randi Yehovaanu Goorchi | 0.94 first line / 0.17 body |
| Gaganamu cheelchukoni Yesu ghanulanu theesikoni | 8 | Gaganamu Cheelchukoni | 0.97 first line / 0.10 body |
| Ghadiya nenu thattuchunnaanu | 19 | Entha Paapinainanu | 0.93 first line / 0.18 body |
| Ghana Yehovaa nee gudaaram buna | 12 | Yehova Naa Aashrayam | 0.93 first line / 0.13 body |
| Ghanadheva puthrudagu ghanamaina Yesubiddan | 12 | Naa Praanamaina Yesu | 1.00 first line / 0.09 body |
| Ghanatha mahima Prabhuke | 14 | Aaraadhana Adhika Sthothramu | 1.00 first line / 0.18 body |
| Ghanudaina Yehova gadde mundhata | 17 | Yehovaa Dayaaludu (Aayanake Kruthagnatha) | 0.93 first line / 0.15 body |
| Gunavanthuraalaina ghanamaina streeye goppadi | 18 | Gunavathi Aina Bhaarya | 0.94 first line / 0.11 body |
| Halelooya yani paadudee | 30 | Haallelooyaa Aaraadhana | 0.93 first line / 0.11 body |
| Hallelooya naa praanamaa Yehovaanu sthuthinchu | 25 | Naa Jeevithaanthamu | 1.00 first line / 0.15 body |
| Hallelooya nee kallelooya challagaa rammippu Desu | 9 | Parama Thandri Neeke Sthothram | 0.94 first line / 0.17 body |
| Hallelooya paadudi hallelooya paadudi | 24 | Praanamaa Naa Praanamaa | 1.00 first line / 0.16 body |
| Hallelooya sthuthi prashamsa paadeda | 10 | Yesayyaa Naa Doraa | 1.00 first line / 0.14 body |
| Hallelooyaa hallelooyaa nee raajyamochchugaaka | 10 | Aaraadhana Yesu Neeke | 1.00 first line / 0.17 body |
| Halleluya ani paaduchu | 11 | Haallelooyaa Aaraadhana | 0.93 first line / 0.12 body |
| Halleluyaa Yesayyaa | 9 | Hallelooya Paata | 1.00 first line / 0.24 body |
| Hrudaya marpinchedhamu prabhunaku sthuthi prashamsalatho | 16 | Idhi Devuni Nirnayamu | 0.94 first line / 0.16 body |
| Idhi aashcharyame | 16 | Naa Praanamaina Yesu | 0.94 first line / 0.21 body |
| Idhi Yehova kaliginchina dinamu | 10 | Aakaashambun Doothalu | 0.93 first line / 0.11 body |
| Idigo eeyana naa priyakumaarudu | 28 | Praanamaa Naa Praanamaa | 0.94 first line / 0.16 body |
| Idigo neethibhaaskarundu udayamaaye | 12 | Udayamaaye Hrudayamaa | 1.00 first line / 0.09 body |
| Idigo nenu thalupunoddha niluchundi | 20 | Entha Paapinainanu | 0.93 first line / 0.17 body |
| Idigo shubhadha rakshanamu | 15 | Aadhaaram Naaku Aadhaaram | 0.93 first line / 0.13 body |
| Idiye anukoola samayamu neeku | 17 | Ghanamaina Naa Yesayyaa | 1.00 first line / 0.16 body |
| Ilalo Yesunake jayamu | 11 | Naalo Unna Aanandamu | 0.92 first line / 0.13 body |
| Inthakaalam nee krupalo | 20 | Intha Kaalam | 1.00 first line / 0.16 body |
| Ishraayelunu kaapaadu Devudu | 29 | Ninnu Kaapaadu Devudu | 0.94 first line / 0.15 body |
| Itharula saakshyamu lentho galigiyunna | 12 | Nee Saakshyamu Edi | 0.92 first line / 0.11 body |
| Jaagraththapadudi; melakuvagaa nundi praarthana | 15 | Theliyadaa Neeku Theliyadaa | 1.00 first line / 0.11 body |
| Jagathiki punaadi veyaka munde janiyinchina prema | 23 | Janminche Janminche Yesayyaa | 0.93 first line / 0.20 body |
| Jai jai jai jai Yesu Prabhu maakai raanunna Prabhuvaa | 18 | Amma Kanna Minna | 0.94 first line / 0.18 body |
| Jayam jayam hallelooya | 8 | Jayam Jayam Manaku | 1.00 first line / 0.15 body |
| Jayamani paadu jayamani paadu prabhu Yesunake | 17 | Yesayyaa Naa Yesayyaa | 0.93 first line / 0.12 body |
| Jayaminkaa manadheraa | 26 | Yese Janmincheraa | 0.92 first line / 0.09 body |
| Jayaprabhu Yesune vembadinchuchu | 15 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.14 body |
| Jayasheeludavagu o maa Prabhuvaa | 18 | Vandanam | 0.94 first line / 0.12 body |
| Jeevambu nichchina Devudaa ne paadeda neeku nirantharamu hallelooya hallelooya | 13 | Yehovaa Nanu Karuninchumaa | 1.00 first line / 0.12 body |
| Jeevamunichchedha jeevaadhipathiki | 18 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.20 body |
| Jeevapudhaatha naa hrudhayamuloniki raa | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.20 body |
| Kaachithivi gathakaalam | 20 | Nee Dayalo Nee Krupalo | 1.00 first line / 0.23 body |
| Kalvariloni shreshtudaa | 18 | Raare Mana Yesu Swaamini | 0.95 first line / 0.08 body |
| Kalyaaname vaibhogam kamaneeya kaanthula deepam | 8 | Kalyaanam Kamaneeyam | 1.00 first line / 0.10 body |
| Kalyaname Vaibhogam | 12 | Kalyaanam Kamaneeyam | 1.00 first line / 0.10 body |
| Kanikara poornudaa naa Yesayyaa | 46 | Yesayyaa Kanikarapoornudaa | 1.00 first line / 0.15 body |
| Kanikarinchi nannu rakshinchu Mesayyaa | 13 | Entha Paapinainanu | 0.93 first line / 0.25 body |
| Karunasaagara veevekaavaa | 17 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.14 body |
| Karuninchumu naa Yesuvaa kanikaramandhaishvaryudaa | 14 | Yese Nee Madhilo Undagaa | 0.94 first line / 0.09 body |
| Kondala thattu ne gorkethoda | 17 | Kondala Thattu Naa Kannuletthi | 1.00 first line / 0.30 body |
| Kondalathattu kannuletthi choosaanu Yesayya | 20 | Kondala Thattu | 0.92 first line / 0.16 body |
| Koniyaadabadunu Yehovaayandu | 14 | Yehovaa Naa Balamaa | 1.00 first line / 0.15 body |
| Koniyaadi paadi keerthinchi varnincheda ninu naa Prabhuvaa | 18 | Davalavarnudaa | 0.96 first line / 0.15 body |
| Kreesthe sarvaadhikaari Kreesthe Alphaa Omega | 16 | Aanandamaanandame | 0.93 first line / 0.13 body |
| Kreesthesu shakthinaamamellaru keerthinchi | 14 | Nee Naamam Athi Madhuram | 0.94 first line / 0.11 body |
| Kreesthu chenthaku rammu priyudaa Yesu chenthaku rammu priyudaa | 19 | Yese Naa Maargamu | 0.92 first line / 0.16 body |
| Kreesthu mahimake maa praanam maa jeevam maa sarvam | 16 | Neeve Naa Praanam Sarvam | 0.94 first line / 0.14 body |
| Kreesthu nedu lechenu marthya dootha sanghamaa | 13 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.12 body |
| Kreesthu prabhuke sakala mahima | 14 | Paralokamu Naa Deshamu | 0.94 first line / 0.13 body |
| Kreesthu prabhuni prathyakshathalanu | 14 | Prabhu Mora Vinavaa | 0.93 first line / 0.12 body |
| Kreesthutho naa jeevitham adhi entho adbhutham | 12 | Naa Jeevithaanthamu | 0.92 first line / 0.10 body |
| Kroththa geethamuche naa yullamu upponga Yesuni keerthinthunu | 25 | Nammadagina Devudaa | 0.94 first line / 0.18 body |
| Krupaasathyamulu kalisikoninavi neethi samaadhaanamulu | 16 | Aaraadhana Anduko | 1.00 first line / 0.20 body |
| Krupaasimhaasanundaa - Alphaa Omegaa neevegaa - Krupaa daapunajeri nuthinchedha | 35 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Krupagala Devuni koniyaadedhamu krupachaalu neekane Prabhuyesu | 27 | Naa Devuni Krupavalana | 1.00 first line / 0.14 body |
| Krupakaalamu dhaatipovuchunnadhi krupapondhanu parugidi randu vevega | 23 | Ghanamaina Naa Yesayyaa | 1.00 first line / 0.12 body |
| Krupakaalamulo Prabhuyesuni angeekarinchumu o priyudaa | 19 | Ghanamaina Naa Yesayyaa | 1.00 first line / 0.17 body |
| Kumaari aalakinchu - Nee vaalochinchi | 19 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.15 body |
| Kummarinchumu Nee Aathmanu Naapai | 23 | Aaraadhinthu Ninnu Devaa | 0.94 first line / 0.19 body |
| Laali laali laalamma laali | 12 | Laali Laali Jolaali | 0.95 first line / 0.08 body |
| Lelemmu Seeyonu dhariyinchumu nee balamu | 17 | Praanamaa Naa Praanamaa | 0.94 first line / 0.17 body |
| Maa Deva maa Deva needu vishwaasyatha chaala goppadi | 31 | Naakunnadi Neevenani | 1.00 first line / 0.21 body |
| Maa Prabhuyesu neeve maa sarvamu mahin maakepudu neethone snehamu | 23 | Nee Naamam Athi Madhuram | 0.94 first line / 0.14 body |
| Maa Yesu Kreesthuni marugu galgenuraa | 20 | Nee Naamam Naa Gaanam | 0.92 first line / 0.12 body |
| Maakanugrahinchina daiva vaakyamulache maa manonethramulu veligimpumayyaa | 29 | Entha Paapinainanu | 0.93 first line / 0.16 body |
| Maargam sathyam jeevam Kreesthesani chaateddaam | 16 | Maargam Sathyam Jeevam | 1.00 first line / 0.11 body |
| Maaru manassu pondumu | 12 | Naalo Unna Aanandamu | 1.00 first line / 0.12 body |
| Maataadu naa prabhuvaa naatho maataadu | 6 | O Prabhuvaa O Prabhuvaa | 0.94 first line / 0.09 body |
| Maatlaadu naa Prabhuvaa naatho maataadu naa Prabhuvaa | 10 | O Prabhuvaa O Prabhuvaa | 0.94 first line / 0.10 body |
| Maaya lokamu - Mosapokumu | 13 | Yesanna Swaramannaa | 0.93 first line / 0.22 body |
| Madhura madhuramu Yesu naamam | 14 | Nee Naamam Naa Gaanam | 0.92 first line / 0.16 body |
| Madhuraathi madhuram Yesu nee naamam | 12 | Keerthinthunu Nee Naamamu | 0.94 first line / 0.19 body |
| Madhuram amaram nee prema Yesu | 11 | Naa Praanamaina Yesu | 0.94 first line / 0.18 body |
| Mahaa saamarthyaa o Yesu | 15 | Yesayyaa Naa Yesayyaa | 0.93 first line / 0.16 body |
| Mahaadhevudaa mahonnathudaa | 19 | Mahonnathudaa Maa Devaa | 1.00 first line / 0.29 body |
| Mahaaghanudu mahonnathudu parishuddhudu nithyanivaasi | 23 | Aparaadhini Yesayyaa | 0.93 first line / 0.19 body |
| Mahaaraajaa Yesu neeke mahima kalugu gaaka | 11 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.17 body |
| Mahima Mahima Mana | 12 | Nee Naamam Naa Gaanam | 0.92 first line / 0.22 body |
| Mahima sarvonnathamaina dhaivamunaki | 17 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.22 body |
| Mahimatho nindina maa raajaa mahimatho thirigi vachchuvaadaa | 23 | Aaraadhinchedanu Ninnu | 0.94 first line / 0.14 body |
| Mahimayuthudu maa Yesu raaju | 21 | Aathma Deepamunu | 1.00 first line / 0.10 body |
| Mahonnathuda maaranivaada | 15 | Mahonnathuda Nee Chaatuna | 0.95 first line / 0.24 body |
| Mahonnathudaa nee naamamane | 14 | Nee Naamam Naa Gaanam | 0.92 first line / 0.16 body |
| Mammun srujinchina Devundu praanamu | 16 | Yehovaa Naa Balamaa | 0.93 first line / 0.18 body |
| Mamun Srujinchina Devundu Praanamu | 30 | Yesayyaa Neeke Vandanam | 1.00 first line / 0.20 body |
| Mana jeevitha manthayu anukshanamu yudhdhame | 12 | Naa Yesayya Prema | 1.00 first line / 0.13 body |
| Mana prabhuvaina Yesunandu enno deevenalu | 13 | Praanamaa Naa Praanamaa | 1.00 first line / 0.18 body |
| Mana Prabhuyesu vachchedu vela mana santhosha hrudayaalu chaala velase | 24 | Evaru Unnaa Lekunnaa | 0.92 first line / 0.16 body |
| Manaku anugrahimpabadina parishuddhaathma dwaaraa | 5 | Devaa Naa Hrudayamutho | 0.94 first line / 0.26 body |
| Manaku balamaiyunna Devuniki aananda gaanamu cheyudi | 21 | Aaraadhana Anduko | 1.00 first line / 0.16 body |
| Manaku jeevamaiyunna rakshakudu Prabhuyese | 31 | Parama Jeevamu | 0.95 first line / 0.11 body |
| Manamee manumee manasa nee vanudhinamu | 18 | Nee Naamam Naa Gaanam | 1.00 first line / 0.13 body |
| Manamesuni vaaralamu | 24 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Manamu kanikarimpabadi samayochithamaina sahaayamu | 16 | Praanamaa Naa Praanamaa | 0.94 first line / 0.15 body |
| Manamu Yesu Prabhuni mahima kanugontimi | 19 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Manasaanandhamu bondhuta kannanu | 17 | Aanandamaanandame | 0.93 first line / 0.19 body |
| Manasunna manchidhevaa nee manasunu naakichchaavaa | 16 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Mandhalo cherani gorrelenno - Kotlakoladhigaa kalavu ila | 12 | Prabhu Mora Vinavaa | 0.93 first line / 0.16 body |
| Manninchumaa manninchumaa | 17 | Nee Vaakku Vinipinchumayyaa - Nethraalu Theripinchumayyaa | 0.94 first line / 0.25 body |
| Maranamu jayinchenu | 13 | Naa Praanamaina Yesu | 0.94 first line / 0.26 body |
| Maranamun jayinchi lechenu mana Prabhuvu | 24 | Praanamaa Naa Praanamaa | 0.94 first line / 0.12 body |
| Meere lokamunaku velugu | 32 | Paralokamandunna Maa Thandree | 0.96 first line / 0.18 body |
| Meeru konthasepu kanabadi anthalo | 15 | Konthasepu Kanabadi | 0.94 first line / 0.13 body |
| Melkonumaa melkonumaa naa praanamaa | 18 | Mukha Darshanam Chaalayyaa | 0.94 first line / 0.12 body |
| Melkonumaa melkonumaa Yese nudivenu | 14 | Raakada Prabhuni Raakada | 0.95 first line / 0.15 body |
| Melkonumu o kaavali Yesuni yodhudavu | 17 | Premagala Yesayyaa | 0.93 first line / 0.11 body |
| Melukonare mee manambula melimiga | 12 | Christmas Mashup 5.0 | 1.00 first line / 0.13 body |
| Mimmunu nimpe melulathoda aviye paraloka deevenalu | 31 | Nee Naamam Athi Madhuram | 0.94 first line / 0.18 body |
| Mithramaa naa mithramaa chiththamaa idhi nee chithramaa | 20 | Christmas Mashup 5.0 | 1.00 first line / 0.12 body |
| Mukthi dhilaaye Eeshu naam | 14 | Mukthi Dhilaaye Yeeshu Naam | 1.00 first line / 0.43 body |
| Mukthi ganare mee manambula | 14 | Nee Naamam Naa Gaanam | 0.92 first line / 0.14 body |
| Naa aadarana neevenayya | 12 | Aadhaaram Neevenayyaa (Medley) | 1.00 first line / 0.28 body |
| Naa aasha neetho undaalani naa | 21 | Gamyam Cheraalani | 0.94 first line / 0.15 body |
| Naa doshamulu naa thalameedhugaa | 22 | Padamulu Chaalani Prema | 0.95 first line / 0.17 body |
| Naa hrudayam paadene nee premane | 13 | Maaradayaa Nee Prema | 0.93 first line / 0.17 body |
| Naa Jayamu Korina Deva | 11 | Nammuko Yesayyanu | 0.93 first line / 0.16 body |
| Naa jeevithaaniki yajamaanudaa | 16 | Naa Jeevithaanthamu | 0.92 first line / 0.13 body |
| Naa Jeevitham Neekankitham | 6 | Ankitham Prabhu Naa Jeevitham | 1.00 first line / 0.17 body |
| Naa kintha prothsaahaa nandhambul galguta | 18 | Nee Naamam Naa Gaanam | 1.00 first line / 0.11 body |
| Naa koraku chanipoyi naadha | 18 | Naalo Unna Aanandamu | 0.92 first line / 0.13 body |
| Naa kosam | 21 | Em Chesaanayyaa Neekosam | 0.93 first line / 0.15 body |
| Naa maata vinumani prabhuvanenu ninu rakshimpanu piluchu chunde | 19 | Alankarinchunu | 0.95 first line / 0.13 body |
| Naa neethi sooryudaa bhuvinelu Yesayyaa | 23 | Neethi Sooryudaa Yesu | 0.93 first line / 0.15 body |
| Naa nimiththamaayana mahini shramalu pondenu | 18 | Nee Naamam Naa Gaanam | 0.92 first line / 0.16 body |
| Naa praana priyudaa naa Yesu prabhuvaa | 6 | Naa Praanapriyudaa Naa Yesu Raajaa | 0.96 first line / 0.18 body |
| Naa praana priyudavu neeve | 9 | Praanamaa Naa Praanamaa | 0.94 first line / 0.15 body |
| Naa praanamaa naa sarvamaa - Aayana parishuddha naamamunaku | 13 | Maruvaddu Maruvaddu | 0.94 first line / 0.24 body |
| Naa praanamaa Yehovaanu neevu sannuthinchumu | 24 | Na Pranama Yehovanu Neevu Sannuthinchu | 1.00 first line / 0.22 body |
| Naa praanamaa, Yehovaanu sannuthinchumu | 8 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.29 body |
| Naa praanamentho ninnu paadunu goppa Deva goppa Deva | 21 | Yehovaa Naa Balamaa | 0.93 first line / 0.11 body |
| Naa premaraaju kaapari - Nannentho preminchunu | 13 | Yehovaa Maa Kaapari | 1.00 first line / 0.10 body |
| Naa priya Yesunipai aanukoni | 14 | Yese Naa Maargamu | 0.92 first line / 0.21 body |
| Naa priyudaa - Paapavimochakudaa - Prabhuyesu | 19 | Christmas Mashup 5.0 | 1.00 first line / 0.12 body |
| Naa priyudaa Yesayyaa | 10 | Naa Yesayya Prema | 0.92 first line / 0.17 body |
| Naa sarvamaina Prabhoo arpinchukondu neekai angeekarinchu nede nee seva cheyutakai | 14 | Idhi Devuni Nirnayamu | 0.94 first line / 0.22 body |
| Naa shramalo nenu Yehovaaku | 12 | Alankarinchunu | 0.95 first line / 0.16 body |
| Naa Sthiraadhaarudaina Yesayya | 95 | Yesu Sarvonnathudaa | 0.94 first line / 0.16 body |
| Naa thalampanthaa neeve Yesayyaa | 8 | Maatlaaade Yesayyaa | 0.92 first line / 0.13 body |
| Naa yaathma lemmu siddhamu kammu | 12 | Naa Thalli Nanu Marachinaa | 0.94 first line / 0.15 body |
| Naa Yesayya nee krupaye chaalayya | 12 | Naa Geethaaraadhanalo | 0.94 first line / 0.14 body |
| Naa Yesu naadhaa nanu joodave | 15 | Aanandamaanandame | 0.93 first line / 0.17 body |
| Naa Yesuni sannidhilone naa jeevitham | 11 | Naa Jeevithaanthamu | 0.92 first line / 0.15 body |
| Naadu hrudayapu dwaaramu therachedhanu Yesu paapapu rogiki neeve gathi | 12 | Devaa Mahonnathudaa | 0.93 first line / 0.13 body |
| Naadu praanamaa naadu praanamaa devuni kriyalmaruvakumaa | 25 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.13 body |
| Naadu praanamu Prabho nenu nee karpinthunu | 14 | Shaashwathamaa Ee Deham | 0.93 first line / 0.12 body |
| Naaloni aashaa jyothi neeve naa | 5 | Maa Sarvaanidhi Neevayyaa | 0.94 first line / 0.18 body |
| Namaskarimpa randi Daaveedu puthruni | 18 | Nee Naamam Naa Gaanam | 1.00 first line / 0.11 body |
| Nammi Nammi | 8 | Naa Thanuvu Naa Manasu | 0.94 first line / 0.16 body |
| Nammirammu nammirammu immuga brathukumu | 18 | Naalo Unna Aanandamu | 1.00 first line / 0.14 body |
| Nammithi nayyaa Yesayyaa nee paadamule | 11 | Yesayyaa Naa Yesayyaa | 1.00 first line / 0.16 body |
| Nannu kaapaadu naa Devudu kunukadu kunukadu | 12 | Ninnu Kaapaaduvaadu Kunukadu | 0.95 first line / 0.17 body |
| Nashinchipovu suvarnamu agnipareekshavalana shudhdhaparachabaduchunnadhi | 13 | Premagala Maa Prabhuvaa | 0.94 first line / 0.14 body |
| Ne bhraminchi nilchithi prema pravaahamu therichoochi | 12 | Yesu Raktham Maapai Unnadi | 1.00 first line / 0.16 body |
| Ne paadeda nithyamu paadeda | 14 | Idhe Naa Hrudaya Vaanchana | 0.95 first line / 0.17 body |
| Nedu meeru korukonudi | 3 | Premincheda Yesu Raajaa | 0.94 first line / 0.24 body |
| Nedu ne naarakshakuni naamadhilo cherchukonnaanu | 14 | Aathma Deepamunu | 1.00 first line / 0.20 body |
| Nee aaraadhana hrudaya aalaapana aathmatho | 9 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.22 body |
| Nee krupaye chaalunayyaa | 12 | Nee Krupa Chaalunu | 0.92 first line / 0.25 body |
| Nee mandhirame | 11 | Aadhaaram Naaku Aadhaaram | 0.93 first line / 0.23 body |
| Nee mandhiramunandhu nivasinchuvaaru dhanyulu | 23 | Nithyamu Sthuthinchinaa | 1.00 first line / 0.14 body |
| Nee mukhamu manoharamu nee swaramu | 9 | Nee Naamam Athi Madhuram | 0.94 first line / 0.15 body |
| Nee naamame naa gaanamu | 24 | Nee Naamam Naa Gaanam | 1.00 first line / 0.15 body |
| Nee naamamune koniyaadedanu | 10 | Nee Naamam Naa Gaanam | 0.92 first line / 0.16 body |
| Nee prema naaku kaavaalayyaa | 40 | Jeevamaa Yesayyaa | 1.00 first line / 0.16 body |
| Nee raaju neethiparudunu rakshanagalavaadunu | 19 | Nee Naamam Naa Gaanam | 1.00 first line / 0.11 body |
| Nee rekkala chaatuna sharanondhedhan | 26 | Naa Sarvam Naa Kota | 0.92 first line / 0.17 body |
| Nee sannidhi cherithimi Prabhuvaa praarthana vinumaa | 11 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Nee sannidhilo aanandame nee sevalone santhoshame | 17 | Nee Sannidhilo Santhoshamu | 0.95 first line / 0.21 body |
| Nee siluvalone naa mukthee | 9 | Nee Challani Needalo | 0.93 first line / 0.16 body |
| Neeku asaadhyamainadi lene ledu | 16 | Asaadhyamainadi Lene Ledu | 1.00 first line / 0.18 body |
| Neethi sooryudu neepai nudhayinchunu athani rekkalu naarogyamu nichchunu | 23 | Neethi Sooryudaa Yesu | 0.93 first line / 0.14 body |
| Neethi sooryundu udhayinchu nippudu athani kiranamulu aarogyamichchunu | 32 | Neethi Sooryudaa Yesu | 0.93 first line / 0.16 body |
| Neethigala Yohovaa sthuthi mee | 14 | Neethigala Yehovaa Sthuthi | 0.97 first line / 0.85 body |
| Neethone naa jeevitham prathi dinamu anukshanamu | 12 | Dhanyamu Entho Dhanyamu | 0.93 first line / 0.15 body |
| Neeve naa aakarshana neeve naa | 10 | Aadhaaram Neevenayyaa (Medley) | 0.92 first line / 0.14 body |
| Neeve naa priyudavu Yesu Prabhu | 12 | Aadhaaram Neevenayyaa | 1.00 first line / 0.12 body |
| Neeve Naaku Thandrivani Neeve Naa Devudani | 12 | Naakunnadi Neevenani | 0.94 first line / 0.19 body |
| Neevu Ishraayelu cheyu sthothramula meeda aaseenudavai yunnaavu | 17 | Sthuthula Meeda Aaseenudaa | 0.94 first line / 0.15 body |
| Neevu leni kshanamu | 85 | Neevu Leni Kshanamainaa | 0.95 first line / 0.12 body |
| Nenellappudu Yehovaanu sannuthinchedanu nithyamu | 9 | Yehovaanu Sannuthinchedan | 1.00 first line / 0.14 body |
| Nenu elugetthi Devuniki morrapettudhunu | 24 | Nenu Kooda Unnaanayyaa | 1.00 first line / 0.16 body |
| Nenu nee aagnalayandhu nammika | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.21 body |
| Nenu nee dharmashaasthramundhu aashcharyamaina | 4 | Priya Sanghasthulaaraa | 0.94 first line / 0.26 body |
| Nenu nee vaadanu Deva | 13 | Naa Devaa Neeke Vandanam | 1.00 first line / 0.19 body |
| Nerchukonare Yesuvaaduka | 16 | Maruvaddu Maruvaddu | 0.94 first line / 0.15 body |
| Nijamugaa parishudhdhu doka dee nelapai ledu | 14 | Parishuddhudaa Paavanudaa | 1.00 first line / 0.13 body |
| Ninne namminaanu Yesayya | 27 | Brathikiyunnaanante Nee Krupa | 1.00 first line / 0.15 body |
| Nishchayamugaa naa prabhuvaina Yesukreesthunu | 24 | Raare Mana Yesu Swaamini | 0.95 first line / 0.13 body |
| Noothana aakaashamunu bhoomi nenu choochithi | 42 | Entha Paapinainanu | 0.93 first line / 0.17 body |
| Noothanamaina krupa nava noothanamaina krupa | 29 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Nyaayapeethamu nee mundu vunnadhi | 23 | Christmas Mashup 5.0 | 1.00 first line / 0.13 body |
| O Deva naa yaathralona | 8 | Aadhaaram Neevenayyaa | 0.92 first line / 0.21 body |
| O jagadhrakshakaa vishvavidhaatha rakshana nosagithivi | 16 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.19 body |
| O maa thandri needu naamamu | 12 | Naa Thandri | 0.95 first line / 0.17 body |
| O naa hrudayamaa paadumaa kroththa geetham prabhunake | 19 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 0.95 first line / 0.11 body |
| O Neethi Sooryudaa | 11 | Neethi Sooryudaa Yesu | 0.93 first line / 0.11 body |
| O Prabhuvaa idhi nee krupaye - Goppa krayamu dwaaraa kalige | 17 | Naa Devuni Krupavalana | 0.95 first line / 0.17 body |
| O Prabhuvaa nee sevan cheseda nithyamu | 17 | Yehovaa Maa Kaapari | 1.00 first line / 0.19 body |
| O premagala Yesu preminchinaavu mammu | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.18 body |
| O priya naavika naa jeevitham | 10 | O Naavikaa | 0.93 first line / 0.14 body |
| O Yehovaa neeve nannu shodhinchi erigithivi | 12 | Yehovaa Naa Balamaa | 0.93 first line / 0.16 body |
| O Yesu bhakthulaaraa mee raaju dhvajamu | 13 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.13 body |
| Oka divyamaina sangathitho naa | 10 | Oka Divyamaina Sangathitho | 1.00 first line / 0.16 body |
| Oka kshanamaina ninu veedinaa | 12 | Oka Kshanamainaa Ninnu | 1.00 first line / 0.14 body |
| Oohala kandani lokamulo | 8 | Aakaasham Nee Simhaasanam | 0.94 first line / 0.15 body |
| Opaapee sandhinchithivaa nee paapa vimochakuni | 17 | Noraaragaa Chethunu | 0.93 first line / 0.16 body |
| Opaapi jeevapu yootakuraa paapabhaaramu thodaraa | 17 | Premagala Yesayyaa | 1.00 first line / 0.18 body |
| Paadedam Halleluyah | 12 | Haallelooyaa Aaraadhana | 0.93 first line / 0.19 body |
| Paadedamu nee sthuthulanu mahaa prabhuvaa | 18 | Premagala Yesayyaa | 0.93 first line / 0.12 body |
| Paapabhaaramu dhushtaguna samethundanai dhuhkhanashta dhaurjanyamutho nunda | 21 | Praanamaa Naa Praanamaa | 1.00 first line / 0.13 body |
| Paapini Krupa Joopavayyaa | 18 | Aparaadhini Yesayyaa | 0.93 first line / 0.08 body |
| Paapula rakshakudu Yesu goppa dhevaadhi Devudu Yesu | 31 | Naalo Unna Aanandamu | 1.00 first line / 0.10 body |
| Paapulakoraku Prabhu Yesu siluvalo baliyaayenu | 20 | Naa Devuni Krupavalana | 0.95 first line / 0.16 body |
| Paavanudaa maa prabhuvaa nee rakshanakai sthothramulu | 15 | Sthuthi Simhaasanaaseenudaa (Yesu Raajaa) | 1.00 first line / 0.17 body |
| Painamai yunnaa nayyaa | 28 | Nee Paada Sannidhiki | 1.00 first line / 0.12 body |
| Pallavarapu kondalapaina prabhudhaasulu | 36 | Aaraadhinchedanu Ninnu | 1.00 first line / 0.19 body |
| Paralokamuna nundu Deva | 12 | Paralokamu Naa Deshamu | 0.94 first line / 0.14 body |
| Parama nandundedu maa parama janaka | 7 | Praanamaa Naa Praanamaa | 1.00 first line / 0.23 body |
| Parama paavanudu Mariya thanayudu | 8 | Yavvanudaa | 0.94 first line / 0.16 body |
| Parama pavithra svargapitha | 18 | Nammadagina Devudaa | 0.94 first line / 0.15 body |
| Parama Prabho Yesurakshakaa | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Parama rakshaka Yesu prabhuvaa | 18 | Yesu Prabhuvaa Neeve | 1.00 first line / 0.12 body |
| Parama thandri suthudu praanamichchene paapi korakai | 12 | Christmas Mashup 5.0 | 1.00 first line / 0.11 body |
| Paramaasheervaadhamu kori - Paraloka pithaa arudhenchithimi | 10 | Yehova Naa Aashrayam | 1.00 first line / 0.15 body |
| Paramathandri karamuletthi sthuthula narpinthumu | 25 | Yehovaa Naa Balamaa | 1.00 first line / 0.14 body |
| Paramu dhigenu mahima nindenaalo siluva yodda swasthatha kaligenu | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.13 body |
| Paramulona paramulona paapa memi ledugaa | 12 | Aaraadhana Aaraadhana (Chellinchedamu) | 0.92 first line / 0.11 body |
| Paripoornambagu guruvu evaru? Prematho nindina hrudayunde | 11 | Kalyaanam Kamaneeyam | 0.94 first line / 0.10 body |
| Parishuddha janamutho | 11 | Keerthi Hallelooyaa | 0.92 first line / 0.09 body |
| Parishuddha mandiramu naaku nirmincha mantiri Prabhuvaa | 21 | Vikasinchu Pushpamaa | 0.94 first line / 0.16 body |
| Parishuddha pattanamu Devuni mahimagaladhai | 21 | Maaripovaali Ee Lokamanthaa | 0.95 first line / 0.15 body |
| Parishuddha pattanamu kroththa Yerooshalemu | 26 | Idhi Devuni Nirnayamu | 0.94 first line / 0.16 body |
| Parishuddhaathma Prabhuni | 17 | Praardhana Praardhana | 0.94 first line / 0.14 body |
| Parishuddhaathmuda Deva | 18 | Parishuddhudaa Paavanudaa | 0.94 first line / 0.15 body |
| Parishudhdhaathmuda Prabhuva | 21 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.12 body |
| Parishudhdhulellaru Yesun pogadi paadi yaarbhatinchi paramunanunda | 15 | Gorrepilla Rakthamulo | 1.00 first line / 0.11 body |
| Parugidiraa sodharudaa - Prabhu sannidhi neevu jerutakai | 30 | Sampoornudaa Naa Yesayyaa | 0.94 first line / 0.13 body |
| Pelli kuthuru - Andamayina manasuku nenoka chakkani roopam | 16 | Nee Naamam Naa Gaanam | 0.92 first line / 0.13 body |
| Perupetti Pilichinaadu | 21 | Manchi Snehithudu | 0.93 first line / 0.12 body |
| Pilla naina nannu joodumee priya maina Yesu | 15 | Nee Naamam Naa Gaanam | 0.92 first line / 0.15 body |
| Poorna hrudaya sthothramul chellinchedha Prabhunake | 17 | Naa Hrudayamulo Nee Maatale | 0.95 first line / 0.15 body |
| Praanapriyudaa praanapriyudaa rammu maa Yesu paadedamu | 19 | Nammakamaina Naa Prabhu | 0.94 first line / 0.14 body |
| Prabhaava shakthulu kalgina raajunuthimpu | 16 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.19 body |
| Prabho needu mahimanu paadi ninu sthuthinchuchunnaamu | 6 | Yesayyaa Naa Praana Naathaa | 0.94 first line / 0.23 body |
| Prabhoo nee vaadanu neevu naa Prabhudavani nee korakai jeevinthunu | 24 | Ammaa Ani Ninnu Piluvanaa | 0.94 first line / 0.17 body |
| Prabhu dhayacheyu - Nithya deevenalu Beraakaalo choothuru | 24 | Yehovaaye Naa Balamu | 1.00 first line / 0.10 body |
| Prabhu Kreesthu Yesu preminche sanghamunu | 14 | Nee Naamam Naa Gaanam | 0.92 first line / 0.13 body |
| Prabhu kummarinchu dheevenala varshamu kummarinchumu | 14 | Premagala Yesayyaa | 1.00 first line / 0.13 body |
| Prabhu Naamam | 17 | Christmas Mashup 5.0 | 1.00 first line / 0.22 body |
| Prabhu naamam naa aashrayame aayananu | 10 | Christmas Mashup 5.0 | 1.00 first line / 0.21 body |
| Prabhu prajalaaraa rayamuna randi | 36 | Vaadipoka Munde | 1.00 first line / 0.11 body |
| Prabhu seva kidhiye samayambu | 20 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.10 body |
| Prabhu Yesu naakai sarvamu nichchithivi premanubatti arpinchu kontivi naakai | 18 | Naa Jeevithaanthamu | 1.00 first line / 0.15 body |
| Prabhu Yesukreesthuni dharshaname nedu prajalandhari kathyavasaramu | 33 | Sthuthi Simhaasanaaseenudaa (Yesu Raajaa) | 1.00 first line / 0.14 body |
| Prabhuni seva jeyarammu O yauvanudaa | 25 | Sthuthi Gaaname Paadanaa | 0.94 first line / 0.14 body |
| Prabhuvaa chesithivi vaagdhaanamulu maatho | 25 | Bhayapadakumaa | 0.94 first line / 0.15 body |
| Prabhuvaa dhrushtinchumu naaku ibbandi kaligenu | 19 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.20 body |
| Prabhuvaa mammunudheevinchi pampumu | 10 | Prabhuvaa Ee Aanandam | 1.00 first line / 0.15 body |
| Prabhuvaa nannu karuninchumu ne ghora paapini | 15 | Entha Paapinainanu | 0.93 first line / 0.15 body |
| Prabhuvaa nee goppathanamu sthuthiki yogyamu | 21 | Aaraadhana Adhika Sthothramu | 1.00 first line / 0.17 body |
| Prabhuvaa nee kaaryamunu noothana parachumu maalo | 19 | Yehova Naa Aashrayam | 1.00 first line / 0.20 body |
| Prabhuvaa needu ghananaamamun memu | 17 | Nee Naamam Naa Gaanam | 0.92 first line / 0.14 body |
| Prabhuvaa ninnaaraadhimpanu jerithimi | 16 | Maaradayaa Nee Prema | 0.93 first line / 0.11 body |
| Prabhuvaa paadeda noka sthuthi geetham preminchi rakshinchithivi | 19 | Saadhyamu Anni Saadhyamu | 0.94 first line / 0.12 body |
| Prabhuvaa pampu varshamunu | 24 | Ee Tharam Yuvatharam | 0.93 first line / 0.18 body |
| Prabhuvaa pampumaa nee shubhavarshamu | 8 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.08 body |
| Prabhuvaa! neeve ayithe neella | 12 | Prabhuvaa Ee Aanandam | 1.00 first line / 0.12 body |
| Prabhuvaa, neeve mahima ghanatha | 18 | Prabhuvaa Ee Aanandam | 1.00 first line / 0.15 body |
| Prabhuvaina Kreesthulo thandri | 18 | Aathma Deepamunu | 1.00 first line / 0.16 body |
| Prabhuvaina Kreesthuni dinamandu meeru abhayulai niraparaadhulai yundhuru | 21 | Yehovaa Dayaaludu (Aayanake Kruthagnatha) | 1.00 first line / 0.13 body |
| Prabhuvu dhigivachchunu paramunundi vegame vibhudu thirigivachchunu parama vadhuvukai | 19 | Aathma Deepamunu | 1.00 first line / 0.13 body |
| Prabhuvugan prathishtimpare gruhamuna | 12 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.10 body |
| Prabhuvuku thaginattu pruthivilo priyudaa padilamugaa jeevinchavaa | 31 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.08 body |
| Pranuthinthumu maa Yehova paripoorna mahima prabhaavaa | 16 | Yehovaa Maa Kaapari | 0.93 first line / 0.22 body |
| Pravimaludaa paavanudaa - Sthuthisthothramu neeke | 18 | Devaa Naa Hrudayamutho | 0.94 first line / 0.20 body |
| Prema nammakamugala paraloka thandri | 14 | Devudu Lokamunu | 1.00 first line / 0.16 body |
| Prema shaashwatha kaalamundunu - 1 Korinthee 13:8 | 25 | Prema Shaashwatha Kaalamundunu | 1.00 first line / 0.27 body |
| Premagala thandri krupagala prabhuva sthuthimahimalu neeke | 8 | Premagala Maa Prabhuvaa | 1.00 first line / 0.17 body |
| Premamayaa Yesu Prabhuvaa | 14 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.13 body |
| Premasaagaraa ee dharamarana edaarilona | 13 | Aaraadhana Aaraadhana (Chellinchedamu) | 1.00 first line / 0.12 body |
| Priya Yesuni sainya veerulamu sainya veerulamu | 33 | Yesanna Swaramannaa | 0.93 first line / 0.10 body |
| Priyayesu priyayesu athi priyudesu | 16 | Davalavarnudaa | 0.96 first line / 0.09 body |
| Priyudaa prabhu Yesunaku nee veenula nimmu | 19 | Ninnu Thalachi | 1.00 first line / 0.17 body |
| Putte Yesudu nedu manaku | 8 | Yese Naa Maargamu | 1.00 first line / 0.69 body |
| Raajaadhi raajupai kireetamunchudi | 17 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.08 body |
| Raajaathi raaja ravikoti theja | 14 | Raajaadhi Raaja | 0.95 first line / 0.16 body |
| Raajula Raajuvayyaa Neeve | 14 | Raajula Raajula Raaju | 0.94 first line / 0.12 body |
| Raajulaku Raajanta | 15 | Vaagdhaanamu | 1.00 first line / 0.13 body |
| Raajulaku raajunu prabhuvulaku prabhuvunu | 29 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.12 body |
| Raajulaku raajuvu prabhuvulaku prabhudavu | 16 | Raajula Raajula Raaju | 0.94 first line / 0.19 body |
| Raajularaaju prabhuvula Prabhoo ee jagathiki arudhenche Prabhoo | 11 | Prabhuvaa Prabhuvaa | 1.00 first line / 0.14 body |
| Raakada samayamulo | 8 | Raakada Samayamlo | 0.97 first line / 0.81 body |
| Raaraajagu Yesuni naamam | 8 | Nee Naamam Naa Gaanam | 1.00 first line / 0.14 body |
| Raathrimbavallu paadedanu Yesu naamam Kreesthu naamam | 20 | Nee Naamam Naa Gaanam | 1.00 first line / 0.14 body |
| Rakshana nosagedu Yesuni premanu lakshyamu cheyumu o priyudaa | 29 | Premagala Yesayyaa | 0.93 first line / 0.13 body |
| Rakshana nosagumu Prabhuvaa paapiki | 7 | Entha Paapinainanu | 0.93 first line / 0.12 body |
| Rakshanya paatalu paadi rakshakudesunu sadaa koniyaadu | 34 | Aaraadhinchedanu Ninnu | 1.00 first line / 0.14 body |
| Rammanuchunnaa Desu raaju randi sarva janulaaraa | 10 | Yesanna Swaramannaa | 0.93 first line / 0.20 body |
| Rammu parishuddhaathma devudaa | 24 | Aanandamaanandame | 1.00 first line / 0.13 body |
| Randi maanavulaaraa rakshakuni nammandi | 15 | Naalo Unna Aanandamu | 0.92 first line / 0.14 body |
| Randi randi rayamuna Yesuni - Rakshakuniga nangeekarinchudi | 22 | Devudu Lokamunu | 1.00 first line / 0.17 body |
| Randi Yehovaanugoorchi santhosha gaanamu cheyudamu | 15 | Yese Naa Maargamu | 1.00 first line / 0.29 body |
| Redu Messeeya janminchenu | 24 | Janminche Janminche Yesayyaa | 0.93 first line / 0.22 body |
| Reference: ... neevu naaku thodai | 10 | Aadhaaram Naaku Aadhaaram | 0.93 first line / 0.11 body |
| Reference: Aa ayidhu rottelanu rendu | 8 | Neeli Aakaashamlo | 1.00 first line / 0.12 body |
| Reference: aayana dhanavanthudai yundiyu meeru | 13 | Aaraadhana Aaraadhana (Chellinchedamu) | 1.00 first line / 0.16 body |
| Reference: Abraamaa, bhayapadakumu; nenu neeku | 29 | Christmas Mashup 5.0 | 1.00 first line / 0.22 body |
| Reference: Atuvale meeru bahumaanamu pondunatlugaa | 9 | Nee Naamam Naa Gaanam | 1.00 first line / 0.15 body |
| Reference: Devudu karunaasampannudai yundi, manamu | 13 | Praanamaa Naa Praanamaa | 1.00 first line / 0.84 body |
| Reference: Devuniyandu bhayabhakthulu galavaaralaaraa, meerandharu | 18 | Aakaashamaa Aalakinchumaa | 0.94 first line / 0.15 body |
| Reference: Jeevaahaaramu Nene; Naayodhdhaku Vachchuvaadu | 14 | Ninne Ne Nammukunnaanu | 1.00 first line / 0.17 body |
| Reference: kaabatti neevu lechi, neevunu | 10 | Sundarudaa Athishayudaa | 0.94 first line / 0.10 body |
| Reference: kroththa aakaashamula koraku kroththa | 13 | Aakaashamaa Aalakinchumaa | 0.94 first line / 0.21 body |
| Reference: mana Prabhuvaina Yesukreesthu moolamugaa | 30 | Raare Mana Yesu Swaamini | 0.95 first line / 0.18 body |
| Reference: Mari evanivalananu rakshana kalugadu; | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Reference: Meeyandhu naa santhoshamu undavalenaniyu, | 18 | Santhoshame Samaadhaaname | 0.95 first line / 0.22 body |
| Reference: Naa praanamunaku aayana sedhadheerchuchunnaadu. | 20 | Christmas Mashup 5.0 | 1.00 first line / 0.37 body |
| Reference: naaku morrapettumu nenu neeku | 25 | Naakunnadi Neevenani | 0.94 first line / 0.21 body |
| Reference: naashanakaramaina guntalo nundiyu jigatagala | 9 | Naalo Unna Aanandamu | 0.92 first line / 0.16 body |
| Reference: Nee dhevudaina Yehova neeku | 22 | Aavedana Nenondanu | 0.94 first line / 0.15 body |
| Reference: Neevu balamu pondi dhairyamu | 19 | Neeveyani Nammika | 0.93 first line / 0.15 body |
| Reference: Noothanamaina yerooshalemanu parishuddha pattanamu | 15 | Praanamaa Naa Praanamaa | 1.00 first line / 0.12 body |
| Reference: Parvathamulu tholagipoyinanu mettalu thaththarillinanu | 20 | Naa Thalli Nanu Marachinaa | 1.00 first line / 0.18 body |
| Reference: vaaru gorrepilla rakthamunu battiyu, | 7 | Neetho Nenu Naduvaalani | 1.00 first line / 0.17 body |
| Reference: Vaaru vadhimpabadina gorrepilla, shakthiyu | 11 | Maruvaddu Maruvaddu | 0.94 first line / 0.14 body |
| Reference: Veeru aposthalula bodhayandunu, sahavaasamandunu, | 14 | Naalo Unna Aanandamu | 1.00 first line / 0.11 body |
| Reference: Yehova chesina kaaryamulanu, poorvamu | 22 | Yehovaa Maa Kaapari | 1.00 first line / 0.12 body |
| Reference: Yehova Ishraayeleeyula Deva, hrudhayapoorvakamugaa | 23 | Hrudayapoorvaka Aaraadhana | 1.00 first line / 0.16 body |
| Reference: Yehovaa, samvathsaramulu jaruguchundagaa nee | 17 | Yehova Naa Aashrayam | 1.00 first line / 0.14 body |
| Reyimpagalu nee padhaseve Yesu prabhuvaa | 16 | Nee Pada Sevaye Chaalu | 0.94 first line / 0.11 body |
| Reyipagalu nee padhaseve jeevadhaayakame cheyuta melu | 12 | Nee Pada Sevaye Chaalu | 1.00 first line / 0.12 body |
| Saati lenidi Yesuni rakthamu paapamunu kadugunu | 25 | Keerthinthunu Nee Naamamu | 0.94 first line / 0.12 body |
| Sainyamulaku Adhipathiyagu Deva | 17 | Nenu Kooda Unnaanayyaa | 0.93 first line / 0.18 body |
| Sajeevula dheshamuna nenu Yehova | 16 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Sakalendriyamulaaraa chaala | 35 | Nee Challani Needalo | 0.93 first line / 0.11 body |
| Samaadhaanamu devuni samaadhaanamu | 22 | Nee Naamam Naa Gaanam | 0.92 first line / 0.23 body |
| Samaanulevaru prabho - Aandhra kraisthava keerthanalu | 9 | Samaanulavru Prabho | 1.00 first line / 0.14 body |
| Samarthudavaina Deva | 27 | Naaku Chaalina Devuda Neevu | 0.95 first line / 0.16 body |
| Samastha dheshamulaaraa andaru paadudi | 16 | Yehovaa Dayaaludu (Aayanake Kruthagnatha) | 1.00 first line / 0.19 body |
| Samastha pravarthanayandhu parishuddhulai yundudi - 1 Pethuru 1:16 | 31 | Yesanna Swaramannaa | 0.93 first line / 0.13 body |
| Sampoorna jeevamu sampaththi naaku gaan | 30 | Sthothrinchedamu Daiva Kumaaruni | 0.93 first line / 0.10 body |
| Samruddhi jeevamu sampaththi naakugaa | 30 | Sthothrinchedamu Daiva Kumaaruni | 0.92 first line / 0.15 body |
| Samsthuthinthumu ninne | 17 | Nenu Kooda Unnaanayyaa | 0.93 first line / 0.12 body |
| Sandhiyamu veedave naa manasaa | 18 | Brathikiyunnaanante Nee Krupa | 0.93 first line / 0.13 body |
| Sangha shirasai velayu Prabhuvaa | 12 | Prabhuvaa Prabhuvaa | 0.93 first line / 0.14 body |
| Sanghamokkate saarvathrika sanghamanedi sangha mokkate | 32 | Nannu Neevale Nirminchinanu | 0.95 first line / 0.14 body |
| Sannuthinchedanu ellappudu nithyamu aayana keerthi naanotanundu | 15 | Yehovaanu Sannuthinchedan | 1.00 first line / 0.20 body |
| Santhosha sambarame | 13 | Janminche Janminche Yesayyaa | 0.93 first line / 0.17 body |
| Santhoshame santhoshame santhoshamutho sthuthinchedan | 20 | Nee Naamam Naa Gaanam | 1.00 first line / 0.18 body |
| Sarva krupaanidhiyagu Prabhuvaa sakala charaachara | 10 | Sarva Krupaanidhiyagu Prabhuvaa | 1.00 first line / 0.73 body |
| Sarvajanulaaraa chappatlu kotti paadudi | 21 | Raajula Raajula Raaju | 0.94 first line / 0.13 body |
| Sarvajanulaaraa Devuni koniyaadudi | 5 | Naa Sarvam Naa Kota | 0.92 first line / 0.16 body |
| Sarvalokanivaasulaaraa, Dhevunigoorchi santhosha geethamu | 16 | Santhosha Geethamu Paadedanu | 0.95 first line / 0.21 body |
| Sarvonnathudaa sarvaadhikaari | 12 | Aakaasham Nee Simhaasanam | 1.00 first line / 0.16 body |
| Seeyonu puramaa sarvonnathuni shrungaarapuramaa Seeyonupuramaa | 34 | Seeyonu Paatalu Santhoshamugaa | 0.96 first line / 0.14 body |
| Seeyonu vaasulaaraa | 23 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Seeyonuku thirigi Prabhuvu vaarini rappinchinapudu | 15 | Yehovaa Naa Balamaa | 1.00 first line / 0.19 body |
| Seeyonuraaju vachchunu madhin sidhdhapadu | 15 | Yesu Raajugaa Vachchuchunnaadu | 0.95 first line / 0.11 body |
| Shaanthidhaayaka Yesu prabhoo | 19 | Davalavarnudaa | 0.96 first line / 0.14 body |
| Shaashvathamainadhee neetho naakunna anubandhamu | 12 | Naalo Unna Aanandamu | 0.92 first line / 0.20 body |
| Shaashwathamainadi ennadu maaranidi | 17 | Shaashwathamaa Ee Deham | 0.93 first line / 0.18 body |
| Shaashwathamainadi Yesuni prema - Unnathamainadi naa Yesu pilupu | 11 | Shaashwathamaa Ee Deham | 0.93 first line / 0.19 body |
| Shakthi chethanainanu balamu chethanainanu | 28 | Shakthi Chetha Kaadu | 1.00 first line / 0.27 body |
| Sharanu Naa Yesu Prabhuvaa | 8 | Yesu Prabhuvaa Neeve | 1.00 first line / 0.17 body |
| Shree Yehova nee kosangedha | 10 | Yehova Naa Aashrayam | 0.93 first line / 0.12 body |
| Shree Yesu divya naamasmarana | 26 | Yesanna Swaramannaa | 0.93 first line / 0.14 body |
| Shree Yesu swaami thirigi mokshambu jeragaa | 9 | Yesayyaa Naa Praana Naathaa | 0.94 first line / 0.13 body |
| Shree Yesune bhajinchu naa manasaa | 12 | Nee Naamam Naa Gaanam | 0.92 first line / 0.12 body |
| Shreemanthudaa shreekarunda shree Yesu raajaa | 25 | O Naadhu Yesu Raajaa | 0.92 first line / 0.18 body |
| Shreshtageethamu vinabaduchunnadhi Yesu lechenu | 17 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Shrungaara dhvaarambu maa Yesu | 9 | Aaraadhana Yesu Neeke | 0.93 first line / 0.13 body |
| Shubhavaartha vintimi Yesu rakshinchunu | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.10 body |
| Siluva chenthakuraa siluva chenthakuraa | 21 | Siluva Chenthaku Raa | 1.00 first line / 0.87 body |
| Siluva veerulu meere cheluvuga chanudi | 12 | Yesanna Swaramannaa | 1.00 first line / 0.14 body |
| Siluvanu mosi eelokamunu thalakrindhulu cheyu tharunamidhe | 24 | Painunna Aakaashamandunaa | 0.94 first line / 0.15 body |
| Siluvekadhaa chinthasadhaamahaa siluvekadhaa | 19 | Nee Naamam Naa Gaanam | 0.92 first line / 0.12 body |
| Silvalo silvalo gaanchi ne choodagan | 12 | Suvaarthanu Prakatimpavaa | 1.00 first line / 0.10 body |
| Simhaasanamandhu aaseenudai yunduvaani kudichethilo | 17 | Aaraadhinchedanu Ninnu | 0.94 first line / 0.22 body |
| Sree Yesu needu naamamandhu arpinchina | 11 | Christmas Mashup 5.0 | 1.00 first line / 0.20 body |
| Srushtikartha Yesuni sthuthinchedamu | 12 | Srushti Karthaa Yesu Devaa | 0.95 first line / 0.19 body |
| Sthothram sthuthi sthothram mahima ghanatha neeke | 10 | Nee Naamam Naa Gaanam | 0.92 first line / 0.17 body |
| Sthothramu seyare sodharulaara | 16 | Christmas Mashup 5.0 | 1.00 first line / 0.18 body |
| Sthothramu sthothramu o Deva | 12 | Sthothramu Sthuthi Sthothramu | 0.95 first line / 0.19 body |
| Sthothramu sthothramu sthothramu Yesu Devaa | 17 | Parishuddhudaa Parishuddhudaa | 0.95 first line / 0.12 body |
| Sthothramu sthothyamayyaa Devaa - Sthothramu sthothyamayyaa | 19 | Yavvanudaa | 0.94 first line / 0.15 body |
| Sthothramu Yesunaathaa | 13 | Yehovaanu Sannuthinchedan | 1.00 first line / 0.17 body |
| Sthothramul sthuthi sthothramul velaadi vandanaalu | 9 | Sthothramu Sthuthi Sthothramu | 1.00 first line / 0.62 body |
| Sthothraroopamagu krottha | 15 | Maatlaaade Yesayyaa | 0.92 first line / 0.13 body |
| Sthothrinchi keerthinthumu ghanaparachedhamu koniyaadedhamu | 24 | Yehova Naa Aashrayam | 1.00 first line / 0.17 body |
| Sthuthi cheyute kaadu | 17 | Aaraadhana Aaraadhana (Chellinchedamu) | 1.00 first line / 0.15 body |
| Sthuthi naivedhyam anduko Yesayyaa sthuthi | 13 | Vaadipoka Munde | 1.00 first line / 0.21 body |
| Sthuthi simhaasanaaseenudavu | 16 | Sthuthi Simhaasanaaseenudaa (Yesu Raajaa) | 1.00 first line / 0.10 body |
| Sthuthiki paathrudaa sthothraarhudaa ghanatha neekenayaa | 11 | Sthuthi Paathrudaa Sthothraarhudaa | 1.00 first line / 0.18 body |
| Sthuthinchu sthuthinchu Prabhu Yesu ne sthuthinchu | 16 | Shaashwathamaina Prematho | 0.94 first line / 0.14 body |
| Sthuthinchudi meeru sthuthinchudi | 18 | Aruna Kaanthi Kiranamai | 0.95 first line / 0.31 body |
| Sthuthinchudi sthuthinchudi - Aayana mandhirapu aavaranamulo | 14 | Naa Praanamaina Yesu | 1.00 first line / 0.16 body |
| Sthuthinthun Devuni sabhalo sthuthinthun hallelooya | 17 | Yehovaa Naa Balamaa | 1.00 first line / 0.14 body |
| Sthuthinthun parishuddhuni aaraadhanatho | 17 | Yehovaanu Sannuthinchedan | 0.95 first line / 0.16 body |
| Sthuthinthun sthuthinthun - Naakaalochana karthayagu Devuni | 15 | Yehovaa Naa Balamaa | 0.93 first line / 0.17 body |
| Sthuthiyinchu Prabhun sthuthiyinchu | 34 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.27 body |
| Sthuthiyinchu priyudaa sadaa Yesuni | 14 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.31 body |
| Sthuthiyinchudi shudhdhudehovaanu sthuthiyinchudi | 25 | Yuddhamu Yehovaade | 0.93 first line / 0.31 body |
| Sthuthiyinthumo Prabhuvaa shubhamau nee dinamuna | 14 | Prabhuvaa Ee Aanandam | 0.93 first line / 0.15 body |
| Sthuthulu neekarpinthumu sathathamu maa Prabhuvaa | 13 | Nee Naamam Athi Madhuram | 0.94 first line / 0.14 body |
| Suvaarthanu chaatimpa su samayambidhi yenu | 13 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Svathanthra raajyam Prabhuraajyam | 12 | Prabhu Yesu Naa Rakshakaa | 0.94 first line / 0.12 body |
| Swaasthyamugaa nichchithivi jayinchedu vaanikanni | 24 | Yavvanaa Janamaa | 1.00 first line / 0.21 body |
| Swasthaparachu Yehovaaneeve neerakthantho mammu kadugu Yesayyaa | 6 | Aadhaaram Neevenayyaa (Medley) | 0.92 first line / 0.13 body |
| Thalli marachina maruvani Deva thandri | 13 | Thandri Devaa | 0.95 first line / 0.17 body |
| Thambura sithaaratho - Maa prabhuni aaraadhinchedamu | 34 | Nithyamu Sthuthinchinaa | 1.00 first line / 0.13 body |
| Thana raajyamunakunu mahimakunu mimmunu | 15 | Ammaa Ani Ninnu Piluvanaa | 0.94 first line / 0.14 body |
| Thandri parama thandri neeve maa | 13 | Aadhaaram Neevenayyaa | 1.00 first line / 0.14 body |
| Theruvabadiyunnadhi krupadhwaaramu | 24 | Kanuchoopu Meralona | 0.93 first line / 0.12 body |
| Thrithvamarmamu nerigina mithrundaa praanamunimmu | 13 | Yesayyaa Naa Praana Naathaa | 0.94 first line / 0.12 body |
| Unnatha gruhamunu thvaragaa cheri sampannuni darshinthunu | 29 | Maatlaaade Yesayyaa | 1.00 first line / 0.11 body |
| Unnatha sthalamulapai nekkinchi choopinchu Prabhu | 25 | Premisthaa Ninne | 0.95 first line / 0.14 body |
| Unnathamaina sthalamulalo | 14 | Mahonnathudaa Maa Devaa | 0.94 first line / 0.22 body |
| Unnathudaa athyunnathudaa | 12 | Yesu Sarvonnathudaa | 0.94 first line / 0.21 body |
| Unnattu nenu vachchedhan paapinaina nan pilvagan | 13 | Praanamaa Naa Praanamaa | 0.94 first line / 0.13 body |
| Vaaru bhaagyavanthu laudhuru | 15 | Yavvanudaa | 0.94 first line / 0.14 body |
| Vandanamayyaa Yesu neeku vandanamayyaa | 19 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Vandanamu nimmu Prabhu Yesunaku jai jai yanipaadu | 15 | Mahima Ghanathaku Arhudavu | 0.95 first line / 0.14 body |
| Vandhanamo vandhana Mesayya | 26 | Nammakamaina Naa Prabhu | 1.00 first line / 0.12 body |
| Veerude Lechenu | 29 | Alankarinchunu | 0.95 first line / 0.11 body |
| Veruvanela manasaa Kreesthuni vedave | 14 | Nee Naamam Naa Gaanam | 0.92 first line / 0.09 body |
| Vijayambu vijayambu vijayambu maa Yesu | 15 | Jayam Jayam Mana Yesuke | 0.95 first line / 0.11 body |
| Viluvainadi ee jeevitham anni velala | 21 | Viluvainadi Nee Jeevitham | 1.00 first line / 0.14 body |
| Vimochakudu mana Yesu prabhuvu | 8 | Christmas Shubha Dinam | 0.93 first line / 0.17 body |
| Vina rammu Yesu naadhuda | 16 | Christmas Mashup 5.0 | 1.00 first line / 0.12 body |
| Vinare manujulaara Kreesthu | 34 | Nee Naamam Naa Gaanam | 0.92 first line / 0.09 body |
| Vinare narulaaraa manamula vedukalanu | 16 | Christmas Mashup 5.0 | 1.00 first line / 0.14 body |
| Vindu paramandhubendli vindu | 14 | Aanandamaanandame | 0.93 first line / 0.18 body |
| Vinthaina prema idhegaa Yesayya prema nijangaa | 24 | Prema Yesayyaa Premaa | 1.00 first line / 0.11 body |
| Visukadhe praanambu vignyaani kilanu posagu | 18 | Praanamaa Naa Praanamaa | 0.94 first line / 0.09 body |
| Vyasanapadakumu neevu | 18 | Aakaashamandunna Aaseenudaa | 0.94 first line / 0.23 body |
| Yaajaka dharmamu nerigi Yesunike seva prematho nonarimpudu | 15 | Yehovaa Naa Balamaa | 1.00 first line / 0.11 body |
| Yauvana kraisthava janamaa Kreesthuni premanu ganumaa | 8 | Yavvanaa Janamaa | 1.00 first line / 0.11 body |
| Yauvanulaaraa mee yauvanamulo santhasinchudi | 23 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Yehova agaadha sthalamulalo nundi | 15 | Yehovaa Maa Kaapari | 1.00 first line / 0.16 body |
| Yehova andharikini mahopakaarundu | 18 | Yehovaa Dayaaludu (Aayanake Kruthagnatha) | 1.00 first line / 0.18 body |
| Yehova bhajana cheyandi | 14 | Yehovaa Maa Kaapari | 0.93 first line / 0.13 body |
| Yehova goppa kaaryamulu chesenu veerikoraku | 17 | Yehovaa Naa Balamaa | 1.00 first line / 0.15 body |
| Yehova illu kattinchani yedala | 33 | Yehovaa Naa Balamaa | 1.00 first line / 0.13 body |
| Yehova kaaryamulannitikai | 32 | Janminchenu Oka Thaara | 0.94 first line / 0.12 body |
| Yehova kattina illu idhi | 8 | Devaa Mahonnathudaa | 0.93 first line / 0.12 body |
| Yehova maa balamaa neeve kada naa dheema | 36 | Yehovaa Naa Balamaa | 1.00 first line / 0.21 body |
| Yehova maa prabhuvaa bhoomi aakaashamulo | 24 | Yehovaa Maa Kaapari | 1.00 first line / 0.17 body |
| Yehova maa thandri gaadha | 14 | Yehova Naa Aashrayam | 0.93 first line / 0.12 body |
| Yehova mana koraku - Goppa kaaryamulanu | 17 | Yehovaa Naa Balamaa | 1.00 first line / 0.16 body |
| Yehova mandhiramunaku nadichedhamu | 23 | Aanandamaanandame | 0.93 first line / 0.14 body |
| Yehova meeda krottha keerthana paadudi | 17 | Nee Naamam Athi Madhuram | 1.00 first line / 0.19 body |
| Yehova naa kaapari inka godu vemi | 15 | Yehovaa Maa Kaapari | 1.00 first line / 0.21 body |
| Yehova Naa Kaapari Naakemi Lemi Kalugadu | 7 | Yehovaa Maa Kaapari | 1.00 first line / 0.23 body |
| Yehova naa kaapari naaku lemi kalugadu | 11 | Yehovaa Maa Kaapari | 1.00 first line / 0.31 body |
| Yehova naa kaapari naaku lemi kalugadu | 15 | Yehovaa Maa Kaapari | 1.00 first line / 0.14 body |
| Yehova nee mahima sthavamu Yesuni sundara mandiramu | 24 | Yehova Naa Aashrayam | 0.93 first line / 0.13 body |
| Yehova puri punaadi | 13 | Yehova Naa Aashrayam | 0.93 first line / 0.10 body |
| Yehova sevakulaaraa sthuthinchudi | 34 | Yesayyaa Naa Doraa | 1.00 first line / 0.13 body |
| Yehova, neevu nannu parishodhinchi | 15 | Neethone Undutaye | 0.93 first line / 0.20 body |
| Yehovaa koraku sahanamutho kanipettan | 30 | Naalo Unna Aanandamu | 0.92 first line / 0.20 body |
| Yehovaa maa Deva sarvaloka daivamaa | 12 | Yehovaa Naa Balamaa | 0.93 first line / 0.19 body |
| Yehovaa mahaathmyamu goppadi entho | 28 | Aaraadhana Adhika Sthothramu | 1.00 first line / 0.17 body |
| Yehovaa naa Devaa nithyamu | 34 | Aathma Deepamunu | 1.00 first line / 0.20 body |
| Yehovaa nee krupaathishayamunu nithyamu keerthinthun | 15 | Naalo Unna Aanandamu | 1.00 first line / 0.23 body |
| Yehovaakoraku eduru choochuvaaru noothana | 6 | Yehovaa Naa Balamaa | 1.00 first line / 0.25 body |
| Yehovaaku kroththa keerthana paadudi | 20 | Yehovaaye Naa Balamu | 1.00 first line / 0.19 body |
| Yehovaaku paadudi paatan athi shreshta kaaryamulanu chesina vaadani | 15 | Premagala Yesayyaa | 0.93 first line / 0.15 body |
| Yehovaanaina nenu maarpu leni vaadanu gaana | 17 | Yehova Naa Aashrayam | 0.93 first line / 0.18 body |
| Yehovaanu sthuthinchudi | 18 | Aaraadhinchedanu Ninnu | 1.00 first line / 0.13 body |
| Yehovaanu sthuthinchuta manchidi | 27 | Christmas Mashup 5.0 | 1.00 first line / 0.16 body |
| Yehovaayandhaanandhame | 12 | Yehovaa Naa Balamaa | 1.00 first line / 0.18 body |
| Yehovaaye aashcharya kaaryamulanu chesiyunnaadu | 17 | Aadhaaram Naaku Aadhaaram | 0.93 first line / 0.18 body |
| Yehovaaye manakandhariki enniyo melula jesen | 18 | Vinavaa Manavi | 0.94 first line / 0.18 body |
| Yehovaaye naaku velugu rakshanayu | 34 | Yehovaa Naaku Velugaaye | 1.00 first line / 0.21 body |
| Yehovaye naa mahaadhevudani | 17 | Yehovaaye Naa Balamu | 0.94 first line / 0.11 body |
| Yerushalemu gummamulaaraa raajunu loniki raanimmu | 18 | Yesayyaa Naa Yesayyaa | 0.93 first line / 0.14 body |
| Yesayya naa praanamaa – Ghanamaina sthuthigaanamaa | 22 | Yesayyaa Naa Praana Naathaa | 1.00 first line / 0.18 body |
| Yesayya neeve aashrayapuramu | 15 | Yese Naa Aashrayamu | 0.92 first line / 0.15 body |
| Yesayyaa naa Yesayyaa neevenaa manchi kaapari | 14 | Brathikiyunnaanante Nee Krupa | 1.00 first line / 0.20 body |
| Yesayyaa nee naama gaanam - Ne paadeda jeevithaantham | 7 | Naa Jeevithaanthamu | 0.92 first line / 0.16 body |
| Yesayyaa o Yesayyaa | 13 | Aashrayudaa Naa Priyudaa | 0.94 first line / 0.20 body |
| Yese bhagavannaamam bhajimpanu | 12 | Yavvanaa Janamaa | 1.00 first line / 0.16 body |
| Yese naa Devudu | 14 | Yesu Manchi Devudu | 1.00 first line / 0.14 body |
| Yesoo naa prabhuvaa nee prema lekunna | 23 | Visheshamaina Krupa | 0.92 first line / 0.21 body |
| Yesoo nee krupalo nanu rakshinchithivaa | 6 | Krupa Kanikaramula | 0.94 first line / 0.17 body |
| Yesoo neeraktha neethulu naa sompu naadu vasthramu | 11 | Naa Thanuvu Naa Manasu | 0.94 first line / 0.11 body |
| Yesu anu naamame naa madhura | 11 | Yese Naa Maargamu | 0.92 first line / 0.13 body |
| Yesu chaavonde siluvapai nee korake naa korake | 9 | Praanamaa Naa Praanamaa | 1.00 first line / 0.15 body |
| Yesu dehamu sanghamu | 15 | Yesu Prabhuvaa Neeve | 0.93 first line / 0.12 body |
| Yesu Devuni Aaraadhikulam | 17 | Devunike Mahima | 0.93 first line / 0.11 body |
| Yesu Devuni aaraadhikulam venuka choodani sainikulam | 13 | Devunike Mahima | 0.93 first line / 0.11 body |
| Yesu divya rakshakuni sthuthinchu bhoomee divya premanu chaatumu | 14 | Naa Praanamaa Sannuthinchumaa (Yehovaa) | 1.00 first line / 0.17 body |
| Yesu lechenu aadhivaaramuna | 14 | Mee Gnaapakaardhamugaa | 1.00 first line / 0.08 body |
| Yesu lenicho paapikaashrayame ledu | 15 | Aakaashamandunna Aaseenudaa | 0.94 first line / 0.13 body |
| Yesu maaradu Yesu maaradu vishvamantha maarinanu maatathappadu | 31 | Yehovaa Naa Balamaa | 0.93 first line / 0.17 body |
| Yesu madhura naamamu paadudi | 14 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Yesu mammu nadipinchu | 13 | Naalo Unna Aanandamu | 0.92 first line / 0.17 body |
| Yesu mammu nadipinchu needu kaapu | 24 | Prabhu Yesuni Vadanamulo | 0.94 first line / 0.19 body |
| Yesu manathonundaga dhairyamugaa saaguchu | 27 | Yesanna Swaramannaa | 0.93 first line / 0.15 body |
| Yesu naa siluva netti ippudu | 15 | Yese Naa Maargamu | 0.92 first line / 0.17 body |
| Yesu naama mentho madhuram | 12 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Yesu naamaamruthamu kannanu vere | 10 | Christmas Mashup 5.0 | 1.00 first line / 0.13 body |
| Yesu naamam betti paadudhama | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.12 body |
| Yesu naamame paavanamu maaku | 10 | Yavvanaa Janamaa | 1.00 first line / 0.13 body |
| Yesu nangeekarinchithi dhaivaputhruda naithini | 14 | Christmas Mashup 5.0 | 1.00 first line / 0.15 body |
| Yesu nee adbhutha prema nenela marichedha Deva | 16 | Yesu Naathaa Devaa | 1.00 first line / 0.16 body |
| Yesu nee krupalo | 12 | Yesuni Roopanloniki Maaraali | 0.92 first line / 0.21 body |
| Yesu Neevu Nannu Premisthunnaavu Needu Premanu Nenu Pondhuchunnaanu | 15 | Ninne Ne Nammukunnaanu | 0.94 first line / 0.13 body |
| Yesu padhaambuja sharanam | 12 | Yesanna Swaramannaa | 0.93 first line / 0.10 body |
| Yesu Prabhoo gaddhepainunna neeku maa sthuthulanu chellinchedamu | 22 | Simhaasanaaseenudaa Naa Yesayyaa | 0.96 first line / 0.13 body |
| Yesu prabhoo naa korakai baligaanu neevaithivi | 14 | Nee Naamam Naa Gaanam | 1.00 first line / 0.21 body |
| Yesu Prabhu nee mukha dharshanamuche naa prathi yaashanu theerchukondhunu | 22 | Ninne Ne Nammukunnaanu | 1.00 first line / 0.18 body |
| Yesu prabhu piluchuchunden noothana jeevam neekichchutaku | 10 | Samastha Janulaaraa | 0.95 first line / 0.16 body |
| Yesu prabhuve neeku rakshana nichchunu | 31 | Naa Praanamaina Yesu | 0.94 first line / 0.16 body |
| Yesu Prabhuvegaaka vasudhalo rakshakude ledu | 18 | Christmas Mashup 5.0 | 1.00 first line / 0.17 body |
| Yesu punaruththaanamaayenu | 12 | Christmas Mashup 5.0 | 1.00 first line / 0.11 body |
| Yesu puttenu nedu | 24 | Yesu Kreesthu Puttenu Nedu | 1.00 first line / 0.11 body |
| Yesu raajun nee edalo vasiyimpa neeyavaa | 19 | Entha Paapinainanu | 0.93 first line / 0.17 body |
| Yesu rakshakaa shathakoti sthothram | 15 | Yesu Rakshakaa | 1.00 first line / 0.86 body |
| Yesu rakthame jayamu | 12 | Yesu Rakthame Jayamu Jayamuraa | 1.00 first line / 0.21 body |
| Yesu sheeghramuga thirigivachchun sathyadhevuni vaakyamidhe | 13 | Aathma Deepamunu | 1.00 first line / 0.19 body |
| Yesu sheeghramugaa vachchun aashatho kanipettudi | 17 | Choochuchunnaamu Nee Vaipu | 0.94 first line / 0.10 body |
| Yesu shishyulaku neruka jesina | 9 | Yese Naa Aashrayamu | 0.92 first line / 0.13 body |
| Yesu vasthrapu chengunu maathrame | 12 | Aascharyakarudaa (Yesanna) | 0.92 first line / 0.12 body |
| Yesu ― nene maargamunu, | 17 | Yesu Naathaa Devaa | 1.00 first line / 0.13 body |
| Yesukreesthu ninna nedu okkatereethigaa | 4 | Nee Naamam Naa Gaanam | 1.00 first line / 0.15 body |
| Yesulo harshinchedhamu mahimalo harshinthumu niratham | 25 | Yehovaa Naa Balamaa | 1.00 first line / 0.14 body |
| Yesunaadhuni siluvapaini vesi | 16 | Yesanna Swaramannaa | 0.93 first line / 0.09 body |
| Yesunaadhuni yodhulandharu vaasiga nitarandu | 18 | Yesu Naathaa Devaa | 1.00 first line / 0.11 body |
| Yesuni chenthaku aashatho rammila dhoshamul baapunayaa | 16 | Aaraadhana Anduko | 1.00 first line / 0.19 body |
| Yesuni chethulandhu Yesuni rommunan | 16 | Ninne Ne Nammukunnaanu | 1.00 first line / 0.15 body |
| Yesuni nindanu bharinchi aayana yoddaku velludhamu | 32 | Aanandamaanandame | 0.93 first line / 0.17 body |
| Yesuni prema bahu kammanainadhi – Jeevaahaaram madhuraathi madhurame | 7 | Nee Naamam Athi Madhuram | 1.00 first line / 0.14 body |
| Yesuni rakthame jai jai Prabhu Yesuni rakthame jai | 20 | Neetho Nenu Naduvaalani | 0.92 first line / 0.18 body |
| Yesuni sevimpa dhayachesithivi | 9 | Yesanna Swaramannaa | 1.00 first line / 0.17 body |
| Yesuni shishyulamu yegudhamu pishaachi lokamunu kadhalinthumu | 31 | Lokaana Eduru Choopulu | 0.94 first line / 0.12 body |
| Yesuni shramalathoda aashatho paalu pondedanu | 18 | Yesayyaa Naa Praana Naathaa | 0.94 first line / 0.11 body |
| Yesuni sucharitha mentha ponarinadhi | 17 | Yesu Maatho Neevundagaa | 1.00 first line / 0.10 body |
| Yesuni sweekarinchu Kreesthesuni sweekarinchu | 17 | Christmas Mashup 5.0 | 1.00 first line / 0.14 body |
| Yesuni vaagdhaanamul jnaapakamunandhunchukoni | 15 | Bhayapadakumaa | 0.94 first line / 0.12 body |
| Yesuni venta nenu vembadinchuchunnaanu | 26 | Ninnu Vembadincheda | 0.94 first line / 0.21 body |
| Yesuprabhuve mahima nireekshana manalo vunnaadu | 15 | Christmas Mashup 5.0 | 1.00 first line / 0.13 body |
| Yesuprabhuvu Yerooshalemu praveshinchina vidhamu | 16 | Prabhu Mora Vinavaa | 0.93 first line / 0.12 body |
| Yesuva jayamutho Yerushalemuna | 15 | Mee Gnaapakaardhamugaa | 1.00 first line / 0.14 body |
| Yesuvaa naa priyamaina aathma mithrudaa nannu bhaasuramuga vegavachchi kaugalinchave | 20 | Naalo Unna Aanandamu | 1.00 first line / 0.10 body |
| Yesuvale ila nenundedhanu | 15 | Mee Gnaapakaardhamugaa | 1.00 first line / 0.14 body |
| Yoodhaalo Devudu prasiddhudu | 30 | Christmas Mashup 5.0 | 1.00 first line / 0.14 body |
| Yoodula raajuga puttinavaanini | 24 | Ammaa Ani Ninnu Piluvanaa | 0.94 first line / 0.12 body |
| Yordhannadhi darini bhramimpaku manasaa - Yochanache chinthapadaku naa dendhamaa | 16 | Viduvanu Ninu Edabaayanani | 1.00 first line / 0.14 body |

## Duplicated inside visualParsed — 138

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Aa Kaluvari maargamulo Yesu siluvanu mosenu | 13 | Niraakaara suroopudaa manoharaa karigithivaa naakai vrelaaduchu siluvalo |  |
| Aadarinche vaaru leka | 49 | Premaamruththadhaaralu chindhinchina Yesuku samamevaru |  |
| Aananda maanandha maanandhame aananda maanandhame | 9 | Devuni Seeyon puramaa |  |
| Aanandamutho aaraadhinthun | 16 | Sthuthiyoo, prashamsayoo, mahimayoo |  |
| Aashinchumu Prabhu Yesu paadhamulanu | 18 | Yesayyaa naa priyaa |  |
| Aayana thana mukhakaanthi maameedha prakaashimpajeyunu gaaka | 13 | Yesayyaa naa priyaa |  |
| Alasatapadda neevu dhevokthi vinu | 24 | Paapa Pashchaaththaapa Mondhani Vaariki |  |
| Anthya dinamandu dootha boora noodhu | 23 | Anthya dinamulandhu mem undagaa |  |
| Apathkaalamandu Yehova | 10 | Aapathkaalamandhu Yehova neekuththaramichchunu gaaka |  |
| Baala Yesuku jolalu paada | 12 | Paapal Hosannaa Paatal Paadina Reethigan |  |
| Chaalunu loka bhogamulu chaalunu | 19 | Chaalu chaalu |  |
| Cheri Jeevinchudi | 23 | Cheri bhujiyimpudeevindhu Yesu |  |
| Chinnabiddala vinnapamula nennadaina | 10 | Janu landharu vinandi divya sangathi |  |
| Choodumu Gethsemane thotalo naa Prabhuvu | 15 | Choodumu Gethsemane |  |
| Daagu nedhi maapunu vega Yesu raktha daare | 20 | Dhaivaathmaa dhigumu daasula |  |
| Dayagala Yesu Prabhoo - Ninnu eruga krupanimmu | 17 | Yesayyaa naa priyaa |  |
| Deva kaavave nedu mammulan | 6 | Devaa neeku sthothramu |  |
| Devaa naa Devudavu neeve | 8 | Devaa naa devudavu neeve |  |
| Devakaavave raathri mammulan | 7 | Devaa neeku sthothramu |  |
| Devudu maapakshamuna undaga maaku virodhi evadu | 12 | Devudu maa pakshamuna undagaa |  |
| Devuni mahima mandhiram - Yaajakula aaradhanaalayam | 26 | Noothanamaina Yerushalemu parishuddha pattanamu |  |
| Dhevaathma jayo dheenadhayaaloo | 10 | Divya paavanaathma nee eevu lanni |  |
| Dhevundavaina yaathma raa nee vaari | 24 | Devu dichchina dhivyavaakyamu |  |
| Dhivyaathma dhigirammu | 18 | Dhaivaathmaa dhigumu daasula |  |
| Ee Devudu sadaakaalamu manaku | 18 | Needu sanni dhaanamandhu O naa Yesurakshakaa |  |
| Ee jagathiki jyothini nenu jeevana jyothi jvalinchedhanu | 14 | Lokamunaku nannu Deva naa Deva uppugaa jesithivi |  |
| Ee reyi challanidi | 16 | Vinare yaposthalula kaaryamul |  |
| Ee sangham punaadi Kreesthe saadheeshude | 32 | Parishuddhaathmanu gorumu jeevamu |  |
| Elaanti vaadavainaa | 20 | Elaativaado kaani ee Yesuni |  |
| Emmaanuyel naatho unna vaadaa | 20 | Lechu dinamu vachchunu |  |
| Erugani reethigaa | 15 | Vaaraayananu janasamaajamulo ghanaparachudhuru gaaka |  |
| Evaru jayinchedharo vaare samasthamunu pondedaru | 23 | Jayinchuvaadu Dhevakumaarudu bhayamu chendaka yundudi |  |
| Gaadaandhakaaramulo nenu thiriginanu | 10 | Gaadaandhakaaramulo nenu thiriginanu nenela bhayapadadhoo |  |
| Gauravaneeyudaa Galileeyavaada Yesayya ninnu ghanaparachedhanayya | 7 | Yesayyaa naa priyaa |  |
| Idigo mee devudani | 36 | Gaddi endipovunu daani puvvu |  |
| Idigo nenu vachchuchunnaanu thvaragaa vachchuchunnaanu | 11 | Raajula raajuga Yesu prabhundu |  |
| Idiye samayam | 32 | Yesayyaa naa priyaa |  |
| Jagathi karudhenche rakshanakartha paapula mora vinenu Yesu | 11 | Yesu Kreesthu prabhuvaayane andariki prabhuvu |  |
| Jayahe | 19 | Jayahe jayahe |  |
| Jayahe Kreesthesu prabhuvuke jayahe raaraaju | 22 | Jayahe jayahe Kreesthesu |  |
| Jayamani paadu Prabhuyesunake hosanna jai | 16 | Shree rakshakuni naamamu keerthinchi kolvudi |  |
| Jayamu pondhumani Yesu cheppenu | 21 | Jayinchuvaadu Dhevakumaarudu bhayamu chendaka yundudi |  |
| Jeevapu maarga jyothivi - Siluva mosina Yesu | 13 | Niraakaara suroopudaa manoharaa karigithivaa naakai vrelaaduchu siluvalo |  |
| Kaluvarilo chindhimpabadenu Yesu rakthamu | 14 | Manchivaadaa manchivaadaa |  |
| Kanneellu viduchuchu viththuvaaru santhoshagaanamutho | 14 | Repu maapu gooda ramyamaina ginjal |  |
| Kondalavaipu kannuletthinaa | 18 | Kalavara padi ne kondala vaipu |  |
| Kreesthese mana mahima nireekshana | 16 | Lendee randee bhaavimahonnatha saakshulaaraa lendee |  |
| Kreesthu nedu lechenu | 48 | Kreesthu nedu lechenu |  |
| Kreesthu nedu puttenu | 32 | Kreesthu nedu puttene rakshana dhorikene |  |
| Kreesthu veerulaaraa yuddha maadudee | 28 | Kreesthu virodhulapai simhagarjana kraisthavude cheyyaali |  |
| Kreesthuleche hallelooya leche jayasheeludu | 19 | Yesayyaa naa priyaa |  |
| Lelemmu sodaree sodharudaa velaaye Yesuni sevimpanu | 26 | Lelemmu sodaree sodharudaa Rakshakudesuni sevimp |  |
| Lokaaniki aanandame | 23 | Reference: Aayanalo meeru kooda aathmamoolamugaa |  |
| Maayaalokam maayaalokam maaripoku | 12 | Maayalokam thelusuko idhi maayalokam premalokam |  |
| Mahaa devundu parishudhdhudagu thanayuni | 15 | O Deva rakshakaa ne vishvaasambutho |  |
| Mana Yesu maranasmaarana vindulo | 21 | Yesayyaa naa priyaa |  |
| Mangalamu baadare Kreesthunaku | 11 | Yesayyaa naa priyaa |  |
| Manulu maanikyamulunnaa medamiddhelu ennunnaa | 10 | Manulu maanikyamulunna |  |
| Mattiviraa vattiviraa manuvuraa mannavuraa | 20 | Mattiviraa vattiviraa mannuvuraa mannavuraa kaayamu |  |
| Meghamu meeda Yesuraaju vega milakuvachchun | 17 | Meghaa roodhundai Prabhuyesu athi vegamugaa nethenchun |  |
| Memichchu kaanukal neeve maakichchithi | 24 | Indhuledhu niluchu pattanam Kreesthu yaathrikulaku |  |
| Musalamma muchchatlu katti petti - Parishuddha grandhaanni chethapatti | 15 | Musalamma muchchatlu |  |
| Naa Prabhu preminchenu nannu priyudaina Kreesthu preminchenu | 13 | Athyantha sundharundunu ellari kaankshaneeyudu |  |
| Naa Yesu naa yaathma balamaa | 16 | Yesu needu jaalivalla |  |
| Naa Yesu naama shabdamu entho impainadhi | 24 | Naadha Yesu naadha Kreesthu naadha nenanaadha |  |
| Naadu praana moprabho nenu neekarpinthunu | 24 | Edhenu thotalo |  |
| Namaskarimpa randi Daaveedu puthruni | 32 | Sarvaadhbhuthambulan sarvathra jeyukarthan |  |
| Ne neevaadanai yundagoredhan | 11 | Yesu naavaadani nammudhun enthentho divya saubhaagyamu |  |
| Nee Devuni sannidhini kanabadanu neevu siddhapadumaa | 30 | Nee Devuni sandhincha neevu aayaththamaa |  |
| Nee kanti paapavale nannu kaachutaku | 21 | Kanti paapa vale nannu |  |
| Nee krupa nenemainaa | 33 | Paadudhunu Kreesthu pera padhamu |  |
| Nee Premanu Nee Karunanu | 21 | Reference: yugayugamulu jeevinchuchunna vaaniki mahimayu |  |
| Nee premaye naaku chaalu | 13 | Nee premaye naaku chaalu |  |
| Nee sannidhi aanandamu aadyanthamu | 24 | Thrithvamai nithyathvamuna nekathvamagu Deva |  |
| Nee vunte chaalu naaku | 17 | Chaalu chaalu |  |
| Neelaa lerevvaru neeku saatevvaru mahaa | 8 | Devaa naa devudavu neeve |  |
| Neetiyoota yodda naatabadithimi | 8 | Neethi yoota yodda |  |
| Neevantivaaru leru | 22 | Nee vanti vaaru evaru ee lokamlo |  |
| Neevu denini vedhakuchunnaavu | 19 | Meeremi vedhakuchunnaaru |  |
| Nene unnavaadananina advitheeya Prabhu aaraadhinthu | 24 | Yesu naamamu smarinchu baadha neeku galgagaa |  |
| Nimpumo Prabhu nannu sarva samsampoornathathonu nannu | 9 | Prabhuvaa paraloka - Jeevaagni nimmu |  |
| Ningilona thaaraka cheya vachchindi veduka | 21 | Yesu Kreesthuni golva ranna |  |
| Ninu aasheervadhinthunu | 19 | Nishchayamuga ninnu dheevinchedhanu |  |
| Nishchalamainadhi Yesu raajyamu prakaashinche raajyamu | 23 | Prabhuraajyam nishchalamainadhi shubhapradhambu shaashwathamainadi |  |
| Noothana geethamu paadedanu naa priya Yesuni | 19 | Noothana geethamu paadedanu |  |
| Noru theruvani prema | 13 | Manchivaadaa manchivaadaa |  |
| O bhakthulaaraa manamandaramu nithyamu Yesuni sthuthiyinchedhamu | 28 | Shodhanaku meeru chotiyakudi |  |
| O Prabhuvaa ujjeevamu nimmu | 24 | Priyamainatti naa yaathma sthothrambu |  |
| Oohaku andani prema naa Yesu prema | 14 | Oohaku andani prema naa Yesu prema |  |
| Paadeda nenoka noothana geetham paadeda manasaaraa | 8 | Paadeda nenoka noothana geetham paadeda |  |
| Parama thandri ninnu me mee parasa | 18 | Naa thandri ninu nenu |  |
| Paramageetham paadanaa prabhuni premanu pogadanaa | 12 | Paadeda nenoka noothana geetham paadeda |  |
| Prabhu goppa kaaryamulu chesenani manamuthsahinchedhamu | 17 | Shree Yesu naathuni shirasaavahinchi shishyulame Yesunu ghanaparachedhamu |  |
| Prabhuyesu rammanuchunde paapula nellarini | 18 | Raarandi Yesu paadamula chera paapa vimukthi ponda |  |
| Prabhuyesu sanghamu nirminchuchunda garvisaathaanu jayamondha ledu | 31 | Eeyana maata vinudi nedu eeyane naa priya kumaarudu |  |
| Prakaasha vasthramutho paraloka mahimatho lokambuna kethenchunu meghambupai Prabhuve | 20 | Gaayambutho nindaaru o shudhdha shirassaa |  |
| Prakaashamaina aashcharyadheshamu priyuni deshamu naa priya deshamu | 24 | Mana pattanambadhigo mana paurathvambadhigo |  |
| Preme naa maargam Devaa | 12 | Prajalaaraa vegame raare - Nijadhaivamunu kanugonare |  |
| Reference: Aayana parishuddhaathmalonu agnithonu meeku | 8 | Yesayyaa naa priyaa |  |
| Reference: Adugudi meekiyyabadunu. Thattudi meeku | 9 | Adugudi meeru mana prabhuvichchun |  |
| Reference: nenu choodagaa mandhirapu gadapakrindha | 10 | Nee preme nanu aadarinchenu |  |
| Saagilapadi aaraadhinchedamu | 31 | Yesayyaa naa priyaa |  |
| Sakhudaa divya sakhudaa | 88 | Reference: Aayanalo meeru kooda aathmamoolamugaa |  |
| Samasthamunu meeve | 17 | Jai Prabhu Yesu jai ghana Deva jai Prabhu jai jai raajaa |  |
| Samasthamunu meevi | 17 | Sarva shakthuni vaakku idiye samasthamunu meeve |  |
| Sarvamupai Yesu raajyamelun paapi mithrudu gorrepillaku | 20 | Yesayyaa naa priyaa |  |
| Shubhadinam ee dinam | 15 | Vinare Yesukreesthu bodha madini |  |
| Shubhavaartha vintimi Yesu rakshinchunu | 24 | Sarvaadhbhuthambulan sarvathra jeyukarthan |  |
| Siddhapadudhaam siddhapadudhaam | 12 | Sidhdhapadudhaam sidhdhapadudhaam mana Devuni |  |
| Siluvanu goorchina vaartha | 12 | Kaluvarilo vimukthi kaligeno priyundaa |  |
| Sodharulaaraa lendi raakada gurthulu choodandi | 18 | Yesuraaju vachchunu doothalatho vachchunu |  |
| Sthothra geethamulanu paaduchu priya Prabhuni poojinchudi | 27 | Yesu naavaadani nammudhun bhaasillu |  |
| Sthuthiyinthumu Yesu prabhuvaa | 16 | Raajula raajuga Yesu prabhundu |  |
| Sundara rakshakaa srushtiyokka naadhaa | 24 | Yesayya lone unnadi manaku rakshana |  |
| Udayinchinaadu Kreesthudu nedu | 12 | Udayinchinaadu Kreesthudu nedu udayinchinaadu |  |
| Unnaanayaa nenunnaanayyaa | 20 | Lokamunu Jayinchina |  |
| Unnattu nenu vachchedhan | 19 | Naadu vachchinatlu gaadhu nedu vachchuta |  |
| Velpulalo bahughanudaa Yesayya | 18 | Velpulalo bahu ghanudu |  |
| Vintimayyaa nee swaramu - Kantimayyaa nee roopamunu | 21 | Mariyaku suthuduga dharanu janminchi Immaanuyelaayen |  |
| Vinudi sodharulaaraa - Naa Yesu Prabhu - Ila kethenchen | 18 | Yesu Kreesthu prabhuvaayane andariki prabhuvu |  |
| Vyarthamu vyartham sarvamu | 18 | Vyartham vyartham sarvamu vyartham |  |
| Yehova gadde mundhata janambulaara mrokkudi | 8 | Yehova gadde mundhata janambulaara mrokkudi |  |
| Yesayya janminche ee nelapai | 21 | Oohakandhanantha unnatham naapatla |  |
| Yesayya ninne sevinthunu | 21 | Bandhinaipoya Neelo Munigi Teelaaka |  |
| Yesayya Nuvve Naa Aasha | 58 | Yesayya Naa Nireekshana |  |
| Yesayyaa nannu vadhalavu neevu | 50 | Yesayya Naa Nireekshana |  |
| Yese naaku samasthamu | 14 | Vinthagala maa Yesu premanu |  |
| Yesoo yaathma priyudaa ninnu | 32 | Yesayyaa naa priyaa |  |
| Yesu koodaa vachchunu | 11 | Yesu naayakuda ella velalanu |  |
| Yesu Kreesthu mathasthu danagaa | 12 | Yesu samaadhilo parundiyundi |  |
| Yesu naamam annitikanna shreshtamaina naamam | 24 | Yesayya lone unnadi manaku rakshana |  |
| Yesu prabhuve lokarakshakudu | 24 | Maanava roopamunu dharinchi arudhenche Yesu ihamunaku |  |
| Yesu thrupthi parachithivi | 12 | Yesayyaa naa priyaa |  |
| Yesukreesthe sajjanudu vairikanna balavanthudu | 11 | Paapa samudhramandhu pagile naa hrudhayanaava |  |
| Yesukreesthu sheeghramuga sheeghramuga sheeghramuga | 11 | Shree Yesureethigaanu premimpa gorudhun |  |
| Yesuni raajyamu adhi nishchalamainadhi | 19 | Velledam shreshtadhesham nijamu vundedham prabhuthone nithyamu |  |
| Yesunu sthuthiyinchuvaaru nithyajeevamu pondedaru | 11 | Yesuni sthuthinchuvaaru nithya jeevamu nondhedharu |  |
| Yogyudavo Yesu Prabho neeve yogyudavo | 8 | Yogyudavo yogyudavo |  |

## Failed the quality audit — 30

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Aadarinche vaaru leka |  |  | malformed_telugu ×1 |
| Adonai Sooryodhayamu Modhalukoni |  |  | telugu_has_no_telugu ×1, content_mismatch ×2 |
| Alasatapadda neevu dhevokthi vinu |  |  | malformed_telugu ×1 |
| Chaalunu loka bhogamulu chaalunu |  |  | malformed_telugu ×1 |
| E mukhaambuthoda vatthu Yesu naadhaa |  |  | malformed_telugu ×1 |
| Ela chintha ela vantha |  |  | malformed_telugu ×1 |
| Evarunnaarani epuduntaarani |  |  | malformed_telugu ×1 |
| Ghanamaina Kreesthu krupa ganugonti nipudu |  |  | malformed_telugu ×2 |
| Jagamulalo Neeve Maa Prabhu |  |  | telugu_has_no_telugu ×1, english_has_no_latin ×1 |
| Janu landharu vinandi divya sangathi |  |  | malformed_telugu ×1 |
| Kreesthunaayaka nee dhayaalini |  |  | malformed_telugu ×1 |
| Lekkaleni chukkalenno |  |  | malformed_telugu ×1 |
| Letha mokkalaa thandri sannidhilo |  |  | telugu_has_no_telugu ×1, english_has_no_latin ×1 |
| Madhyapaana priyulu gaakundi |  |  | malformed_telugu ×1 |
| O Yesu rakshakaa nee pilpu vindunu |  |  | malformed_telugu ×2 |
| Paapinayyaa ne baapi nayyaa |  |  | malformed_telugu ×1 |
| Paradheshi punyakshethra yaathra bovuchundhuvaa |  |  | malformed_telugu ×1 |
| Raare Yesuni joothamu |  |  | malformed_telugu ×1 |
| Raaro janulaaraa vegamu goodi |  |  | malformed_telugu ×1 |
| Rammu rammu Parishuddhaathmaa |  |  | malformed_telugu ×1 |
| Sadbhakthithoda saakshulai nithya vishraanthi |  |  | malformed_telugu ×1 |
| Sharanam Prabhuvaa |  |  | malformed_telugu ×2 |
| Silvayodhdha jerudhun beeda heenayandhudan |  |  | malformed_telugu ×1 |
| Sthuthiyu mahimayu neeke kshithikin dhivikin neethi |  |  | malformed_telugu ×1 |
| Ullasinchi paata paade paavuramaa mrudhu madhura sundara naareemanee |  |  | telugu_has_no_telugu ×1, english_has_no_latin ×1 |
| Vachchesthunnaadu Yesu Vachchesthunnaadu |  |  | malformed_telugu ×1 |
| Vishwaasa Veerulam |  |  | telugu_has_no_telugu ×1, english_has_no_latin ×1 |
| Viswaasa vanithalamu |  |  | telugu_has_no_telugu ×1, english_has_no_latin ×1 |
| Yesu needu jaalivalla |  |  | malformed_telugu ×1 |
| Yesu vibhuni dhalachi madilo |  |  | malformed_telugu ×1 |

## Already in the database — lyrics overlap — 6

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Naaku jeevamaiyunna naa jeevamaa | 14 | Naaku Jeevamai Unna | 0.91 body |
| Neeku ishtudigaa ilalo ne undaalani | 19 | Nuvvante Ishtamu Naa Yesayyaa | 0.92 body |
| Raare choothumu raajasuthudee | 10 | Raare Choothamu | 0.93 body |
| Sarva maanava paapa parihaaraarthamai doshivaa Prabhu | 25 | Doshivaa Prabhu | 1.00 body |
| Shuddha hrudayam kalugajeyumu | 14 | Shuddha Hrudayam | 0.95 body |
| Vaadabaarani vishwaasam - Kopaginchani vaathsalyam | 22 | Vaaduko Naa Yesayyaa | 0.99 body |

## Server refused — name ≥80% similar to an existing song — 6

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Jaagraththa jaagraththa Yesuditlu pilchun |  |  |  |
| Naa rakshakuni vembadinthu nannitan |  |  |  |
| Ne neevaadanai yundagoredhan |  |  |  |
| Neeve Naaku Chaalunu Yesu |  |  |  |
| Repu maapu gooda ramyamaina ginjal |  |  |  |
| Santhosha Sambaraaluro |  |  |  |

## Already in the database — opening line found inside it — 4

| Song | Lines | Matched | Score |
|---|---:|---|---|
| Devunike mahima yugayugamulaku kalugunu gaaka | 19 | Naa Naanna Intiki | 0.94 line / 0.90 body |
| Naakai Yesu kattenu sundharamu | 6 | Naakai Naa Yesu Kattenu | 1.00 line / 0.74 body |
| Ninne preminthunu ne venuthirugaa | 7 | Aadiyu Neeve Anthamu Neeve | 1.00 line / 0.71 body |
| Yesutho teevigaanu vedalanu | 15 | Yesutho Teevigaanu Podamaa | 1.00 line / 0.90 body |

---

# Why this gate is wrong — recommendations

Of the **703** songs rejected for "same opening line", only **11** have enough shared lyrics to actually be duplicates.

| Body overlap with the matched song | Songs | Reading |
|---|---:|---|
| ≥ 0.60 | 11 | genuine duplicates |
| 0.30 – 0.60 | 8 | grey |
| 0.15 – 0.30 | 384 | doubtful |
| < 0.15 | 300 | **almost certainly new songs, wrongly rejected** |

## Two faults

**1. Medleys poison the index.** A medley strings together many songs' opening lines, so any song whose first line appears in it matches. The songs most often blamed for a rejection, among those sharing under 30% of their lyrics:

| Matched against | Times blamed |
|---|---:|
| Christmas Mashup 5.0 | 52 |
| Nee Naamam Naa Gaanam | 33 |
| Yehovaa Naa Balamaa | 18 |
| Aanandamaanandame | 17 |
| Naalo Unna Aanandamu | 17 |
| Prabhuvaa Ee Aanandam | 15 |

**2. Containment saturates on short opening lines.** Checking whether one opening line is *contained in* another is needed — the two sources cut the first line at different points — but on a short line it matches on common Telugu syllables alone. `Prabhuvaa Prabhuvaa` is "contained in" much of the corpus.

## Worst examples

| Song rejected | Rejected against | First line | Body |
|---|---|---:|---:|
| Apu darchakaadhu luppongiri Prabhuni | Prabhuvaa Ee Aanandam | 0.93 | 0.07 |
| Aidu gaayamu londhinaavaa naakora | Gaayaamulan Gaayamulan | 0.94 | 0.08 |
| Choodaalani undi Yesuni cheraalani undi | Choodaalani Unnadi | 0.92 | 0.08 |
| Kalvariloni shreshtudaa | Raare Mana Yesu Swaamini | 0.95 | 0.08 |
| Laali laali laalamma laali | Laali Laali Jolaali | 0.95 | 0.08 |
| Paapini Krupa Joopavayyaa | Aparaadhini Yesayyaa | 0.93 | 0.08 |
| Prabhuvaa pampumaa nee shubhavarshamu | Prabhuvaa Prabhuvaa | 1.00 | 0.08 |
| Prabhuvuku thaginattu pruthivilo priyudaa padilamugaa jeevinchavaa | Prabhuvaa Ee Aanandam | 0.93 | 0.08 |
| Raajaadhi raajupai kireetamunchudi | Prabhuvaa Prabhuvaa | 1.00 | 0.08 |
| Yesu lechenu aadhivaaramuna | Mee Gnaapakaardhamugaa | 1.00 | 0.08 |

## Recommended gate

```
duplicate  IF  body_overlap >= 0.90
           OR (first_line_similarity >= 0.88  AND  body_overlap >= 0.55)

containment-based opening-line matches are ignored when one song is
more than 2x the length of the other  (this is what medleys break)
```

An opening line must never reject on its own. A duplicate that slips through is cheap to delete; a song wrongly rejected is invisible and stays missing.

**The 0.15–0.30 band is where the real judgement sits** — sample ~30 of those by hand before fixing the exact bar.

## Separately: the server's name check

`POST /songs` refuses any title ≥80% similar (Dice over character bigrams) to an existing one, with no reference to the lyrics at all. It rejected 6 songs here. It cannot tell two different songs apart and should be advisory, not blocking.
