// Phonetic Transliterations for Indian Regional Languages
// Enables clear, fluent speech synthesis across browsers and operating systems
// that lack native Indic voice packs (e.g. Google Chrome on Windows Desktop).

export const REGIONAL_PHONETICS = {
  // 1. RESPIRATORY PROTOCOL
  RESPIRATORY: {
    resp_001_greeting: {
      ml: (name) => `Namaskaram ${name}. Njan ningalude Sanjeevni care sahayi aanu. Innu shwaasam edukkaanum nenjinum enganeyundu? Dayavaayi parayoo.`,
      bn: (name) => `Nomoshkar ${name} babu. Ami apnar Sanjeevni care saathi. Aaj apnar phushphush ebong shwash-proshwash kemon lagchhe? Doya kore bolun.`,
      mr: (name) => `Namaste ${name} ji. Mee tumchi Sanjeevni care saathi ahe. Aaj tumchya chhatichi aani shwasachi tabyet kashi ahe? Krupaya sanga.`,
      te: (name) => `Namaskaram ${name} garu. Nenu mee Sanjeevni care sahayakurilini. Eeroju mee shwasa mariyu chhati ela undi? Dayachesi cheppandi.`,
      ta: (name) => `Vanakkam ${name} avargale. Naan ungal Sanjeevni paramarippu thozhi. Indru ungal swasam matrum nenju nilai eppadi ullathu? Thayavuseithu koorungal.`,
      gu: (name) => `Namaste ${name} bhai. Hoon aapni Sanjeevni care saathi chhun. Aaje tamara fefsaa ane shwasni tabiyat kevi chhe? Krupya janavo.`,
      kn: (name) => `Namaskara ${name} avare. Naanu nimma Sanjeevni care odanaadi. Indu nimma usiraata mathu edeya aarogya hegide? Dayavittu thilisi.`,
      pa: (name) => `Sat Sri Akal ${name} ji. Main tuhadi Sanjeevni care saathi haan. Aaj tuhadi saah ate chhati di tabiyat kivein hai? Kirpa karke dasso.`,
      or: (name) => `Namaskar ${name} aagyan. Mun aapankara Sanjeevni sahayak. Aaji aapanka shwasakriya ebong chhati kipari achhi? Dayakari kuhantu.`
    },
    resp_002_breathlessness: {
      ml: 'Ningalkku shwaasam edukkaan budhimuttundo, allenkil nadakkumbol shwaasam muttal anubhavappedunndo?',
      bn: 'Apnar ki shwash nite kono koshto hochhe, ba shamanyo hathahathi korlei shwashkoshto hochhe?',
      mr: 'Tumhala shwas ghenyas kahi traas hot ahe ka, kinva thode chalalyavarhi dhaap lagat ahe ka?',
      te: 'Meeku shwasa teesukovadamlo ibbandi unda, leda koddiga nadichinaa aayasam vastondaa?',
      ta: 'Ungalukku moochu viduvathil siramam ullatha, allathu sirithu nadakkumpothum moochiraikkiratha?',
      gu: 'Shu tamne shwas levama taklif thai rahi chhe, athva thodu chalva par pan shwas fooli rahyo chhe?',
      kn: 'Nimage usiraadalu thondareyaguthideya, athava swalpa nadadaru usirukattidanthaguthideya?',
      pa: 'Ki tuhanu saah lain vich koi takleef ho rahi hai, ya thoda turn te saah chadhda hai?',
      or: 'Aapanku nishwasa nebare kounasi asubidha heuchhi ki, kimba tikiye chalile shwasa chadhuchhi ki?'
    },
    resp_003_cough_phlegm: {
      ml: 'Chumayo, manjhayo pachhayo niramulla kafamo, allenkil shwaasamedukkumbol nenjuvenayo undo?',
      bn: 'Apnar ki kashi hochhe, kofer rong holud ba shobuj, ba shwash newar shomoy buke byatha hochhe?',
      mr: 'Tumhala khokla yet ahe ka, kafacha rang pivla kinva hirva ahe ka, kinva shwas ghetana chhatit dukhatahe ka?',
      te: 'Meeku daggu, pasupu leda aakupachha rangu kafam unda, leda shwasa teesukunetappudu chhatilo noppi unda?',
      ta: 'Ungalukku irumal, manjal allathu pachai nira sali, allathu moochu vidumpothu nenju vali ullatha?',
      gu: 'Shu tamne udhras aave chhe, kafno rang peelo ke leelo chhe, athva shwas leti vakhte chhatima dukhavo thaay chhe?',
      kn: 'Nimage kemmu ideya, kafada banna haladi athava hasiraagideya, athava usiraaduvaaga ede novu kaanisikolluthideya?',
      pa: 'Ki tuhanu khangh aa rahi hai, balgam peeli ya hari hai, ya saah lainde samay chhati vich dard ho riha hai?',
      or: 'Aapankara kasha heuchhi ki, kafa haladia kimba sabuja rangara achhi ki, kimba nishwasa nebabeli chhatire koshto heuchhi ki?'
    },
    resp_004_fever_vitals: {
      ml: 'Paniyo virayalo undo, innu pulse oximeter upayogichu oxygen alavu parishodhichittundo?',
      bn: 'Apnar ki jwar ba kanpuni onubhuto hochhe, ebong aaj ki pulse oximeter diye oxygen mepechhen?',
      mr: 'Tumhala taap kinva thandi vaajat ahe ka, aani tumhi aaj pulse oximeterne oxygen tapasla ahe ka?',
      te: 'Meeku jwaram leda vanukugaa anipistondaa, mariyu eeroju pulse oximeter tho oxygen check chesukunnaara?',
      ta: 'Ungalukku kaaichal allathu nadukkam ullatha, melum indru pulse oximeter moolam oxygen alavai parisothitheergala?',
      gu: 'Shu tamne taav ke dhrujaari anubhvaay chhe, ane aaje pulse oximeter thi oxygen check karyu chhe?',
      kn: 'Nimage jwara athava chali kaanisikondideya, mathu indu pulse oximeter ninda oxygen mattavannu pareekshisiddeera?',
      pa: 'Ki tuhanu bukhar ya kambani mehsoos ho rahi hai, ate ki aaj tusi oxygen level check kita hai?',
      or: 'Aapanku jwara kimba thanda anubhava heuchhi ki, ebong aaji aapana oxygen maapichhanti ki?'
    },
    resp_005_medication: {
      ml: 'Doctor nirdheshicha ella shwaasakosha marunnukalum antibioticsum innu krithyasamayathu kazhicho?',
      bn: 'Doctorer deoya shomosto antibiotic ebong shwasher oushodh ki aaj thik shomoyey kheyechhen?',
      mr: 'Doctoranni dileli sarva antibiotics aani shwasachi aushadhe aaj velevar ghetli ahet ka?',
      te: 'Doctor suchinchina anni antibiotics mariyu shwasa sambandhita mandulanu eeroju samayaaniki teesukunnaara?',
      ta: 'Maruthuvar parinthuraitha anaithu swasa marundhugalayum antibioticsayum indru sariyaana nerathil saapitteergala?',
      gu: 'Doctore lakhi aapel tamaam antibiotic ane shwasni davaao aaje samaysar leedhi chhe?',
      kn: 'Vaidyaru soochisida ella usiraatada aushadhigalannu mathu antibioticsannu indu samayakke sariyaagi thegedukondiddeera?',
      pa: 'Ki tusi aaj doctor wallon dittiyan saariyan antibiotic ate saah diyan davaiyan samay sir lai layian han?',
      or: 'Aaji daktar deithiba samasta antibiotic ebong shwasakriya aushadha samaya anusare khaichhanti ki?'
    },
    resp_006_closing: {
      ml: 'Nandi. Ningalude shwaasakosha aarogya vivarangal rekhapeduthi doctorkkum aarogya sanghathinum ayachittundu. Dayavaayi vishramikku.',
      bn: 'Dhanyobad. Apnar shwash o phushphusher shomosto tothyo lipiboddho kora hoyechhe ebong doctor ke pathano hoyechhe. Doya kore bishram nin.',
      mr: 'Dhanyavaad. Tumchya shwas aani fuffusanchi sampoorna mahiti nondavli asun doctoranna pathavnyat aali ahe. Krupaya vishranti ghyaa.',
      te: 'Dhanyavaadaalu. Mee shwaasakosha aarogya vivaraalu namodayyaayi mariyu vaidya brundaaniki pampabaddaayi. Dayachesi vishraanti theesukondi.',
      ta: 'Nandri. Ungal swasa aarokkiya thagavalgal pathivu seiyappattu maruthuva kuzhuvirku anuppappattullathu. Thayavuseithu oyvedukkavum.',
      gu: 'Aabhar. Tamara shwas ane fefsaani tamaam maahiti nondhine doctorne mokli devaai chhe. Krupya aaram karo.',
      kn: 'Dhanyavaadagalu. Nimma usiraatada aarogya maahitiyannu daakhalisalaagide mathu vaidyarige kaluhisalaagide. Dayavittu vishraanthi padeyiri.',
      pa: 'Dhanvaad. Tuhadi saah ate fefariyan di jaankari darj kar layi gayi hai ate doctor nu bhej ditti gayi hai. Kirpa karke aaraam karo ji.',
      or: 'Dhanyabad. Aapanka shwasakriyara samasta bibarani record hoichhi ebong daktaranku pathajaaichhi. Dayakari bishrama niantu.'
    }
  },

  // 2. CARDIAC PROTOCOL
  CARDIAC: {
    card_001_greeting: {
      ml: (name) => `Namaskaram ${name}. Njan ningalude Sanjeevni care sahayi aanu. Innu hrudayaarogyavum shareeravum engane thonnunnu? Dayavaayi parayoo.`,
      bn: (name) => `Nomoshkar ${name} babu. Aaj apnar hridjantro ebong shorir kemon lagchhe? Doya kore bolun.`,
      mr: (name) => `Namaste ${name} ji. Aaj tumchya hrudayachi aani sharirachi tabyet kashi vaatat ahe? Krupaya sanga.`,
      te: (name) => `Namaskaram ${name} garu. Eeroju mee gunde mariyu shareera shakti ela undi? Dayachesi cheppandi.`,
      ta: (name) => `Vanakkam ${name}. Indru ungal idhaya nalam matrum udol aatral eppadi ullathu? Thayavuseithu sollungal.`,
      gu: (name) => `Namaste ${name} ji. Aaje tamara hruday ane swasthya ni tabiyat kevi laage chhe? Krupya janavo.`,
      kn: (name) => `Namaskara ${name} avare. Indu nimma hrudayada aarogya mathu chaithanya hegide? Dayavittu thilisi.`,
      pa: (name) => `Sat Sri Akal ${name} ji. Aaj tuhade dil ate sareer di tabiyat kivein hai? Dasso ji.`,
      or: (name) => `Namaskar ${name} aagyan. Aaji aapanka hrudaya ebong shareera kipari achhi? Kuhantu.`
    },
    card_002_edema: {
      ml: 'Innu ningalude kaalukalilo kanankaalukalilo paadangalilo neero bhaaramo anubhavappetto?',
      bn: 'Aaj ki apnar duti pa, godali ba payer paatay kono folabhav ba bhaari laaga lokkhyo korechhen?',
      mr: 'Aaj tumchya donhi payanvar kinva ghotyanvar kahi sooj kinva jadhpana jaanavla ka?',
      te: 'Eeroju mee kaallu, paadaalu leda cheelamandalaallo edaina vaapu leda baruvugaa anipinchindaa?',
      ta: 'Indru ungal kaalgal, kanukkaal allathu paadangalil veekkam allathu baaram etheanum ullatha?',
      gu: 'Shu aaje tamara pag ke ghoontima koi sojo ke bhaarepanu dekhayu chhe?',
      kn: 'Indu nimma paadagalalli, kanakaalugalalli athava kaalugalalli enaadaru ootha athava bhaara anisideya?',
      pa: 'Ki aaj tusi aapne pairan ya gittiyan vich koi soj ya bhaareepan mehsoos kita hai?',
      or: 'Aaji aapanka paada kimba goithire kounasi phula kimba bhaaripana dekhichhanti ki?'
    },
    card_003_orthopnea: {
      ml: 'Kidakkaiyil nere kidakkumbol shwaasathadassam anubhavappedara undo, allenkil urangaan adhika thalayinakala vekkendi varaarundo?',
      bn: 'Bichhanay shoja shuye thakle ki shwashkoshto hoy, ba ghumanor jonyo baarthi balisher proyojon hoy?',
      mr: 'Zhoptaana saral zhoplyavar shwas ghenyas traas hoto ka, kinva jaast ushi vapravi lagte ka?',
      te: 'Padukunnappudu shwasa teesukovadam kashtangaa untundaa, leda nidrincha daaniki ekkuva dindlu vaadutunnaara?',
      ta: 'Padukkaiyil neraagap padukkumpothu moochu thinaral erpadugiratha, allathu thoonga kooduthal thalayanai thevaiya?',
      gu: 'Shu patharima seedha sooti vakhte shwas levama takleef thaay chhe, ke vadhu oshika rakhva pade chhe?',
      kn: 'Malagidaga usiraata kashtavaaguthadeya, athava sulabhavaagi usiraadalu hechu dimbugalu bekaaguthaveya?',
      pa: 'Ki sidha letan te saah lain vich aukh hundi hai, ya saun layi vaddh sirhane vartne painde han?',
      or: 'Shoiba samayare nishwasa nebare koshto heuchhi ki, adhika takia darkar paduchhi ki?'
    },
    card_004_vitals_palpitation: {
      ml: 'Nenjil bhaaramo, vegathilulla hrudayamidippo, thalakarakkamo undo, BP parishodhichirunno?',
      bn: 'Buke bhaaribhav, druto hridspondon ba matha ghora achhe ki, ebong roktachaap mepechhen ki?',
      mr: 'Chhatit jadhpana, dhad-dhad kinva chakkar yet ahe ka, aani BP tapasla ahe ka?',
      te: 'Chhaatilo baruvugaa, gunde dadagaa leda thalatirugutunnatlu undaa, mariyu BP choosukunnaara?',
      ta: 'Nenju baaram, vegamaana idhaya thudippu allathu thalaichuttral ullatha, blood pressure paartheergala?',
      gu: 'Chhaatima bhaarepanu, dhabkaara jhadpi thava ke chakkar aave chhe, ane blood pressure check karyu?',
      kn: 'Ede bhaara, vegada hrudaya baditha athava thalethiruguvike ideya, mathu blood pressure pareekshisiddeera?',
      pa: 'Ki chhati vich bhaarapan, dil di dhadkan tez ya chakkar aa rahe han, ate BP check kita hai?',
      or: 'Chhaatire bhaaripana, hrudspandana badhiba ba munda bulayiba heuchhi ki, ebong BP maapichhanti ki?'
    },
    card_005_medication_fluids: {
      ml: 'Doctor paranja prakaaram moothram pokaanulla marunnukalum BP marunnukalum kazhicho, vellam kudikkunnathu niyanthrrikkunnundo?',
      bn: 'Pressure o mutrabardhok oushodh shomoymoto kheyechhen to, ebong jol paaner porimaap mene cholchhen?',
      mr: 'Laghvi vaadhavnari aani BP chi sarva aushadhe velevar ghetli ahet ka, aani panyache pramaan maryadit thevle ahe ka?',
      te: 'BP mariyu gunde sambandhita mandulanu saraina samayaaniki vesukunnaara, mariyu neeti parimithini paatistunnaara?',
      ta: 'Idhaya matrum blood pressure marundhugalaich sariyaana nerathil saapitteergala, thanneer alavai kattuppaduthugeergala?',
      gu: 'BP ane hrudayni badhi davaao samaysar leedhi chhe, ane paani mapsar peevo chho?',
      kn: 'Hrudaya mathu blood pressure na ella maathregalannu samayakke thegedukondiddeera, mathu neeru kudiyuvudannu niyanthrisutthiddeera?',
      pa: 'Ki tusi BP ate dil diyan davaiyan samay sir lai layian han, ate paani seemat rakhya hai?',
      or: 'Hrudroga ebong BP aushadha thik samayare khaichhanti ki, ebong paani maapi piuchhanti ki?'
    },
    card_006_closing: {
      ml: 'Nandi. Ningalude hrudayaarogya vivarangalum neerinte vivarangalum rekhapeduthi doctorkku kaimaari. Dayavaayi vishramikku.',
      bn: 'Dhanyobad. Apnar hridjantro o shasther khobor doctorer kachhe pouchhe deoya hoyechhe. Bishram nin.',
      mr: 'Dhanyavaad. Tumchya hruday swasthyachi mahiti nondavli asun medical teamla pathavli ahe. Vishranti ghyaa.',
      te: 'Dhanyavaadaalu. Mee gunde aarogya vivaraalu doctor ku cheraveyabaddaayi. Vishraanti theesukondi.',
      ta: 'Nandri. Ungal idhaya nalam kuritha thagavalgal maruthuvarukku anuppappattullana. Nimmadhiyaaga oyvedukkavum.',
      gu: 'Aabhar. Tamaari hruday sambandhit vigato doctorne mokli devama aavi chhe. Aaram karo.',
      kn: 'Dhanyavaadagalu. Nimma hrudayada aarogyada vivarangalannu vaidyarige kaluhisalaagide. Vishraanthi padeyiri.',
      pa: 'Dhanvaad. Tuhadi sehat di jaankari doctor nu bhej ditti gayi hai. Aaraam karo ji.',
      or: 'Dhanyabad. Aapanka hrudayara swasthya bibarani daktaranka paakhaku pathajaaichhi. Aaraam karantu.'
    }
  },

  // 3. POST SURGICAL PROTOCOL
  POST_SURGICAL: {
    surg_001_greeting: {
      ml: (name) => `Namaskaram ${name}. Shasthrakriyakk sesham innu ksheenavum aarogyavum enganeyundu? Dayavaayi parayoo.`,
      bn: (name) => `Nomoshkar ${name} babu. Operation-er por aaj apnar shorir o shakti kemon lagchhe? Bolun.`,
      mr: (name) => `Namaste ${name} ji. Shastrakriyenantar aaj tumchi tabyet aani urja kashi vaatat ahe?`,
      te: (name) => `Namaskaram ${name} garu. Operation tarvaata eeroju mee aarogyam ela anipistondi?`,
      ta: (name) => `Vanakkam ${name}. Aruvaisigichaikkup pin indru ungal udalnalam matrum balam eppadi ullathu?`,
      gu: (name) => `Namaste ${name} bhai. Surgery pachhi aaje tamari shakti ane tabiyat kevi chhe?`,
      kn: (name) => `Namaskara ${name} avare. Shastrachikithseya nanthara indu nimma chetharike mathu shakti hegide?`,
      pa: (name) => `Sat Sri Akal ${name} ji. Surgery ton baad aaj tuhadi sehat kivein hai?`,
      or: (name) => `Namaskar ${name} aagyan. Operation pare aaji aapanka swasthya kipari laaguchhi?`
    },
    surg_002_incision_pain: {
      ml: 'Shasthrakriya cheytha bhaagatho thunnalilo kadhinamaaya vedanayo, chuvappo, veekkamo, pazhuppo kaanunnundo?',
      bn: 'Ostrpochharer khote ba shelaiyer jaygay ki khub byatha, laalche bhaav ba punj ber hochhe?',
      mr: 'Taankyaanchya thikaani teevra vedna, laalsarpana, sooj kinva poo nighat ahe ka?',
      te: 'Kutla vadda vipareetamaina noppi, erupudanam, vaapu leda cheemu kaarutunnatlu undaa?',
      ta: 'Aruvaisigichai seitha thaiyalil kadumaiyana vali, sivathal, veekkam allathu seezh kasigiratha?',
      gu: 'Taankaani jagyaaye sakhat dukhavo, laalaash, sojo ke paru nikle chhe?',
      kn: 'Shastrachikithseya holigeya jaagadalli theevra novu, kempaguvudu, ootha athava keevu barutthideya?',
      pa: 'Ki tankiyan wali thaan te bahut dard, laali, soj ya peek nikal rahi hai?',
      or: 'Operation silei jaagare prabala jantrana, laal padiba, phuliba kimba pooja baaharuchhi ki?'
    },
    surg_003_fever: {
      ml: 'Virayalodeyulla paniyo, shareerathil amithamaaya choodo anubhavappedunndo?',
      bn: 'Apnar ki kanpuni diye jwar aaschhe ba shorir khub gorom lagchhe?',
      mr: 'Tumhala thandi vaajun taap yet ahe ka, kinva anga garam laagat ahe ka?',
      te: 'Chalitho koodina jwaram vastondaa, leda shareeram vedigaa undaa?',
      ta: 'Nadukkathudan kaaichal ullatha, allathu udal adhikaramaaga soodaaga unargiratha?',
      gu: 'Dhrujaari saathe taav aave chhe, ke shareer khoob garam laage chhe?',
      kn: 'Chali jwara kaanisikondideya, athava mai thoomba bisiyagideya?',
      pa: 'Ki kambani naal bukhar chadh riha hai, ya sareer garam lagg riha hai?',
      or: 'Thariki jwara aaschhi kimba deha gorom laaguchhi ki?'
    },
    surg_004_diet_bowel: {
      ml: 'Laghubhakshanam kazhikkaan kazhiyunnundo, chhardhiyo okkaanamo undo, malavisarjanam shariyaayi nadakkunnundo?',
      bn: 'Halka khabaar khete paarchhen to, bomi bhaav ba peter kono shomosya achhe ki?',
      mr: 'Halke jevan gheu shakat aahat ka, ulti kinva malmal hot nahi na, aani pot saaf hot ahe ka?',
      te: 'Telikapooti aahaaram tinagalugutunnaara, vaantulu leda vikaaram undaa, mariyu virechanaalu maamulugane unnaaya?',
      ta: 'Menmaiyaana unavu saapida mudigiratha, vaanthi allathu kumattal ullatha, malam sariyaaga pogiratha?',
      gu: 'Halvo khorak khai shako chho, ulti ke ubka nathi thata ne, ane pet saaf aave chhe?',
      kn: 'Mruduvaada aahara sevisalu saadhyavaaguthideya, vaanthi athava vaakarike ideya, mathu malavisarjane sariyaagideya?',
      pa: 'Ki tusi halka khana khaa rahe ho, ulti taan nahi aa rahi, ate pet saaf ho riha hai?',
      or: 'Haaluka khadya khaaiparuchhanti ki, baanti heuchhi ki, ebong jhoda thik re pariskara heuchhi ki?'
    },
    surg_005_medication: {
      ml: 'Doctor nirdheshicha vedana samana marunnukalum antibioticsum innu samayathinu kazhicho?',
      bn: 'Doctorer deoya byathar oushodh ebong antibiotic ki thik shomoyey kheyechhen?',
      mr: 'Vednashamak aani antibiotic aushadhe velevar ghetli ahet ka?',
      te: 'Noppi tagge mandulu mariyu antibiotics samayaaniki teesukunnaara?',
      ta: 'Vali nivarani marundhugala mathum antibioticsayum sariyaana nerathil saapitteergala?',
      gu: 'Dukhavaani ane antibiotic davaao aaje samaysar leedhi chhe?',
      kn: 'Novu nivaaraka mathu antibiotic maathregalannu samayakke thegedukondiddeera?',
      pa: 'Ki dard diyan te antibiotic davaiyan samay sir lai layian han?',
      or: 'Jantrana shamana aushadha ebong antibiotic samay anusare khaichhanti ki?'
    },
    surg_006_closing: {
      ml: 'Nandi. Shasthrakriyakk seshamulla ningalude sughavivaram rekhapeduthi doctorkku ayachittundu. Dayavaayi vishramikku.',
      bn: 'Dhanyobad. Apnar shorirer khobor ebong shelaiyer tothyo doctor ke jaanaano hoyechhe. Bishram nin.',
      mr: 'Dhanyavaad. Operation-nantarchi tumchi mahiti doctorkade pathavli ahe. Aaraam kara.',
      te: 'Dhanyavaadaalu. Mee operation targaathi aarogya vivaraalu doctor ku pampabaddaayi. Vishraanti theesukondi.',
      ta: 'Nandri. Ungal suvaasthiye thagavalgal maruthuva kuzhuvukku anuppappattullana. Oyvedukkavum.',
      gu: 'Aabhar. Surgery pachhini vigato doctorne mokli aapi chhe. Aaram karo.',
      kn: 'Dhanyavaadagalu. Shastrachikithseya nantharada vivarangalannu vaidyarige kaluhisalaagide. Vishraanthi thagolli.',
      pa: 'Dhanvaad. Tuhadi recovery di report doctor nu bhej ditti gayi hai. Aaraam karo.',
      or: 'Dhanyabad. Aapanka operation parara samasta bibarani daktaranku pathajaaichhi. Aaraam karantu.'
    }
  },

  // 4. METABOLIC RENAL PROTOCOL
  METABOLIC_RENAL: {
    meta_001_greeting: {
      ml: (name) => `Namaskaram ${name}. Njan ningalude Sanjeevni care sahayi aanu. Innu pramehavum shareera shakthiyum enganeyundu? Dayavaayi parayoo.`,
      bn: (name) => `Nomoshkar ${name} babu. Aaj apnar diabetes o shareerik shakti kemon lagchhe? Bolun.`,
      mr: (name) => `Namaste ${name} ji. Aaj madhumeh aani sharirachi urja kashi vaatat ahe?`,
      te: (name) => `Namaskaram ${name} garu. Eeroju mee sugar mariyu shareera balam ela undi?`,
      ta: (name) => `Vanakkam ${name}. Indru ungal sakkarai noi matrum udal balam eppadi ullathu?`,
      gu: (name) => `Namaste ${name} ji. Aaje tamari sugar ane sharirni shakti kevi chhe?`,
      kn: (name) => `Namaskara ${name} avare. Indu nimma madhumeha mathu shaareerika shakti hegide?`,
      pa: (name) => `Sat Sri Akal ${name} ji. Aaj tuhadi sugar ate sareer di taqat kivein hai?`,
      or: (name) => `Namaskar ${name} aagyan. Aaji aapanka madhumeha ebong shareerara shakti kipari achhi?`
    },
    meta_002_hypoglycemia_dizziness: {
      ml: 'Thalakarakkamo, kannirulalo, virayalo, athikamaaya viyarppo dahamo anubhavappedunndo?',
      bn: 'Matha ghora, chokhe ondho dekhano, kanpuni, ba khub beshi ghaam ba trishna hochhe ki?',
      mr: 'Chakkar yene, dolyansamor andhari, kapkapane, kinva khoob ghaam yet ahe ka?',
      te: 'Thalatiragadam, kallu thiragadam, vanuku, athigaa chemata pattadam leda daaham vestondaa?',
      ta: 'Thalaichuttral, kan manguthal, nadukkam, athiga vervai allathu thaagam ullatha?',
      gu: 'Chakkar aavva, aankhe andhari, dhrujaari, athva khoob pasino ke taras laage chhe?',
      kn: 'Thalethiruguvike, kannu kattuvike, nadukki, athi bevaru athava baayike kaanisidheya?',
      pa: 'Ki chakkar aana, akkhiyan agge hanera, kambani, ya bahut paseena aunda hai?',
      or: 'Munda bulayiba, aakhi aagare andhakar, thariba, ba adhika ghamo laguchhi ki?'
    },
    meta_003_feet_wounds: {
      ml: 'Kaalukalilo paadangalilo puthiya murivukalo, kopalukalo, thalarcha-yo veekkamo kanditto?',
      bn: 'Paye ba payer thalay kono notun gha, foshka, obosh bhaav ba fola lokkhyo korechhen?',
      mr: 'Payaanchya talvyat kahi nava ghaav, foda, badhirpana kinva sooj diste ka?',
      te: 'Kaallalo leda arurkaallalo edaina kotha gaayam, fola, chithukudu leda vaapu chusaara?',
      ta: 'Kaalgalil allathu paadangalil puthiya kaayam, kothalikkum koppulam, maraththe poval ullatha?',
      gu: 'Pagma ke taliyama koi navo ghaav, chaala, sunnpano ke sojo jovayo chhe?',
      kn: 'Paadagalalli yaavudaadaru hosa gaya, gulle, spandana illadiruvike athava ootha kandibanthiteya?',
      pa: 'Ki pairan vich koi nawa jakhama, chhala, sunnpana ya soj vekhi hai?',
      or: 'Paadare kounasi nua ghaa, foshka, sunnpana kimba phula dekhichhanti ki?'
    },
    meta_004_vitals_urination: {
      ml: 'Moothram ozhikkunnathil enthenkilum maattamo, innu blood sugar-o BP-yo parishodhicho?',
      bn: 'Prosraver porimaane kono poriborton achhe ki, ebong aaj ki blood sugar ba BP mepechhen?',
      mr: 'Laghvichya pramaanat kahi badal ahe ka, aani aaj blood sugar kinva BP tapasli ka?',
      te: 'Moothram raavadamlo edaina maarpu unda, mariyu eeroju blood sugar leda BP check chesaara?',
      ta: 'Siruneer alavil etheanum maatram ullatha, indru blood sugar matrum BP paartheergala?',
      gu: 'Peshanni matrama koi ferfaar chhe, ane aaje blood sugar ke BP check karyu?',
      kn: 'Moothrada pramaanadalli enaadaroo badalavane ideya, mathu indu blood sugar athava BP thapasiddeera?',
      pa: 'Ki peshab di matra vich koi badlao hai, ate aaj tusi blood sugar ya BP check kita hai?',
      or: 'Peshbare kounasi paribartana heuchhi ki, ebong aaji blood sugar kimba BP maapichhanti ki?'
    },
    meta_005_medication: {
      ml: 'Insulin-o doctor nirdheshicha sugar-ntheyum BP-yudeyum marunnukalo samayathinu kazhicho?',
      bn: 'Insulin ba doctorer deoya sugar o BP-r oushodh shomoymoto kheyechhen to?',
      mr: 'Insulin kinva doctoranni dileli sugar aani BP chi aushadhe velevar ghetli ahet ka?',
      te: 'Insulin leda doctor suchinchina sugar mariyu BP mandulu samayaaniki teesukunnaara?',
      ta: 'Insulin allathu maruthuvar thantha sakkarai matrum BP marundhugala sariyaana nerathil saapitteergala?',
      gu: 'Insulin ke doctore aapele sugar ane BP ni davaao samaysar leedhi chhe?',
      kn: 'Insulin athava vaidyaru kottiruva sugar mathu BP maathregalannu samayakke thegedukondiddeera?',
      pa: 'Ki insulin ya doctor diyan sugar ate BP diyan davaiyan samay sir lai layian han?',
      or: 'Insulin kimba daktar deithiba sugar ebong BP aushadha samay anusare khaichhanti ki?'
    },
    meta_006_closing: {
      ml: 'Nandi. Ningalude sugar-ntheyum aarogyathinteyum vivarangal rekhapeduthi doctorkku ayachittundu. Dayavaayi aahaaram shradhikku.',
      bn: 'Dhanyobad. Apnar sugar o shasther tothyo doctor ke jaanaano hoyechhe. Niyom-mene khabar khan.',
      mr: 'Dhanyavaad. Tumchya sugar aani tabyeet chi mahiti doctorkade pathavli ahe. Aahar sambhalga.',
      te: 'Dhanyavaadaalu. Mee sugar mariyu aarogya vivaraalu doctor ku pampabaddaayi. Thaginatlu aahaaram theesukondi.',
      ta: 'Nandri. Ungal sakkarai matrum udalnalath thagavalgal maruthuva kuzhuvukku anuppappattullana. Unavil gavanamaaga irukkavum.',
      gu: 'Aabhar. Tamari sugar ane swasthya ni mahiti doctorne mokli devaai chhe. Samay par khorak lejo.',
      kn: 'Dhanyavaadagalu. Nimma sugar mathu aarogya vivarangalannu vaidyarige kaluhisalaagide. Sariyaada aahaara sevisi.',
      pa: 'Dhanvaad. Tuhadi sugar ate sehat di jaankari doctor nu bhej ditti gayi hai. Samay sir aahaar lo.',
      or: 'Dhanyabad. Aapanka sugar ebong swasthya bibarani daktaranku pathajaaichhi. Thik samayare aahara grahana karantu.'
    }
  },

  // 5. GENERAL PROTOCOL
  GENERAL: {
    gen_001_greeting: {
      ml: (name) => `Namaskaram ${name}. Njan ningalude Sanjeevni care sahayi aanu. Aashupathriyil ninnum vitta sesham innu tabyet enganeyundu? Dayavaayi parayoo.`,
      bn: (name) => `Nomoshkar ${name} babu. Ami apnar Sanjeevni care saathi. Aaj aspatal theke chhutir por apnar shorir kemon lagchhe? Bolun.`,
      mr: (name) => `Namaste ${name} ji. Mee tumchi Sanjeevni care saathi ahe. Aaj dawakhanyatun sutlyavar tumchi tabyet kashi ahe? Sanga.`,
      te: (name) => `Namaskaram ${name} garu. Nenu mee Sanjeevni care sahayakurilini. Hospital nunchi discharge ayyaka eeroju mee tabyet ela undi? Cheppandi.`,
      ta: (name) => `Vanakkam ${name}. Naan ungal Sanjeevni paramarippu thozhi. Maruthuvamanayilirundhu viduthalaiaana pin indru udalnalam eppadi ullathu? Sollungal.`,
      gu: (name) => `Namaste ${name} ji. Hoon aapni Sanjeevni care saathi chhun. Hospital maathi chhutti pachhi aaje tabiyat kevi chhe? Janavo.`,
      kn: (name) => `Namaskara ${name} avare. Naanu nimma Sanjeevni care odanaadi. Aaspathriyinda discharge aada mele indu nimma aarogya hegide? Thilisi.`,
      pa: (name) => `Sat Sri Akal ${name} ji. Main tuhadi Sanjeevni care saathi haan. Hospital ton chhutti baad aaj tabyet kivein hai? Dasso.`,
      or: (name) => `Namaskar ${name} aagyan. Mun aapankara Sanjeevni sahayak. Hospital ru chhutti pare aaji tabyet kipari achhi? Kuhantu.`
    },
    gen_002_breathlessness: {
      ml: 'Ningalkku shwaasam edukkaan enthenkilum budhimutto, nenjil thadassamo thonnunno?',
      bn: 'Apnar ki shwash nite kono koshto, ba buke kono chaap anubhob hochhe?',
      mr: 'Tumhala shwas ghenyas kahi traas hot ahe ka, kinva shwas fooltoy ka?',
      te: 'Meeku shwasa teesukovadamlo edaina kashtangaa unda, leda aayasam vastonda?',
      ta: 'Ungalukku moochu viduvathil etheanum siramam, moochu thinaral ullatha?',
      gu: 'Shu tamne shwas levama koi takleef thai rahi chhe, ke shwas fooli rahyo chhe?',
      kn: 'Nimage usiraadalu yaavudaadaru thondare ideya, usiru bisi aaguthideya?',
      pa: 'Ki tuhanu saah lain vich koi takleef hai, ya saah chadhda hai?',
      or: 'Aapanku nishwasa nebare kounasi asubidha heuchhi ki, kimba shwasa fooluchhi ki?'
    },
    gen_003_fever_pain: {
      ml: 'Paniyo, shareerathil kadhinamaaya vedanayo, puthiya vishamamangalo undo?',
      bn: 'Apnar ki jwar, shorire teebro byatha, ba notun kono shomosya hochhe?',
      mr: 'Tumhala taap, sharirat teevra vedna, kinva kahi navi sharirik takleef ahe ka?',
      te: 'Jwaram, shareeramlo theevramaina noppi, leda edaina kotha ibbandi unda?',
      ta: 'Kaaichal, udalil theevra vali, allathu puthiya vishamam etheanum ullatha?',
      gu: 'Tamne taav, sharirma teevra dukhavo, ke koi navi takleef anubhavey chhe?',
      kn: 'Jwara, shareeradalli theevra novu, athava hosa thondare kaaniskolluthideya?',
      pa: 'Ki bukhar, sareer vich tez dard, ya koi nawi takleef hai?',
      or: 'Jwara, shareerare theevra jantrana, kimba nua asubidha heuchhi ki?'
    },
    gen_004_worsening: {
      ml: 'Ee thalarchayo vishamamo innale kandalum kooduthalaano?',
      bn: 'Ei koshto ba durbolota ki gotokaaler cheye beshi berechhe?',
      mr: 'Hi takleef kinva ashaktpana kaalachya maanaane jaast vaadhla ahe ka?',
      te: 'Ee aayasam leda neerasam ninna thoti polisthe perigindaa?',
      ta: 'Intha vishamam allathu sorvu netraivida adhigamaagi ullatha?',
      gu: 'Aa takleef ke ashakti kaal karta vadhu vadhi gayi chhe?',
      kn: 'Ee thondare athava nirasathana ninneginta hechhaagideya?',
      pa: 'Ki eh takleef ya kamzori kal naaloon vadhi hai?',
      or: 'Ehi asubidha kimba durbalata kaali apekhya badhichhi ki?'
    },
    gen_005_medication: {
      ml: 'Innu doctor nirdheshicha ella marunnukalum krithyasamayathu kazhicho?',
      bn: 'Aaj ki doctorer deoya shomosto oushodh shomoymoto kheyechhen?',
      mr: 'Aaj doctoranni dileli sarva aushadhe velevar ghetli ahet ka?',
      te: 'Eeroju doctor suchinchina anni mandulanu samayaaniki teesukunnaara?',
      ta: 'Indru maruthuvar parinthuraitha anaithu marundhugala sariyaana nerathil saapitteergala?',
      gu: 'Aaje doctore lakhi aapelee badhi davaao samaysar leedhi chhe?',
      kn: 'Indu vaidyaru soochisida ella aushadhigalannu samayakke thegedukondiddeera?',
      pa: 'Ki aaj doctor diyan dittiyan saariyan davaiyan samay sir lai layian han?',
      or: 'Aaji daktar deithiba samasta aushadha samay anusare khaichhanti ki?'
    },
    gen_006_closing: {
      ml: 'Nandi. Ningalude ella aarogya vivarangalum rekhapeduthi doctor sanghathinu ayachittundu. Dayavaayi vishramikku.',
      bn: 'Dhanyobad. Apnar shasther tothyo doctor o clinical team ke jaanaano hoyechhe. Bishram nin.',
      mr: 'Dhanyavaad. Tumchi arogya mahiti doctor aani clinical teamkade pathavli ahe. Vishranti ghyaa.',
      te: 'Dhanyavaadaalu. Mee aarogya vivaraalu doctor mariyu medical team ku pampabaddaayi. Vishraanti theesukondi.',
      ta: 'Nandri. Ungal udalnalath thagavalgal maruthuva kuzhuvukku anuppappattullana. Oyvedukkavum.',
      gu: 'Aabhar. Tamari swasthya mahiti doctor ane medical teamne mokli devaai chhe. Aaram karo.',
      kn: 'Dhanyavaadagalu. Nimma aarogya vivarangalannu vaidyarige kaluhisalaagide. Vishraanthi padeyiri.',
      pa: 'Dhanvaad. Tuhadi sehat di jaankari doctor ate health team nu bhej ditti gayi hai. Aaraam karo.',
      or: 'Dhanyabad. Aapanka swasthya bibarani daktar ebong medical team ku pathajaaichhi. Aaraam karantu.'
    }
  }
};

/**
 * Returns phonetic transliteration for a given clinical question and regional language
 */
export const getRegionalPhoneticText = (category, questionId, langCode, patientName = 'मरीज') => {
  const protocol = REGIONAL_PHONETICS[category] || REGIONAL_PHONETICS.GENERAL;
  if (!protocol) return null;
  const item = protocol[questionId];
  if (!item) return null;
  const val = item[langCode];
  if (!val) return null;
  if (typeof val === 'function') {
    return val(patientName);
  }
  return val;
};
