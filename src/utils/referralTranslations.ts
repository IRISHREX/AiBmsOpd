export type ReferralLanguage = 'en' | 'bn' | 'hi' | 'ur';

export interface ReferralTranslation {
  languageName: string;
  formTitle: string;
  formSubtitle: string;
  patientSectionTitle: string;
  patientNameLabel: string;
  patientNamePlaceholder: string;
  patientPhoneLabel: string;
  patientPhonePlaceholder: string;
  patientAddressLabel: string;
  patientAddressPlaceholder: string;
  problemLabel: string;
  problemPlaceholder: string;
  patientEmailLabel: string;
  patientEmailPlaceholder: string;
  ageLabel: string;
  agePlaceholder: string;
  genderLabel: string;
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  bookingForSelf: string;
  bookingForSomeoneElse: string;
  bookerSectionTitle: string;
  bookerNameLabel: string;
  bookerNamePlaceholder: string;
  bookerPhoneLabel: string;
  bookerPhonePlaceholder: string;
  bookerEmailLabel: string;
  bookerEmailPlaceholder: string;
  bookerAutofilledNotice: string;
  bookButton: string;
  urgencyModalTitle: string;
  urgencyModalSubtitle: string;
  emergencyTitle: string;
  emergencyDesc: string;
  generalTitle: string;
  generalDesc: string;
  routineTitle: string;
  routineDesc: string;
  cancel: string;
  validationNameRequired: string;
  validationPhoneInvalid: string;
  validationAddressRequired: string;
  validationProblemRequired: string;
  validationBookerNameRequired: string;
  validationBookerPhoneInvalid: string;
  validationBookerEmailRequired: string;
  validationAgeInvalid: string;
  successTitle: string;
  successMessage: string;
  tempPassNotice: string;
  referAnother: string;
}

export const REFERRAL_TRANSLATIONS: Record<ReferralLanguage, ReferralTranslation> = {
  en: {
    languageName: 'English',
    formTitle: 'OPD Referral & Patient Booking',
    formSubtitle: 'Direct specialist doctor appointment referral',
    patientSectionTitle: 'Patient Information',
    patientNameLabel: 'Patient Full Name *',
    patientNamePlaceholder: 'Enter patient legal name',
    patientPhoneLabel: 'Phone Number (10 Digits) *',
    patientPhonePlaceholder: 'e.g. 9876543210',
    patientAddressLabel: 'Patient Address *',
    patientAddressPlaceholder: 'Village / Town / City, District',
    problemLabel: 'Medical Problem / Symptoms *',
    problemPlaceholder: 'Describe chief complaint, fever, pain, etc.',
    patientEmailLabel: 'Email Address (Optional)',
    patientEmailPlaceholder: 'patient@example.com (optional)',
    ageLabel: 'Age (Years)',
    agePlaceholder: 'e.g. 35',
    genderLabel: 'Gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    genderOther: 'Other',
    bookingForSelf: 'Booking for Self (I am the patient)',
    bookingForSomeoneElse: 'Booking for Someone Else (I am the Referrer)',
    bookerSectionTitle: 'Referrer / Booker Details',
    bookerNameLabel: 'Your Full Name (Referrer) *',
    bookerNamePlaceholder: 'Enter your name',
    bookerPhoneLabel: 'Your Phone Number (10 Digits) *',
    bookerPhonePlaceholder: 'e.g. 9876543210',
    bookerEmailLabel: 'Your Email Address *',
    bookerEmailPlaceholder: 'referrer@example.com',
    bookerAutofilledNotice: 'Auto-filled from your logged-in account',
    bookButton: 'Book Appointment Referral',
    urgencyModalTitle: 'Select Urgency Level',
    urgencyModalSubtitle: 'Choose the appropriate consultation priority',
    emergencyTitle: '🚨 Emergency',
    emergencyDesc: 'Immediate hospital intervention / acute illness',
    generalTitle: '🩺 General',
    generalDesc: 'Prompt evaluation within 24–48 hours',
    routineTitle: '📅 Routine',
    routineDesc: 'Standard specialist checkup & consultation',
    cancel: 'Cancel',
    validationNameRequired: 'Please enter the patient full name.',
    validationPhoneInvalid: 'Please enter a valid 10-digit mobile number.',
    validationAddressRequired: 'Patient address is mandatory.',
    validationProblemRequired: 'Please describe the medical problem or symptoms.',
    validationBookerNameRequired: 'Please provide your name as the referrer.',
    validationBookerPhoneInvalid: 'Please enter your valid 10-digit phone number.',
    validationBookerEmailRequired: 'Referrer email address is required for account creation.',
    validationAgeInvalid: 'Age must be between 0 and 150 years.',
    successTitle: 'Referral Sent Successfully!',
    successMessage: 'Your referral has been submitted to the OPD clinic.',
    tempPassNotice: 'A referral account has been generated for you. Your temporary password is: ',
    referAnother: 'Refer Another Patient',
  },

  bn: {
    languageName: 'বাংলা',
    formTitle: 'ওপিডি রেফারেল ও রোগী বুকিং',
    formSubtitle: 'সরাসরি বিশেষজ্ঞ চিকিৎসকের অ্যাপয়েন্টমেন্ট রেফারেল',
    patientSectionTitle: 'রোগীর তথ্য',
    patientNameLabel: 'রোগীর পুরো নাম *',
    patientNamePlaceholder: 'রোগীর নাম লিখুন',
    patientPhoneLabel: 'ফোন নম্বর (১০ সংখ্যা) *',
    patientPhonePlaceholder: 'যেমন: ৯৮৭৬৫৪৩২১০',
    patientAddressLabel: 'রোগীর ঠিকানা *',
    patientAddressPlaceholder: 'গ্রাম / শহর, জেলা',
    problemLabel: 'শারীরিক সমস্যা / লক্ষণ *',
    problemPlaceholder: 'সমস্যা বর্ণনা করুন, জ্বর, ব্যথা ইত্যাদি',
    patientEmailLabel: 'ইমেল ঠিকানা (ঐচ্ছিক)',
    patientEmailPlaceholder: 'ঐচ্ছিক ইমেল',
    ageLabel: 'বয়স (বছর)',
    agePlaceholder: 'যেমন: ৩৫',
    genderLabel: 'লিঙ্গ',
    genderMale: 'পুরুষ',
    genderFemale: 'মহিলা',
    genderOther: 'অন্যান্য',
    bookingForSelf: 'নিজের জন্য বুকিং (আমিই রোগী)',
    bookingForSomeoneElse: 'অন্য কারো জন্য বুকিং (আমি রেফারার)',
    bookerSectionTitle: 'রেফারার / আবেদনকারীর বিবরণ',
    bookerNameLabel: 'আপনার নাম (রেফারার) *',
    bookerNamePlaceholder: 'আপনার পুরো নাম লিখুন',
    bookerPhoneLabel: 'আপনার ফোন নম্বর (১০ সংখ্যা) *',
    bookerPhonePlaceholder: 'যেমন: ৯৮৭৬৫৪৩২১০',
    bookerEmailLabel: 'আপনার ইমেল ঠিকানা *',
    bookerEmailPlaceholder: 'আপনার ইমেল',
    bookerAutofilledNotice: 'আপনার লগইন অ্যাকাউন্ট থেকে স্বয়ংক্রিয় পূর্ণ হয়েছে',
    bookButton: 'অ্যাপয়েন্টমেন্ট রেফারেল বুক করুন',
    urgencyModalTitle: 'জরুরী স্তর নির্বাচন করুন',
    urgencyModalSubtitle: 'উপযুক্ত পরামর্শের অগ্রাধিকার চয়ন করুন',
    emergencyTitle: '🚨 জরুরী (Emergency)',
    emergencyDesc: 'তাৎক্ষণিক চিকিৎসা বা তীব্র শারীরিক সংকট',
    generalTitle: '🩺 সাধারণ (General)',
    generalDesc: '২৪-৪৮ ঘণ্টার মধ্যে প্রাথমিক মূল্যায়ন',
    routineTitle: '📅 রুটিন (Routine)',
    routineDesc: 'নিয়মিত বিশেষজ্ঞ ডাক্তারের পরামর্শ',
    cancel: 'বাতিল',
    validationNameRequired: 'দয়া করে রোগীর পুরো নাম লিখুন।',
    validationPhoneInvalid: 'সঠিক ১০ সংখ্যার ফোন নম্বর লিখুন।',
    validationAddressRequired: 'রোগীর ঠিকানা আবশ্যক।',
    validationProblemRequired: 'দয়া করে শারীরিক সমস্যা বা লক্ষণ উল্লেখ করুন।',
    validationBookerNameRequired: 'রেফারার হিসেবে আপনার নাম প্রদান করুন।',
    validationBookerPhoneInvalid: 'রেফারারের সঠিক ১০ সংখ্যার ফোন নম্বর লিখুন।',
    validationBookerEmailRequired: 'রেফারার অ্যাকাউন্ট তৈরির জন্য ইমেল আবশ্যক।',
    validationAgeInvalid: 'বয়স ০ থেকে ১৫০ বছরের মধ্যে হতে হবে।',
    successTitle: 'রেফারেল সফলভাবে পাঠানো হয়েছে!',
    successMessage: 'আপনার রেফারেল ওপিডি টিমের কাছে জমা হয়েছে।',
    tempPassNotice: 'আপনার জন্য একটি রেফারাল অ্যাকাউন্ট তৈরি হয়েছে। অস্থায়ী পাসওয়ার্ড: ',
    referAnother: 'আরেকটি রোগী রেফার করুন',
  },

  hi: {
    languageName: 'हिंदी',
    formTitle: 'ओपीडी रेफ़रल और मरीज़ बुकिंग',
    formSubtitle: 'विशेषज्ञ डॉक्टर अपॉइंटमेंट रेफ़रल सेवा',
    patientSectionTitle: 'मरीज़ की जानकारी',
    patientNameLabel: 'मरीज़ का पूरा नाम *',
    patientNamePlaceholder: 'मरीज़ का नाम दर्ज करें',
    patientPhoneLabel: 'फ़ोन नंबर (10 अंक) *',
    patientPhonePlaceholder: 'उदा. 9876543210',
    patientAddressLabel: 'मरीज़ का पता *',
    patientAddressPlaceholder: 'गाँव / शहर, जिला',
    problemLabel: 'बीमारी / मुख्य लक्षण *',
    problemPlaceholder: 'तकलीफ का विवरण, बुखार, दर्द आदि',
    patientEmailLabel: 'ईमेल आईडी (वैकल्पिक)',
    patientEmailPlaceholder: 'वैकल्पिक ईमेल',
    ageLabel: 'आयु (वर्ष)',
    agePlaceholder: 'उदा. 35',
    genderLabel: 'लिंग',
    genderMale: 'पुरुष',
    genderFemale: 'महिला',
    genderOther: 'अन्य',
    bookingForSelf: 'स्वयं के लिए बुकिंग (मैं मरीज़ हूँ)',
    bookingForSomeoneElse: 'किसी अन्य के लिए बुकिंग (मैं रेफ़रर हूँ)',
    bookerSectionTitle: 'रेफ़रर / आवेदक का विवरण',
    bookerNameLabel: 'आपका नाम (रेफ़रर) *',
    bookerNamePlaceholder: 'अपना पूरा नाम दर्ज करें',
    bookerPhoneLabel: 'आपका फ़ोन नंबर (10 अंक) *',
    bookerPhonePlaceholder: 'उदा. 9876543210',
    bookerEmailLabel: 'आपकी ईमेल आईडी *',
    bookerEmailPlaceholder: 'referrer@example.com',
    bookerAutofilledNotice: 'आपके लॉग-इन खाते से अपने आप भरा गया',
    bookButton: 'अपॉइंटमेंट रेफ़रल बुक करें',
    urgencyModalTitle: 'आपातकालीन स्तर चुनें',
    urgencyModalSubtitle: 'परामर्श की प्राथमिकता चुनें',
    emergencyTitle: '🚨 आपातकालीन (Emergency)',
    emergencyDesc: 'तुरंत अस्पताल सहायता और गंभीर स्थिति',
    generalTitle: '🩺 सामान्य (General)',
    generalDesc: '24–48 घंटे के भीतर प्राथमिकता परामर्श',
    routineTitle: '📅 रूटीन (Routine)',
    routineDesc: 'सामान्य विशेषज्ञ जांच और परामर्श',
    cancel: 'रद्द करें',
    validationNameRequired: 'कृपया मरीज़ का पूरा नाम दर्ज करें।',
    validationPhoneInvalid: 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।',
    validationAddressRequired: 'मरीज़ का पता अनिवार्य है।',
    validationProblemRequired: 'कृपया स्वास्थ्य समस्या या लक्षण का विवरण दें।',
    validationBookerNameRequired: 'कृपया रेफ़रर के रूप में अपना नाम दर्ज करें।',
    validationBookerPhoneInvalid: 'कृपया रेफ़रर का 10 अंकों का फ़ोन नंबर दर्ज करें।',
    validationBookerEmailRequired: 'खाता बनाने के लिए रेफ़रर का ईमेल अनिवार्य है।',
    validationAgeInvalid: 'आयु 0 से 150 वर्ष के बीच होनी चाहिए।',
    successTitle: 'रेफ़रल सफलतापूर्वक भेजा गया!',
    successMessage: 'आपका रेफ़रल ओपीडी क्लिनिक को प्राप्त हो गया है।',
    tempPassNotice: 'आपके लिए रेफ़रल खाता बनाया गया है। आपका अस्थायी पासवर्ड है: ',
    referAnother: 'एक और मरीज़ रेफ़र करें',
  },

  ur: {
    languageName: 'اردو',
    formTitle: 'او پی ڈی ریفرل اور مریض بکنگ',
    formSubtitle: 'براہ راست ماہر معالج اپوائنٹمنٹ ریفرل',
    patientSectionTitle: 'مریض کی معلومات',
    patientNameLabel: 'مریض کا مکمل نام *',
    patientNamePlaceholder: 'مریض کا نام درج کریں',
    patientPhoneLabel: 'فون نمبر (10 ہندسے) *',
    patientPhonePlaceholder: 'مثال: 9876543210',
    patientAddressLabel: 'مریض کا پتہ *',
    patientAddressPlaceholder: 'گاؤں / قصبہ / شہر، ضلع',
    problemLabel: 'طبی مسئلہ / علامات *',
    problemPlaceholder: 'بیماری یا علامات بیان کریں (بخار، درد وغیرہ)',
    patientEmailLabel: 'ای میل پتہ (اختیاری)',
    patientEmailPlaceholder: 'اختیاری ای میل',
    ageLabel: 'عمر (سال)',
    agePlaceholder: 'مثال: 35',
    genderLabel: 'جنس',
    genderMale: 'مرد',
    genderFemale: 'عورت',
    genderOther: 'دیگر',
    bookingForSelf: 'اپنے لیے بکنگ (میں خود مریض ہوں)',
    bookingForSomeoneElse: 'کسی اور کے لیے بکنگ (میں ریفرر ہوں)',
    bookerSectionTitle: 'ریفرر / درخواست دہندہ کی تفصیلات',
    bookerNameLabel: 'آپ کا مکمل نام (ریفرر) *',
    bookerNamePlaceholder: 'اپنا نام درج کریں',
    bookerPhoneLabel: 'آپ کا فون نمبر (10 ہندسے) *',
    bookerPhonePlaceholder: 'مثال: 9876543210',
    bookerEmailLabel: 'آپ کا ای میل پتہ *',
    bookerEmailPlaceholder: 'ای میل پتہ درج کریں',
    bookerAutofilledNotice: 'آپ کے لاگ ان اکاؤنٹ سے خودکار درج شدہ',
    bookButton: 'اپوائنٹمنٹ ریفرل بک کریں',
    urgencyModalTitle: 'ہنگامی سطح منتخب کریں',
    urgencyModalSubtitle: 'معالج کے معائنے کی ترجیح منتخب کریں',
    emergencyTitle: '🚨 ہنگامی (Emergency)',
    emergencyDesc: 'فوری ہسپتال طبی امداد اور ایمرجنسی',
    generalTitle: '🩺 عمومی (General)',
    generalDesc: '24 سے 48 گھنٹوں میں طبی معائنہ',
    routineTitle: '📅 معمول (Routine)',
    routineDesc: 'عام معمول کا ماہر ڈاکٹر سے معائنہ',
    cancel: 'منسوخ کریں',
    validationNameRequired: 'براہ کرم مریض کا مکمل نام درج کریں۔',
    validationPhoneInvalid: 'براہ کرم درست 10 ہندسوں کا موبائل نمبر درج کریں۔',
    validationAddressRequired: 'مریض کا پتہ درج کرنا لازمی ہے۔',
    validationProblemRequired: 'براہ کرم بیماری یا علامات بیان کریں۔',
    validationBookerNameRequired: 'بطور ریفرر اپنا نام درج کریں۔',
    validationBookerPhoneInvalid: 'براہ کرم ریفرر کا درست 10 ہندسوں کا فون نمبر درج کریں۔',
    validationBookerEmailRequired: 'اکاؤنٹ بنانے کے لیے ریفرر کا ای میل لازمی ہے۔',
    validationAgeInvalid: 'عمر 0 سے 150 سال کے درمیان ہونی چاہیے۔',
    successTitle: 'ریفرل کامیابی سے ارسال کر دیا گیا!',
    successMessage: 'آپ کا ریفرل او پی ڈی کلینک کو موصول ہو چکا ہے۔',
    tempPassNotice: 'آپ کے لیے ریفرل اکاؤنٹ بنا دیا گیا ہے۔ عارضی پاس ورڈ: ',
    referAnother: 'مزید مریض ریفر کریں',
  },
};

export function getReferralTranslations(lang: ReferralLanguage): ReferralTranslation {
  return REFERRAL_TRANSLATIONS[lang] || REFERRAL_TRANSLATIONS.en;
}
