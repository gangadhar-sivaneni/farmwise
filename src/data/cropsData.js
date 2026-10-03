export const CROPS = [
  {
    id: 'rice',
    name: { en: 'Rice', te: 'వరి' },
    sci: 'Oryza sativa',
    img: 'photo-1530507629858-e4977d30e9e0',
    season: ['kharif', 'rabi'],
    water: 'high',
    soils: ['clay', 'loamy'],
    cat: 'cereal',
    dur: [120, 140],
    yield: 24,
    price: 2300,
    cost: { seed: 2400, fert: 7600, pest: 3800, labour: 11200, irrig: 4200, other: 2800 },
    ov: {
      en: 'Telangana’s staple kharif crop. Thrives in standing water on heavy, water-retentive soils.',
      te: 'తెలంగాణ ప్రధాన ఖరీఫ్ పంట. నీరు నిలిచే బరువైన నేలల్లో బాగా పెరుగుతుంది.'
    },
    sow: {
      en: 'Nursery June–July (kharif); November–December (rabi)',
      te: 'నారుమడి జూన్–జూలై (ఖరీఫ్); నవంబర్–డిసెంబర్ (రబీ)'
    },
    irr: {
      en: 'Keep 2–5 cm standing water through tillering; drain 10 days before harvest.',
      te: 'పిలకల దశలో 2–5 సెం.మీ. నీరు నిలపండి; కోతకు 10 రోజుల ముందు నీరు తీసేయండి.'
    },
    nut: {
      en: 'Typical guide: 48 kg N, 24 kg P₂O₅, 16 kg K₂O per acre in three splits.',
      te: 'సాధారణంగా ఎకరానికి 48 కి. N, 24 కి. P₂O₅, 16 కి. K₂O మూడు దఫాలుగా.'
    },
    pests: {
      en: ['Stem borer', 'Brown planthopper', 'Blast'],
      te: ['కాండం తొలుచు పురుగు', 'సుడిదోమ', 'అగ్గి తెగులు']
    },
    har: {
      en: 'When 80–85% of grains turn golden and panicles droop.',
      te: '80–85% గింజలు బంగారు రంగుకు మారి కంకులు వాలినప్పుడు.'
    }
  },
  {
    id: 'cotton',
    name: { en: 'Cotton', te: 'పత్తి' },
    sci: 'Gossypium hirsutum',
    img: 'photo-1761069183787-0272d2739ae6',
    season: ['kharif'],
    water: 'medium',
    soils: ['black', 'loamy'],
    cat: 'commercial',
    dur: [150, 180],
    yield: 10,
    price: 7100,
    cost: { seed: 3600, fert: 8400, pest: 9200, labour: 12000, irrig: 2600, other: 2200 },
    ov: {
      en: 'A long-season commercial crop for deep black soils. Strong returns, but pests need close watching.',
      te: 'లోతైన నల్లరేగడి నేలలకు దీర్ఘకాల వాణిజ్య పంట. మంచి రాబడి, కానీ పురుగులపై నిఘా అవసరం.'
    },
    sow: {
      en: 'June–July, with the onset of monsoon',
      te: 'జూన్–జూలై, రుతుపవనాల ప్రారంభంతో'
    },
    irr: {
      en: 'Mostly rainfed; protective irrigation at flowering and boll formation.',
      te: 'ఎక్కువగా వర్షాధారం; పూత, కాయ దశల్లో అవసరమైతే నీరు.'
    },
    nut: {
      en: 'Typical guide: 48 kg N, 24 kg P₂O₅, 24 kg K₂O per acre; split N at 30, 60, 90 days.',
      te: 'సాధారణంగా ఎకరానికి 48 కి. N, 24 కి. P₂O₅, 24 కి. K₂O; N ను 30, 60, 90 రోజుల్లో.'
    },
    pests: {
      en: ['Pink bollworm', 'Whitefly', 'Jassids'],
      te: ['గులాబీ రంగు పురుగు', 'తెల్లదోమ', 'పచ్చదోమ']
    },
    har: {
      en: 'Pick fully burst bolls in 3–4 rounds; never pick wet cotton.',
      te: 'పూర్తిగా విచ్చుకున్న కాయలను 3–4 దఫాలుగా తీయండి; తడి పత్తి తీయకండి.'
    }
  },
  {
    id: 'maize',
    name: { en: 'Maize', te: 'మొక్కజొన్న' },
    sci: 'Zea mays',
    img: 'photo-1625246333195-78d9c38ad449',
    season: ['kharif', 'rabi'],
    water: 'medium',
    soils: ['loamy', 'red'],
    cat: 'cereal',
    dur: [100, 120],
    yield: 28,
    price: 2100,
    cost: { seed: 4200, fert: 7000, pest: 2600, labour: 7600, irrig: 2800, other: 1800 },
    ov: {
      en: 'Fast and adaptable on well-drained loamy and red soils, with steady demand from poultry feed.',
      te: 'నీరు ఇంకే ఒండ్రు, ఎర్ర నేలల్లో త్వరగా పండే పంట; కోళ్ల దాణాకు స్థిరమైన గిరాకీ.'
    },
    sow: {
      en: 'June–July (kharif); October–November (rabi)',
      te: 'జూన్–జూలై (ఖరీఫ్); అక్టోబర్–నవంబర్ (రబీ)'
    },
    irr: {
      en: 'Critical at knee-high, tasseling and grain filling. Avoid waterlogging.',
      te: 'మోకాలి ఎత్తు, పూత, గింజ నిండే దశల్లో నీరు ముఖ్యం.'
    },
    nut: {
      en: 'Typical guide: 80 kg N, 24 kg P₂O₅, 24 kg K₂O per acre; N in three splits.',
      te: 'సాధారణంగా ఎకరానికి 80 కి. N, 24 కి. P₂O₅, 24 కి. K₂O; N మూడు దఫాలుగా.'
    },
    pests: {
      en: ['Fall armyworm', 'Stem borer', 'Leaf blight'],
      te: ['కత్తెర పురుగు', 'కాండం తొలుచు పురుగు', 'ఆకు ఎండు తెగులు']
    },
    har: {
      en: 'When husks dry and a black layer forms at the grain base.',
      te: 'పొట్టు ఎండి, గింజ అడుగున నల్లని పొర ఏర్పడినప్పుడు.'
    }
  },
  {
    id: 'chilli',
    name: { en: 'Chilli', te: 'మిరప' },
    sci: 'Capsicum annuum',
    img: 'photo-1752007085497-e835495e2e25',
    season: ['kharif', 'rabi'],
    water: 'medium',
    soils: ['black', 'loamy', 'red'],
    cat: 'spice',
    dur: [150, 180],
    yield: 20,
    price: 12500,
    cost: { seed: 9000, fert: 22000, pest: 28000, labour: 38000, irrig: 7000, other: 6000 },
    ov: {
      en: 'High-value, high-input spice crop. Big returns in good years, but prices and pests swing widely.',
      te: 'అధిక విలువ, అధిక పెట్టుబడి పంట. మంచి సంవత్సరాల్లో పెద్ద రాబడి, కానీ ధరలు, పురుగులు బాగా మారుతాయి.'
    },
    sow: {
      en: 'Nursery July–August; transplant August–September',
      te: 'నారుమడి జూలై–ఆగస్టు; నాటు ఆగస్టు–సెప్టెంబర్'
    },
    irr: {
      en: 'Light, frequent irrigation; drip recommended.',
      te: 'తేలికగా, తరచుగా నీరు; డ్రిప్ మేలు.'
    },
    nut: {
      en: 'Typical guide: 120 kg N, 60 kg P₂O₅, 60 kg K₂O per acre with farmyard manure.',
      te: 'సాధారణంగా ఎకరానికి 120 కి. N, 60 కి. P₂O₅, 60 కి. K₂O, పశువుల ఎరువుతో.'
    },
    pests: {
      en: ['Thrips', 'Mites', 'Fruit rot'],
      te: ['తామర పురుగు', 'నల్లి', 'కాయ కుళ్లు']
    },
    har: {
      en: 'Pick ripe red pods in rounds; sun-dry to about 10% moisture.',
      te: 'పండిన ఎర్ర కాయలను దఫాలుగా తీసి, 10% తేమ వరకు ఎండబెట్టండి.'
    }
  },
  {
    id: 'turmeric',
    name: { en: 'Turmeric', te: 'పసుపు' },
    sci: 'Curcuma longa',
    img: 'photo-1741513599050-487ccfb86275',
    season: ['kharif'],
    water: 'high',
    soils: ['red', 'loamy'],
    cat: 'spice',
    dur: [240, 270],
    yield: 25,
    price: 9000,
    cost: { seed: 30000, fert: 18000, pest: 6000, labour: 24000, irrig: 7000, other: 5000 },
    ov: {
      en: 'A long-duration rhizome crop for well-drained red and loamy soils with reliable irrigation.',
      te: 'నీరు ఇంకే ఎర్ర, ఒండ్రు నేలలకు దీర్ఘకాల దుంప పంట.'
    },
    sow: {
      en: 'May–June on raised beds',
      te: 'మే–జూన్, ఎత్తు మడులపై'
    },
    irr: {
      en: '15–20 irrigations across the season; mulching conserves moisture.',
      te: 'సీజన్‌లో 15–20 తడులు; మల్చింగ్ తేమను కాపాడుతుంది.'
    },
    nut: {
      en: 'Typical guide: 48 kg N, 24 kg P₂O₅, 48 kg K₂O per acre plus farmyard manure.',
      te: 'సాధారణంగా ఎకరానికి 48 కి. N, 24 కి. P₂O₅, 48 కి. K₂O, పశువుల ఎరువుతో.'
    },
    pests: {
      en: ['Shoot borer', 'Rhizome rot', 'Leaf spot'],
      te: ['కాండం తొలుచు పురుగు', 'దుంప కుళ్లు', 'ఆకు మచ్చ']
    },
    har: {
      en: 'When leaves yellow and dry at 8–9 months; cure, boil and dry the rhizomes.',
      te: '8–9 నెలల్లో ఆకులు ఎండినప్పుడు; దుంపలను ఉడికించి ఎండబెట్టండి.'
    }
  },
  {
    id: 'groundnut',
    name: { en: 'Groundnut', te: 'వేరుశనగ' },
    sci: 'Arachis hypogaea',
    img: 'photo-1549978113-29eb25c8177f',
    season: ['kharif', 'rabi'],
    water: 'low',
    soils: ['red', 'loamy'],
    cat: 'oilseed',
    dur: [100, 120],
    yield: 9,
    price: 6000,
    cost: { seed: 9600, fert: 4800, pest: 2800, labour: 7200, irrig: 2000, other: 1600 },
    ov: {
      en: 'A hardy oilseed for light red and sandy-loam soils. Fixes nitrogen and suits low-water plots.',
      te: 'తేలికపాటి ఎర్ర, ఇసుక ఒండ్రు నేలలకు గట్టి నూనెగింజ పంట. తక్కువ నీటికి సరిపోతుంది.'
    },
    sow: {
      en: 'June–July (kharif); November–December (rabi)',
      te: 'జూన్–జూలై (ఖరీఫ్); నవంబర్–డిసెంబర్ (రబీ)'
    },
    irr: {
      en: 'Rainfed in kharif; in rabi, irrigate at pegging and pod development.',
      te: 'ఖరీఫ్‌లో వర్షాధారం; రబీలో ఊడల, కాయ దశల్లో నీరు.'
    },
    nut: {
      en: 'Typical guide: 8 kg N, 16 kg P₂O₅, 20 kg K₂O per acre; 200 kg gypsum at pegging.',
      te: 'సాధారణంగా ఎకరానికి 8 కి. N, 16 కి. P₂O₅, 20 కి. K₂O; ఊడల దశలో 200 కి. జిప్సం.'
    },
    pests: {
      en: ['Leaf miner', 'Tikka leaf spot', 'White grub'],
      te: ['ఆకు ముడత పురుగు', 'టిక్కా ఆకు మచ్చ', 'వేరు పురుగు']
    },
    har: {
      en: 'When inner shells darken and leaves yellow; dry pods to 8–9% moisture.',
      te: 'పొట్టు లోపల నల్లబడి, ఆకులు పసుపుగా మారినప్పుడు.'
    }
  }
];

export const byId = (id) => CROPS.find((c) => c.id === id);
export const cropCost = (c) => Object.values(c.cost).reduce((a, b) => a + b, 0);
export const cropProfit = (c) => c.yield * c.price - cropCost(c);
export const WATER_N = { low: 1, medium: 2, high: 3 };

export const IMG = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;
export const fmt = (n) => Math.round(n).toLocaleString('en-IN');
export const inr = (n) => (n < 0 ? '−₹' : '₹') + fmt(Math.abs(n));
