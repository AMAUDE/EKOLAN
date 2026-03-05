// Localités ayant au moins une mairie (source: liste.csv)
const listeLocalites = [
  "Abengourou", "Adzopé", "Akoupé", "Assinie", "Azaguié", "Béoumi", "Bloléquin", "Boniérédougou", "Botro", "Brobo",
  "Daloa", "Diawala", "Dioulatiédougou", "Doropo", "Ferkessédougou", "Gbeleban", "Goulia", "Grand-Zattry", "Guintéguéla",
  "Kanakono", "Katiola", "Kongasso", "Kouassi-Kouassikro", "Kounahiri", "M'batto", "Mankono", "Minignan", "Niablé", "Ouangolodougou",
  "Plateau", "Sakassou", "Sarhala", "Séguelon", "Sinfra", "Taabo", "Téhini", "Tiébissou", "Tioroniaradougou", "Transua",
  "Yamoussoukro", "Zuénoula", "Abobo", "Afféry", "Alépé", "Assuéffry", "Bako", "Béttié", "Bocanda", "Bonon",
  "Bouaflé", "Buyo", "Danané", "Didiévi", "Divo", "Dualla", "Foumbolo", "Gboguhé", "Grabo", "Guéyo",
  "Guitry", "Kani", "Kokoumbo", "Koonan", "Kouibly", "Kouto", "M'bengué", "Marcory", "Morondo", "Niakaramandougou",
  "Ouaninou", "Port-bouët", "Samatiguila", "Sassandra", "Seydougou", "Sipilou", "Tabou", "Tengréla", "Tiémé", "Tortiya",
  "Treichville", "Yopougon", "Aboisso", "Agboville", "Anoumaba", "Attécoubé", "Bangolo", "Biankouma", "Bodokro", "Bonoua",
  "Bouaké", "Cocody", "Daoukro", "Diégonéfla", "Djebonoua", "Duékoué", "Fresco", "Gbon", "Grand-Bassam", "Guibéroua",
  "Hiré", "Kaniasso", "Kolia", "Korhogo", "Koumassi", "Lakota", "Madinani", "Massala", "N'douci", "Niéllé",
  "Ouellé", "Prikro", "San Pedro", "Satama-Sokoro", "Sifié", "Sirasso", "Tafiré", "Tiapoum", "Tiémélékro", "Touba",
  "Vavoua", "Zikisso", "Adiaké", "Agnibilékrou", "Anyama", "Attiegouakro", "Bassawa", "Bin-Houyé", "Bondoukou", "Booko",
  "Bouna", "Dabakala", "Diabo", "Dikodougou", "Djèkanou", "Ettrokro", "Fronan", "Gbonné", "Grand-Béréby", "Guiembé",
  "Issia", "Karakoro", "Komborodougou", "Koro", "Koumbala", "Logoualé", "Maféré", "Mayo", "Napié", "Niofoin",
  "Oumé", "Rubino", "Sandégué", "Satama-Sokoura", "Sikensi", "Songon", "Taï", "Tiassalé", "Tiéningboué", "Toulépleu",
  "Worofla", "Zouan-Hounien", "Adjamé", "Agou", "Arrah", "Ayamé", "Bédiala", "Bingerville", "Bongouanou", "Borotou",
  "Boundiali", "Dabou", "Dianra", "Dimbokro", "Djibrosso", "Facobly", "Gagnoa", "Gohitafla", "Grand-Lahou", "Guiglo",
  "Jacqueville", "Kasséré", "Kong", "Kouassi-Datékro", "Koun-Fao", "M'bahiakro", "Man", "Méagui", "Nassian", "Odienné",
  "Ouragahio", "Saïoua", "Sangouiné", "Séguéla", "Sinématiali", "Soubré", "Tanda", "Tie-n'diekro", "Tienko", "Toumodi",
  "Yakassé-Attobrou", "Zoukougbeu"
];
