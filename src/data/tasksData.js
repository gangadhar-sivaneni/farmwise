import { byId } from './cropsData';
import { ukey, currentUser } from '../services/authService';

export const TASKS = [
  {
    id: 'moist',
    icon: 'drop',
    t: { en: 'Check soil moisture', te: 'నేల తేమను పరీక్షించండి' },
    d: {
      en: 'Push a finger 5 cm into the soil in Plot A. If it feels dry, irrigate this evening.',
      te: 'ప్లాట్ Aలో నేలలోకి 5 సెం.మీ. వేలు పెట్టి చూడండి. పొడిగా ఉంటే ఈ సాయంత్రం నీరు పెట్టండి.'
    },
    w: { en: 'Morning · 10 min', te: 'ఉదయం · 10 నిమి.' }
  },
  {
    id: 'rain',
    icon: 'rain',
    t: { en: 'Review rainfall forecast', te: 'వర్ష సూచనను చూడండి' },
    d: {
      en: '70% chance of rain tomorrow. Hold urea top-dressing until it passes.',
      te: 'రేపు 70% వర్షం అవకాశం. వర్షం తగ్గే వరకు యూరియా వేయకండి.'
    },
    w: { en: 'Now · 2 min', te: 'ఇప్పుడే · 2 నిమి.' }
  },
  {
    id: 'leaf',
    icon: 'eye',
    t: { en: 'Inspect crop leaves', te: 'పంట ఆకులను పరిశీలించండి' },
    d: {
      en: 'Walk 20 maize plants in a W pattern. Look for ragged holes in the whorls.',
      te: '20 మొక్కజొన్న మొక్కలను W ఆకారంలో నడుస్తూ చూడండి.'
    },
    w: { en: 'Morning · 20 min', te: 'ఉదయం · 20 నిమి.' }
  },
  {
    id: 'irr',
    icon: 'tap',
    t: { en: 'Prepare irrigation', te: 'నీటిపారుదలకు సిద్ధం చేయండి' },
    d: {
      en: 'Clear field channels in Plot B before the rain so water drains away from roots.',
      te: 'వర్షానికి ముందే ప్లాట్ Bలో కాలువలను శుభ్రం చేయండి.'
    },
    w: { en: 'Afternoon · 45 min', te: 'మధ్యాహ్నం · 45 నిమి.' }
  },
  {
    id: 'harv',
    icon: 'harvest',
    t: { en: 'Groundnut harvest in ~14 days', te: 'సుమారు 14 రోజుల్లో వేరుశనగ కోత' },
    d: {
      en: 'Plot C is nearing maturity. Book labour and tarpaulins now.',
      te: 'ప్లాట్ C పక్వతకు దగ్గరలో ఉంది. కూలీలను, టార్పాలిన్‌లను ఇప్పుడే సిద్ధం చేసుకోండి.'
    },
    w: { en: 'Reminder · this week', te: 'గుర్తు · ఈ వారం' }
  }
];

export const CATEGORIES = {
  crop: { id: 'crop', icon: 'sprout', label: { en: 'Crop Inspection', te: 'పంట పరిశీలన' } },
  irrigation: { id: 'irrigation', icon: 'tap', label: { en: 'Irrigation & Drainage', te: 'నీటిపారుదల' } },
  pest: { id: 'pest', icon: 'eye', label: { en: 'Pest & Disease', te: 'పురుగులు & తెగుళ్లు' } },
  fertilizer: { id: 'fertilizer', icon: 'layers', label: { en: 'Fertilizer & Soil', te: 'ఎరువులు & నేల' } },
  harvest: { id: 'harvest', icon: 'harvest', label: { en: 'Harvest & Storage', te: 'కోత & నిల్వ' } },
  equipment: { id: 'equipment', icon: 'check', label: { en: 'Equipment & Care', te: 'పరికరాల సంరక్షణ' } },
  general: { id: 'general', icon: 'check-sq', label: { en: 'General Farm Task', te: 'సాధారణ పని' } },
};

export const TIME_SLOTS = [
  { id: 'Morning', label: { en: 'Morning', te: 'ఉదయం' } },
  { id: 'Midday', label: { en: 'Midday', te: 'మధ్యాహ్నం' } },
  { id: 'Afternoon', label: { en: 'Afternoon', te: 'మధ్యాహ్నం' } },
  { id: 'Evening', label: { en: 'Evening', te: 'సాయంత్రం' } },
  { id: 'Anytime', label: { en: 'Anytime', te: 'ఏ సమయమైనా' } },
];

export function getTodayDateStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(str) {
  if (!str) return new Date();
  const parts = str.split('-').map(Number);
  if (parts.length !== 3) return new Date(str);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Generate sensible, contextual suggested tasks for any date
 * based on active farm crops, weather conditions, soil, and day of week.
 */
function generateLegacySuggestedTasks(dateStr, farm, weather) {
  const date = parseDateStr(dateStr);
  const dayOfWeek = date.getDay(); // 0 Sun - 6 Sat
  const dayOfMonth = date.getDate();
  const isPast = dateStr < getTodayDateStr();

  const crops = farm?.plots?.map((p) => p.crop?.toLowerCase()) || ['maize', 'cotton', 'groundnut'];
  const hasMaize = crops.includes('maize');
  const hasCotton = crops.includes('cotton');
  const hasGroundnut = crops.includes('groundnut');
  const hasRice = crops.includes('rice');
  const hasChilli = crops.includes('chilli');

  const curWeather = weather?.current;
  const isRainy = (curWeather?.precipitationProbability ?? 0) > 40 ||
    /rain|shower|storm/i.test(curWeather?.condition?.en || '');
  const isHighHeat = (curWeather?.temperature ?? farm?.temp ?? 29) >= 32;

  const suggestions = [];

  // 1. Weather / Moisture-based task
  if (isRainy) {
    suggestions.push({
      id: `sugg_${dateStr}_rain`,
      title: {
        en: 'Inspect drainage channels before expected rain',
        te: 'వర్షానికి ముందు మురుగునీటి కాలువలను తనిఖీ చేయండి'
      },
      desc: {
        en: 'Heavy rain or showers forecast. Clear weeds and silt from furrows so water does not log around roots.',
        te: 'వర్ష సూచన ఉన్నందున కాలువల నుండి చెత్తాచెదారం తొలగించండి, నీరు నిలవకుండా చూసుకోండి.'
      },
      timeOfDay: 'Morning',
      duration: '35 min',
      category: 'irrigation',
      icon: 'rain',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast && (dayOfMonth % 3 !== 0)
    });
  } else if (isHighHeat) {
    suggestions.push({
      id: `sugg_${dateStr}_heat`,
      title: {
        en: 'Check drip lines & schedule evening irrigation',
        te: 'డ్రిప్ పైపులను తనిఖీ చేసి సాయంత్రం నీరు పెట్టండి'
      },
      desc: {
        en: 'High afternoon temperature forecast. Inspect drip emitters for blockages and irrigate in the cool evening.',
        te: 'ఎండ తీవ్రత ఎక్కువగా ఉన్నందున సాయంత్రం వేళల్లో బిందు సేద్యం ద్వారా నీటిని అందించండి.'
      },
      timeOfDay: 'Evening',
      duration: '30 min',
      category: 'irrigation',
      icon: 'tap',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  } else {
    suggestions.push({
      id: `sugg_${dateStr}_moist`,
      title: {
        en: 'Check soil moisture at 5 cm depth',
        te: '5 సెం.మీ లోతులో నేల తేమను పరీక్షించండి'
      },
      desc: {
        en: 'Push a finger 5 cm into the soil in Plot A. If crumbly and dry, schedule light irrigation.',
        te: 'ప్లాట్ Aలో నేలలో వేలు పెట్టి చూడండి. పొడిగా ఉంటే తేలికపాటి తడి అందించండి.'
      },
      timeOfDay: 'Morning',
      duration: '15 min',
      category: 'irrigation',
      icon: 'drop',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  }

  // 2. Primary Crop Inspection
  if (hasMaize) {
    suggestions.push({
      id: `sugg_${dateStr}_maize`,
      title: {
        en: 'Inspect maize leaf whorls (Plot A)',
        te: 'మొక్కజొన్న ఆకు సుడులను పరిశీలించండి (ప్లాట్ A)'
      },
      desc: {
        en: 'Walk 20 plants in a W pattern. Check inner whorls for ragged holes or fall armyworm pinhead frass.',
        te: '20 మొక్కజొన్న మొక్కలను W ఆకారంలో నడుస్తూ చూడండి. కత్తెర పురుగు ఆనవాళ్లు గమనించండి.'
      },
      timeOfDay: 'Morning',
      duration: '25 min',
      category: 'pest',
      icon: 'eye',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast && (dayOfMonth % 2 === 0)
    });
  } else if (hasRice) {
    suggestions.push({
      id: `sugg_${dateStr}_rice`,
      title: {
        en: 'Monitor water level in paddy (Plot A)',
        te: 'వరి మడిలో నీటి మట్టాన్ని తనిఖీ చేయండి (ప్లాట్ A)'
      },
      desc: {
        en: 'Maintain 2 to 3 cm shallow standing water for active tillering stage. Check bunds for crab leaks.',
        te: 'పిలకల దశలో 2-3 సెం.మీ నిలకడ నీరు ఉంచండి. గట్ల లీకేజీలు సరిచేయండి.'
      },
      timeOfDay: 'Morning',
      duration: '20 min',
      category: 'crop',
      icon: 'tap',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  }

  // 3. Secondary Crop / Pest management
  if (hasCotton) {
    suggestions.push({
      id: `sugg_${dateStr}_cotton`,
      title: {
        en: 'Inspect cotton foliage for sucking pests (Plot B)',
        te: 'పత్తిలో రసం పీల్చే పురుగులను గమనించండి (ప్లాట్ B)'
      },
      desc: {
        en: 'Examine underside of 15 top leaves. Look for jassids, thrips or whitefly nymphs under morning light.',
        te: 'ఉదయం ఎండలో ఆకుల అడుగు భాగాన్ని పరిశీలించి తామర పురుగులు, తెల్లదోమలను గుర్తించండి.'
      },
      timeOfDay: 'Morning',
      duration: '20 min',
      category: 'pest',
      icon: 'sprout',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  } else if (hasChilli) {
    suggestions.push({
      id: `sugg_${dateStr}_chilli`,
      title: {
        en: 'Check chilli tender shoots for leaf curl (Plot B)',
        te: 'మిరపలో ఆకు ముడుత, తామర పురుగులను చూడండి (ప్లాట్ B)'
      },
      desc: {
        en: 'Check young shoots for upward cupping caused by thrips. Inspect borders for aphid clusters.',
        te: 'చిగురు ఆకులు పైకి ముడుచుకుంటున్నాయేమో చూడండి. తామర పురుగు నివారణకు సిద్ధం కండి.'
      },
      timeOfDay: 'Morning',
      duration: '15 min',
      category: 'pest',
      icon: 'eye',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  }

  // 4. Groundnut or Soil & Nutrition
  if (hasGroundnut) {
    suggestions.push({
      id: `sugg_${dateStr}_gnut`,
      title: {
        en: 'Check groundnut pod maturity & leaf spot (Plot C)',
        te: 'వేరుశనగ కాయ పక్వత, ఆకుమచ్చ తెగులు పరిశీలన (ప్లాట్ C)'
      },
      desc: {
        en: 'Inspect lower foliage for Tikka leaf spots. Test 2-3 sample pods for dark internal shell coloration.',
        te: 'కింది ఆకులలో తిక్కా మచ్చలు చూడండి. కాయల లోపలి రంగు చూసి కోత సమయాన్ని అంచనా వేయండి.'
      },
      timeOfDay: 'Afternoon',
      duration: '25 min',
      category: 'crop',
      icon: 'layers',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast && (dayOfMonth % 2 !== 0)
    });
  } else {
    suggestions.push({
      id: `sugg_${dateStr}_fert`,
      title: {
        en: 'Assess nutrient top-dressing requirement',
        te: 'ఎరువుల పైపాటు మోతాదును అంచనా వేయండి'
      },
      desc: {
        en: 'Check leaf greenness in young plots. Plan split nitrogen/zinc application according to moisture.',
        te: 'పైరు రంగును బట్టి యూరియా లేదా సూక్ష్మ పోషకాల వేతను ప్రణాళిక చేసుకోండి.'
      },
      timeOfDay: 'Afternoon',
      duration: '20 min',
      category: 'fertilizer',
      icon: 'layers',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  }

  // 5. Market / Maintenance chore (changes by day of week)
  if (dayOfWeek === 1 || dayOfWeek === 4) { // Mon / Thu
    suggestions.push({
      id: `sugg_${dateStr}_market`,
      title: {
        en: 'Review weekly mandi modal prices',
        te: 'వారపు మార్కెట్ ధరలను సమీక్షించండి'
      },
      desc: {
        en: 'Compare modal rates for Warangal & Khammam mandis before scheduling next harvest dispatch.',
        te: 'వరంగల్ మరియు ఖమ్మం మార్కెట్ రేట్లను చూసి సరుకు రవాణా ప్లాన్ చేసుకోండి.'
      },
      timeOfDay: 'Midday',
      duration: '10 min',
      category: 'general',
      icon: 'store',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  } else {
    suggestions.push({
      id: `sugg_${dateStr}_equip`,
      title: {
        en: 'Clean sprayer nozzles & check battery',
        te: 'స్ప్రేయర్ నాజిల్‌లు శుభ్రం చేసి బ్యాటరీ తనిఖీ చేయండి'
      },
      desc: {
        en: 'Rinse spray filter and test pressure nozzle to ensure even droplet coverage across crop rows.',
        te: 'స్ప్రే నాజిల్ మూసుకుపోకుండా శుభ్రపరచండి, బ్యాటరీ ఛార్జ్ సరిచూసుకోండి.'
      },
      timeOfDay: 'Evening',
      duration: '15 min',
      category: 'equipment',
      icon: 'check',
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: isPast
    });
  }

  return suggestions;
}

/**
 * Build a short, date-specific task list from the farm record and weather
 * available for that date. Farm and weather fields are observations or
 * forecasts only where provided; suggestions ask the farmer to verify locally.
 */
export function generateSuggestedTasks(dateStr, farm, weather) {
  const date = parseDateStr(dateStr);
  const today = getTodayDateStr();
  const isToday = dateStr === today;
  const forecast = weather?.forecast?.find((day) => day.dateStr === dateStr);
  const conditions = isToday ? (weather?.current || forecast) : forecast;
  const rainChance = conditions?.precipitationProbability ?? conditions?.rain;
  const temperature = isToday
    ? (conditions?.todayMax ?? conditions?.temperature)
    : conditions?.hi;
  const soilMoisture = conditions?.soilMoisture;
  const conditionText = typeof conditions?.condition === 'object'
    ? conditions.condition.en
    : conditions?.condition;
  const expectsHeavyRain = (rainChance ?? 0) >= 60 || /heavy rain|thunderstorm/i.test(conditionText || '');
  const isDryAndHot = (temperature ?? 0) >= 32 &&
    (rainChance == null || rainChance < 30) &&
    (soilMoisture == null || soilMoisture <= 0.2);
  const plots = farm?.plots || [];
  const suggestions = [];
  const seen = new Set();
  const addSuggestion = (key, task, priority) => {
    const uniqueKey = `${task.title.en.toLowerCase()}|${task.field || ''}`;
    if (seen.has(uniqueKey)) return;
    seen.add(uniqueKey);
    suggestions.push({
      id: `sugg_${dateStr}_${key}`,
      ...task,
      priority,
      isSuggested: true,
      isCustom: false,
      isEdited: false,
      completed: false,
    });
  };

  const alertText = farm?.alert?.b;
  const alertCrop = `${farm?.alert?.t?.en || ''} ${alertText?.en || ''}`.match(
    /maize|cotton|groundnut|rice|chilli|turmeric/i
  )?.[0]?.toLowerCase();
  const alertPlot = plots.find((plot) => plot.crop?.toLowerCase() === alertCrop);
  const alertIsDue = [2, 4, 6].includes(date.getDay());

  if (alertText && alertIsDue) {
    const cropName = alertCrop
      ? alertCrop.charAt(0).toUpperCase() + alertCrop.slice(1)
      : 'crop';
    addSuggestion('alert-scout', {
      title: {
        en: `Scout ${cropName.toLowerCase()} for the farm alert`,
        te: `${(alertCrop && byId(alertCrop)?.name?.te) || 'పంట'}లో పొలం హెచ్చరిక లక్షణాలను పరిశీలించండి`,
      },
      desc: {
        en: `${alertText.en} Repeat this scouting check on spaced days while the alert remains active, and note any changes.`,
        te: `${alertText.te || 'పంటలో కనిపించే లక్షణాలను గమనించండి'} హెచ్చరిక ఉన్నంతకాలం మధ్య మధ్యలో పరిశీలించి మార్పులను నమోదు చేయండి.`,
      },
      field: alertPlot ? `Plot ${alertPlot.label} · ${cropName}` : cropName,
      timeOfDay: 'Morning',
      duration: '20 min',
      category: 'pest',
      icon: 'eye',
    }, 1);
  }

  if (expectsHeavyRain && plots.some((plot) => plot.crop !== 'rice')) {
    addSuggestion('rain-drainage', {
      title: { en: 'Check drainage before the rain', te: 'వర్షానికి ముందు నీటి కాలువలను తనిఖీ చేయండి' },
      desc: {
        en: `The forecast for ${date.toLocaleDateString('en', { month: 'short', day: 'numeric' })} shows a high chance of rain. Clear blocked furrows in non-paddy plots to reduce standing water.`,
        te: 'వర్ష సూచన ఉన్నందున ఇతర పొలాల్లో నీరు నిలవకుండా కాలువల్లో అడ్డంకులు తొలగించండి.',
      },
      field: 'Non-paddy plots',
      timeOfDay: 'Morning',
      duration: '25 min',
      category: 'irrigation',
      icon: 'rain',
    }, 2);
  } else if (isDryAndHot) {
    addSuggestion('dry-check', {
      title: { en: 'Check soil before scheduling irrigation', te: 'నీరు పెట్టే ముందు నేల తేమను చూడండి' },
      desc: {
        en: `Hot, dry weather is forecast${soilMoisture != null ? ' and the weather model estimates low surface soil moisture' : ''}. Check the root zone by hand, then irrigate only if the soil is dry.`,
        te: 'వేడి, పొడి వాతావరణ సూచన ఉంది. చేతితో వేరు ప్రాంతంలోని నేల తేమను చూసి పొడిగా ఉంటేనే నీరు పెట్టండి.',
      },
      field: plots[0] ? `Plot ${plots[0].label} · ${plots[0].crop}` : '',
      timeOfDay: 'Morning',
      duration: '15 min',
      category: 'irrigation',
      icon: 'drop',
    }, 2);
  }

  if (date.getDay() === 1) {
    plots.forEach((plot) => {
      const crop = byId(plot.crop);
      const maturityDays = crop?.dur?.[0];
      if (!maturityDays || !Number.isFinite(plot.day) || plot.day < maturityDays * 0.8) return;
      const cropName = crop.name.en.toLowerCase();
      addSuggestion(`maturity-${plot.label}`, {
        title: { en: `Review ${cropName} harvest readiness`, te: `${crop.name.te} కోతకు సిద్ధమా చూడండి` },
        desc: {
          en: `The farm record lists this crop at day ${plot.day}; maturity varies by field. Check sample plants against crop signs before arranging harvest.`,
          te: `పొలం రికార్డులో పంట వయస్సు ${plot.day}వ రోజుగా ఉంది. కోత ఏర్పాటుకు ముందు నమూనా మొక్కలను పరిశీలించండి.`,
        },
        field: `Plot ${plot.label} · ${crop.name.en}`,
        timeOfDay: 'Morning',
        duration: '20 min',
        category: 'harvest',
        icon: 'harvest',
      }, 3);
    });
  }

  const lifecycleActivities = {
    establishment: [
      ['Check crop emergence across the plot', 'పొలంలోని వివిధ వరుసల్లో మొలకలను చూసి, ఎక్కడైనా అసమానత ఉంటే నమోదు చేయండి.', 'Compare emerged plants across several rows and note any uneven patches.'],
      ['Mark gaps in the crop stand', 'ఖాళీగా ఉన్న నాటిన స్థానాలను గుర్తించి నమోదు చేయండి.', 'Record empty planting spots so any corrective action can be decided while plants are young.'],
      ['Inspect the soil surface around seedlings', 'మొలకల చుట్టూ నేల గట్టిపడిందా, నీరు నిలిచిందా, వేర్లు బయటపడ్డాయా చూడండి.', 'Look for crusting, waterlogging, or exposed roots and note where seedlings need attention.'],
    ],
    vegetative: [
      ['Record crop growth in a representative row', 'పొలంలోని కొన్ని చోట్ల మొక్కల ఎత్తు, ఆకుల పెరుగుదలను పోల్చి అసమాన ప్రాంతాలను నమోదు చేయండి.', 'Compare plant height and leaf growth at several points in the plot; note uneven areas.'],
      ['Check new growth for crop-specific pest signs', 'కొత్త ఆకులు, పెరుగుదల భాగాల్లో నష్టం ఉందా చూడండి. పంట రికార్డులో ఉన్న పురుగుల ప్రమాదాలు: {pests}.', 'Inspect young leaves and growing points for damage. The crop record lists these risks: {pests}.'],
      ['Walk the rows for weed pressure', 'పంటతో పోటీ పడుతున్న కలుపు మొక్కలు ఉన్నాయా వరుసల్లో చూసి, ఉన్న చోట్ల మాత్రమే తొలగించండి.', 'Note where weeds are competing with the crop and remove only those that are present.'],
    ],
    flowering: [
      ['Check flowering and pollination across the plot', 'కొన్ని మొక్కల్లో పూతను పరిశీలించి, పొలం అంతటా పూత సమంగా ఉందో నమోదు చేయండి.', 'Inspect representative plants for flowers and note whether flowering is even across the field.'],
      ['Inspect flowers and growing points for damage', 'పురుగు లేదా తెగులు లక్షణాలను చూసి, ఏ చర్యకైనా ముందు ప్రభావిత ప్రాంతాలను నమోదు చేయండి.', 'Look closely for pest or disease symptoms and record affected locations before deciding on treatment.'],
      ['Check root-zone moisture before irrigation', 'వేర్ల దగ్గర నేల తేమను చేతితో చూసి, నేల పొడిగా ఉన్నప్పుడే నీరు పెట్టండి.', 'Feel the soil near the roots and use the crop water need as a guide; irrigate only if the soil is dry.'],
    ],
    development: [
      ['Inspect developing crop structures', 'కొన్ని మొక్కల్లో ఆరోగ్యంగా పెరుగుతున్న {part}ను పరిశీలించి, అసమాన పెరుగుదలను నమోదు చేయండి.', 'Check representative plants for healthy developing {part} and record any uneven development.'],
      ['Scout developing {part} for damage', 'పొలంలోని కొన్ని చోట్ల {part}పై పురుగు లేదా తెగులు లక్షణాలు ఉన్నాయా చూసి నమోదు చేయండి.', 'Inspect a small sample across the plot for pest or disease signs; record what you find.'],
      ['Check drainage and plant support', 'నీరు నిలవడం, మొక్కలు వంగడం లేదా కాండాలు విరగడం ఉందా చూసి శ్రద్ధ అవసరమైన ప్రాంతాలను నమోదు చేయండి.', 'Look for standing water, leaning plants, or broken stems and note any areas needing attention.'],
    ],
    maturity: [
      ['Sample crop maturity in several field spots', 'కోతకు సిద్ధమని నిర్ణయించే ముందు కొన్ని ప్రాంతాల్లోని మొక్కలను పంట కోత సూచనలతో పోల్చండి.', 'Check representative plants against the crop harvest signs before deciding whether the plot is ready.'],
      ['Inspect mature crop for weather or pest damage', 'దెబ్బతిన్న ప్రాంతాలను నమోదు చేసి, కోత సమయంలో తడి లేదా తెగులు ఉన్న దిగుబడిని వేరుగా ఉంచండి.', 'Record damaged areas and keep wet or diseased produce separate during any harvest.'],
      ['Prepare a clean, dry harvest area', 'కోతకు ముందు బుట్టలు, ఎండబెట్టే స్థలం లేదా నిల్వ ప్రదేశం శుభ్రంగా, సిద్ధంగా ఉన్నాయో చూడండి.', 'Check that containers, drying space, or storage are clean and ready before harvesting.'],
    ],
  };
  const lifecycleStages = [
    { id: 'establishment', max: 0.15 },
    { id: 'vegetative', max: 0.4 },
    { id: 'flowering', max: 0.62 },
    { id: 'development', max: 0.86 },
    { id: 'maturity', max: Infinity },
  ];
  const dayOffset = Math.round((date - parseDateStr(today)) / 86400000);

  plots.forEach((plot) => {
    const crop = byId(plot.crop);
    const maturityDays = crop?.dur?.[0];
    if (!crop || !Number.isFinite(maturityDays) || !Number.isFinite(plot.day)) return;

    const cropDay = Math.max(1, plot.day + dayOffset);
    const progress = cropDay / maturityDays;
    const stage = lifecycleStages.find((item) => progress <= item.max) || lifecycleStages[lifecycleStages.length - 1];
    const cropName = crop.name.en;
    const plotName = `Plot ${plot.label} · ${cropName}`;
    const pests = crop.pests?.en?.join(', ') || 'common crop pests';
    const part = {
      rice: 'tillers or panicles',
      maize: 'tassels, silks, or ears',
      cotton: 'squares, flowers, or bolls',
      groundnut: 'pegs or pods',
      chilli: 'flowers or fruit',
      turmeric: 'leaves or rhizomes',
    }[crop.id] || 'flowers or developing produce';
    const partTe = {
      rice: 'పిలకలు లేదా కంకులు',
      maize: 'పూత కుచ్చులు, పీచు లేదా కండెలు',
      cotton: 'మొగ్గలు, పూలు లేదా కాయలు',
      groundnut: 'ఊడలు లేదా కాయలు',
      chilli: 'పూలు లేదా కాయలు',
      turmeric: 'ఆకులు లేదా దుంపలు',
    }[crop.id] || 'పూలు లేదా పెరుగుతున్న పంట';
    const pestsTe = crop.pests?.te?.join(', ') || 'సాధారణ పంట పురుగులు';
    const fillTe = (text) => text.replace('{pests}', pestsTe).replaceAll('{part}', partTe);

    lifecycleActivities[stage.id].forEach(([title, titleTe, description], index) => {
      addSuggestion(`plot-${plot.label}-${stage.id}-${index + 1}`, {
        title: {
          en: `${cropName}: ${title.replaceAll('{part}', part)}`,
          te: `${crop.name.te}: ${fillTe(titleTe)}`,
        },
        desc: {
          en: description.replace('{pests}', pests).replaceAll('{part}', part),
          te: `ప్లాట్ ${plot.label}: ${fillTe(titleTe)}`,
        },
        field: plotName,
        timeOfDay: index === 2 ? 'Afternoon' : 'Morning',
        duration: index === 1 ? '20 min' : '15 min',
        category: stage.id === 'maturity' ? 'harvest' : index === 1 ? 'pest' : 'crop',
        icon: stage.id === 'maturity' ? 'harvest' : index === 1 ? 'eye' : 'sprout',
      }, 4 + index);
    });
  });

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .map(({ priority, ...task }) => task);
}

const STORAGE_KEY = 'tasks'; // scoped per user: farmwise_user_<id>_tasks

export function loadAllDailyTasks() {
  try {
    if (!currentUser()) return null;
    const raw = localStorage.getItem(ukey(STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.error('Failed to load daily tasks from storage', err);
    return null;
  }
}

export function saveAllDailyTasks(data) {
  try {
    if (!currentUser()) return;
    localStorage.setItem(ukey(STORAGE_KEY), JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save daily tasks to storage', err);
  }
}

function getConditionKey(dateStr, farm, weather) {
  const forecast = weather?.forecast?.find((day) => day.dateStr === dateStr);
  const conditions = dateStr === getTodayDateStr() ? weather?.current || forecast : forecast;
  return JSON.stringify({
    suggestionVersion: 2,
    plots: farm?.plots?.map(({ crop, label, day, stage }) => ({ crop, label, day, stage })),
    alert: farm?.alert,
    weather: conditions && {
      rain: conditions.rain ?? conditions.precipitationProbability,
      hi: conditions.hi ?? conditions.todayMax ?? conditions.temperature,
      soilMoisture: conditions.soilMoisture,
      condition: conditions.condition,
    },
  });
}

function createDayRecord(savedTasks) {
  const suggestions = savedTasks.filter((task) => task.isSuggested || !task.isCustom);
  const added = savedTasks.filter((task) => task.isCustom && !task.isSuggested);
  const changes = {};
  suggestions.forEach((task) => {
    changes[task.id] = {
      completed: !!task.completed,
      ...(task.isEdited ? {
        title: task.title,
        desc: task.desc,
        field: task.field,
        timeOfDay: task.timeOfDay,
        duration: task.duration,
        category: task.category,
        icon: task.icon,
        isEdited: true,
      } : {}),
    };
  });
  return { suggestions, added, changes, deleted: [], conditionKey: null };
}

// Tasks are stored per plot: demo farm 'a' keeps the original date-only keys (existing history), other plots use 'plotId|date'.
const recordKey = (dateStr, farm) => (farm?.id && farm.id !== 'a' ? `${farm.id}|${dateStr}` : dateStr);

function readDayRecord(allTasks, dateStr) {
  const saved = allTasks[dateStr];
  if (Array.isArray(saved)) {
    const migrated = createDayRecord(saved);
    allTasks[dateStr] = migrated;
    return migrated;
  }
  if (saved && typeof saved === 'object' && Array.isArray(saved.suggestions)) {
    return {
      suggestions: saved.suggestions,
      added: Array.isArray(saved.added) ? saved.added : [],
      changes: saved.changes && typeof saved.changes === 'object' ? saved.changes : {},
      deleted: Array.isArray(saved.deleted) ? saved.deleted : [],
      conditionKey: saved.conditionKey || null,
    };
  }
  return null;
}

function tasksFromRecord(record) {
  const deleted = new Set(record.deleted);
  const suggestions = record.suggestions
    .filter((task) => !deleted.has(task.id))
    .map((task) => ({ ...task, ...(record.changes[task.id] || {}) }));
  const added = record.added.map((task) => ({ ...task }));
  return [...added, ...suggestions];
}

/**
 * Get tasks for a date. A date's initial suggestions are saved as a snapshot;
 * completion, edits, additions, and deletions remain attached to that date.
 */
export function getTasksForDate(dateStr, farm, weather) {
  const allTasks = loadAllDailyTasks() || {};
  const key = recordKey(dateStr, farm);
  let record = readDayRecord(allTasks, key);

  if (!record) {
    record = {
      suggestions: generateSuggestedTasks(dateStr, farm, weather),
      added: [],
      changes: {},
      deleted: [],
      conditionKey: getConditionKey(dateStr, farm, weather),
    };
  } else if (dateStr >= getTodayDateStr()) {
    const existingTasks = tasksFromRecord(record);
    if (existingTasks.length < 5) {
      const existingIds = new Set([
        ...record.suggestions.map((task) => task.id),
        ...record.added.map((task) => task.id),
        ...record.deleted,
      ]);
      const existingTitles = new Set(existingTasks.map((task) => {
        const title = typeof task.title === 'object' ? task.title.en : task.title;
        return `${String(title || '').trim().toLowerCase()}|${(task.field || '').trim().toLowerCase()}`;
      }));
      const additionalTasks = generateSuggestedTasks(dateStr, farm, weather)
        .filter((task) => {
          const title = typeof task.title === 'object' ? task.title.en : task.title;
          const key = `${String(title || '').trim().toLowerCase()}|${(task.field || '').trim().toLowerCase()}`;
          if (existingIds.has(task.id) || existingTitles.has(key)) return false;
          existingIds.add(task.id);
          existingTitles.add(key);
          return true;
        });
      const missingCount = Math.max(0, 5 - existingTasks.length);
      record.suggestions.push(...additionalTasks.slice(0, missingCount));
    }
  }

  // Saved suggestions keep their status/edits (record.changes) but take fresh wording, so text fixes reach saved days.
  const freshText = new Map(generateSuggestedTasks(dateStr, farm, weather).map((task) => [task.id, task]));
  record.suggestions = record.suggestions.map((task) => {
    const fresh = freshText.get(task.id);
    return fresh ? { ...task, title: fresh.title, desc: fresh.desc, field: fresh.field } : task;
  });

  const existingTitles = new Set(record.added.map((task) => {
    const title = typeof task.title === 'object' ? task.title.en : task.title;
    return `${String(title || '').trim().toLowerCase()}|${(task.field || '').trim().toLowerCase()}`;
  }));
  record.suggestions = record.suggestions.filter((task) => {
    const taskWithChanges = { ...task, ...(record.changes[task.id] || {}) };
    const title = typeof taskWithChanges.title === 'object' ? taskWithChanges.title.en : taskWithChanges.title;
    const key = `${String(title || '').trim().toLowerCase()}|${(taskWithChanges.field || '').trim().toLowerCase()}`;
    if (existingTitles.has(key)) return false;
    existingTitles.add(key);
    return true;
  });

  allTasks[key] = record;
  saveAllDailyTasks(allTasks);
  return tasksFromRecord(record);
}

export function saveTasksForDate(dateStr, taskList, farm) {
  const allTasks = loadAllDailyTasks() || {};
  const key = recordKey(dateStr, farm);
  const record = readDayRecord(allTasks, key) || {
    suggestions: [], added: [], changes: {}, deleted: [], conditionKey: null,
  };
  const taskById = new Map(taskList.map((task) => [task.id, task]));
  const suggestionIds = new Set(record.suggestions.map((task) => task.id));

  record.added = taskList.filter((task) => task.isCustom && !task.isSuggested);
  record.deleted = [...new Set([
    ...record.deleted,
    ...record.suggestions.filter((task) => !taskById.has(task.id)).map((task) => task.id),
  ])];

  record.suggestions.forEach((baseTask) => {
    const task = taskById.get(baseTask.id);
    if (!task) return;
    const existing = record.changes[task.id] || {};
    record.changes[task.id] = {
      ...existing,
      completed: !!task.completed,
      ...(task.isEdited ? {
        title: task.title,
        desc: task.desc,
        field: task.field,
        timeOfDay: task.timeOfDay,
        duration: task.duration,
        category: task.category,
        icon: task.icon,
        isEdited: true,
      } : {}),
    };
  });
  record.added = record.added.filter((task) => !suggestionIds.has(task.id));
  allTasks[key] = record;
  saveAllDailyTasks(allTasks);
  return taskList;
}

export function toggleTaskComplete(dateStr, taskId, farm, weather) {
  const tasks = getTasksForDate(dateStr, farm, weather);
  const updated = tasks.map((task) => task.id === taskId
    ? { ...task, completed: !task.completed }
    : task);
  saveTasksForDate(dateStr, updated, farm);
  return updated;
}

export function addTaskForDate(dateStr, newTaskData, farm, weather) {
  const tasks = getTasksForDate(dateStr, farm, weather);
  const cat = CATEGORIES[newTaskData.category] || CATEGORIES.general;
  const task = {
    id: `farmer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: newTaskData.title,
    desc: newTaskData.desc || '',
    field: newTaskData.field || '',
    timeOfDay: newTaskData.timeOfDay || 'Morning',
    duration: newTaskData.duration || '20 min',
    category: newTaskData.category || 'general',
    icon: cat.icon || 'check',
    isSuggested: false,
    isCustom: true,
    isEdited: false,
    completed: false,
  };
  const updated = [task, ...tasks];
  saveTasksForDate(dateStr, updated, farm);
  return updated;
}

export function editTaskForDate(dateStr, taskId, fields, farm, weather) {
  const tasks = getTasksForDate(dateStr, farm, weather);
  const updated = tasks.map((task) => {
    if (task.id !== taskId) return task;
    const category = fields.category !== undefined ? fields.category : task.category;
    const cat = CATEGORIES[category] || CATEGORIES.general;
    return {
      ...task,
      ...fields,
      icon: cat.icon || task.icon,
      isEdited: true,
    };
  });
  saveTasksForDate(dateStr, updated, farm);
  return updated;
}

export function deleteTaskForDate(dateStr, taskId, farm, weather) {
  const updated = getTasksForDate(dateStr, farm, weather).filter((task) => task.id !== taskId);
  saveTasksForDate(dateStr, updated, farm);
  return updated;
}
