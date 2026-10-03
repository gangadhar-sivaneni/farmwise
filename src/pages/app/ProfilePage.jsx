import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { CROPS } from '../../data/cropsData';
import { LBL } from '../../data/translations';

const IRRIGATION = {
  borewell: { en: 'Borewell', te: 'బోరుబావి' },
  canal: { en: 'Canal', te: 'కాలువ' },
  drip: { en: 'Drip', te: 'బిందు సేద్యం' },
  sprinkler: { en: 'Sprinkler', te: 'స్ప్రింక్లర్' },
  rainfed: { en: 'Rain-fed', te: 'వర్షాధారం' },
  tank: { en: 'Tank / pond', te: 'చెరువు' },
};
const REQ = { en: 'Required', te: 'తప్పనిసరి' };

/** Farmer's personal details — saved per account (farmwise_user_<id>_profile). */
export default function ProfilePage() {
  const { L, showToast } = useLanguage();
  const { user, profile, saveProfile } = useApp();
  const [f, setF] = useState(() => ({
    name: user?.name || '', phone: '', village: '', mandal: '', district: '', state: 'Telangana', pin: '',
    landAcres: '', experience: '', crops: [], irrigation: 'borewell', soil: 'loamy', farmerId: '',
    ...profile,
  }));
  const [errors, setErrors] = useState({});

  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: null })); };
  const toggleCrop = (id) => setF((s) => ({ ...s, crops: s.crops.includes(id) ? s.crops.filter((c) => c !== id) : [...s.crops, id] }));

  const submit = (e) => {
    e.preventDefault();
    const err = {};
    for (const k of ['name', 'village', 'district', 'state']) if (!String(f[k]).trim()) err[k] = REQ;
    const phone = f.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(phone)) err.phone = { en: 'Enter a 10-digit Indian mobile number.', te: '10 అంకెల మొబైల్ నంబర్ ఇవ్వండి.' };
    if (f.pin && !/^[1-9]\d{5}$/.test(f.pin.trim())) err.pin = { en: 'PIN code has 6 digits.', te: 'పిన్ కోడ్ 6 అంకెలు.' };
    if (!(Number(f.landAcres) > 0)) err.landAcres = { en: 'Enter your total land in acres.', te: 'మొత్తం భూమి ఎకరాల్లో ఇవ్వండి.' };
    if (f.experience !== '' && !(Number(f.experience) >= 0 && Number(f.experience) <= 80)) err.experience = { en: 'Enter years between 0 and 80.', te: '0–80 మధ్య సంవత్సరాలు ఇవ్వండి.' };
    if (!f.crops.length) err.crops = { en: 'Pick at least one crop you grow.', te: 'మీరు పండించే కనీసం ఒక పంట ఎంచుకోండి.' };
    setErrors(err);
    if (Object.values(err).some(Boolean)) {
      document.querySelector('.prof .err:not(:empty)')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const trimmed = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    saveProfile({ ...trimmed, phone, updatedAt: new Date().toISOString() });
    showToast({ en: 'Profile saved', te: 'ప్రొఫైల్ సేవ్ అయింది' });
  };

  const fld = (k, label, input, required) => (
    <div className="fld">
      <label htmlFor={`pr-${k}`}>{L(label)}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {input}
      <p className="err" role={errors[k] ? 'alert' : undefined}>{errors[k] ? L(errors[k]) : ''}</p>
    </div>
  );
  const text = (k, label, { required, ...props } = {}) =>
    fld(k, label, <div className="inp"><input id={`pr-${k}`} value={f[k]} onChange={set(k)} required={required} {...props} /></div>, required);

  return (
    <section className="panel page" data-page="profile" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{L({ en: 'Your farmer profile', te: 'మీ రైతు ప్రొఫైల్' })}</h1>
          <p>{L({ en: 'Fields marked * are required. Saved only for your account, in this browser.', te: '* గుర్తు ఉన్నవి తప్పనిసరి. మీ ఖాతాకు మాత్రమే, ఈ బ్రౌజర్‌లో సేవ్ అవుతుంది.' })}</p>
        </div>
        {profile?.updatedAt && (
          <span className="pill ok"><i /><span>{L({ en: 'Saved', te: 'సేవ్ అయింది' })} · {new Date(profile.updatedAt).toLocaleDateString()}</span></span>
        )}
      </div>

      <form className="prof" onSubmit={submit} noValidate>
        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Personal details', te: 'వ్యక్తిగత వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {text('name', { en: 'Full name', te: 'పూర్తి పేరు' }, { required: true, autoComplete: 'name' })}
            {fld('phone', { en: 'Mobile number', te: 'మొబైల్ నంబర్' },
              <div className="inp"><span className="pre">+91</span><input id="pr-phone" type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" value={f.phone} onChange={(e) => { setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setErrors((s) => ({ ...s, phone: null })); }} /></div>, true)}
            {text('farmerId', { en: 'Farmer ID / Pattadar passbook no. (optional)', te: 'రైతు ID / పట్టాదారు పాస్‌బుక్ నం. (ఐచ్ఛికం)' })}
            {text('experience', { en: 'Years of farming (optional)', te: 'వ్యవసాయ అనుభవం (సంవత్సరాలు, ఐచ్ఛికం)' }, { inputMode: 'numeric' })}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Address', te: 'చిరునామా' })}</h3></div>
          <div className="pm-grid">
            {text('village', { en: 'Village', te: 'గ్రామం' }, { required: true })}
            {text('mandal', { en: 'Mandal (optional)', te: 'మండలం (ఐచ్ఛికం)' })}
            {text('district', { en: 'District', te: 'జిల్లా' }, { required: true })}
            {text('state', { en: 'State', te: 'రాష్ట్రం' }, { required: true })}
            {text('pin', { en: 'PIN code (optional)', te: 'పిన్ కోడ్ (ఐచ్ఛికం)' }, { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>{L({ en: 'Farming details', te: 'వ్యవసాయ వివరాలు' })}</h3></div>
          <div className="pm-grid">
            {fld('landAcres', { en: 'Total land', te: 'మొత్తం భూమి' },
              <div className="inp"><input id="pr-landAcres" inputMode="decimal" value={f.landAcres} onChange={set('landAcres')} /><span className="suf">{L({ en: 'acres', te: 'ఎకరాలు' })}</span></div>, true)}
            {fld('irrigation', { en: 'Main water source', te: 'ప్రధాన నీటి వనరు' },
              <select id="pr-irrigation" className="select" value={f.irrigation} onChange={set('irrigation')}>
                {Object.entries(IRRIGATION).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
            {fld('soil', { en: 'Main soil type', te: 'ప్రధాన నేల రకం' },
              <select id="pr-soil" className="select" value={f.soil} onChange={set('soil')}>
                {Object.entries(LBL.soil).map(([k, v]) => <option key={k} value={k}>{L(v)}</option>)}
              </select>)}
          </div>
          <div className="fld">
            <label id="pr-crops-l">{L({ en: 'Crops you grow', te: 'మీరు పండించే పంటలు' })}<span className="req" aria-hidden="true"> *</span></label>
            <div className="prof-crops" role="group" aria-labelledby="pr-crops-l">
              {CROPS.map((c) => (
                <button key={c.id} type="button" className="chip-f" aria-pressed={f.crops.includes(c.id)} onClick={() => { toggleCrop(c.id); setErrors((s) => ({ ...s, crops: null })); }}>
                  {L(c.name)}
                </button>
              ))}
            </div>
            <p className="err" role={errors.crops ? 'alert' : undefined}>{errors.crops ? L(errors.crops) : ''}</p>
          </div>
        </div>

        <div className="prof-foot">
          <button type="submit" className="btn btn-orange">
            <Icon name="save" className="ico" />
            <span>{L({ en: 'Save profile', te: 'ప్రొఫైల్ సేవ్ చేయండి' })}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
