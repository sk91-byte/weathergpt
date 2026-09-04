class AppLanguage {
  const AppLanguage(this.code, this.englishName, this.nativeName);
  final String code;
  final String englishName;
  final String nativeName;
}

const appLanguages = <AppLanguage>[
  AppLanguage('en', 'English', 'English'), AppLanguage('as', 'Assamese', 'অসমীয়া'), AppLanguage('bn', 'Bengali', 'বাংলা'),
  AppLanguage('brx', 'Bodo', 'बड़ो'), AppLanguage('doi', 'Dogri', 'डोगरी'), AppLanguage('gu', 'Gujarati', 'ગુજરાતી'),
  AppLanguage('hi', 'Hindi', 'हिन्दी'), AppLanguage('kn', 'Kannada', 'ಕನ್ನಡ'), AppLanguage('ks', 'Kashmiri', 'कॉशुर'),
  AppLanguage('gom', 'Konkani', 'कोंकणी'), AppLanguage('ml', 'Malayalam', 'മലയാളം'), AppLanguage('mni', 'Manipuri', 'মৈতৈলোন্'),
  AppLanguage('mr', 'Marathi', 'मराठी'), AppLanguage('mai', 'Maithili', 'मैथिली'), AppLanguage('ne', 'Nepali', 'नेपाली'),
  AppLanguage('or', 'Odia', 'ଓଡ଼ିଆ'), AppLanguage('pa', 'Punjabi', 'ਪੰਜਾਬੀ'), AppLanguage('sa', 'Sanskrit', 'संस्कृतम्'),
  AppLanguage('sat', 'Santhali', 'ᱥᱟᱱᱛᱟᱲᱤ'), AppLanguage('sd', 'Sindhi', 'سنڌي'), AppLanguage('ta', 'Tamil', 'தமிழ்'),
  AppLanguage('te', 'Telugu', 'తెలుగు'), AppLanguage('ur', 'Urdu', 'اُردُو'),
];

AppLanguage languageForCode(String code) => appLanguages.firstWhere((item) => item.code == code, orElse: () => appLanguages.first);
